"use server";

import { headers } from "next/headers";
import { supabaseService, supabaseUser } from "@/lib/supabase/server";
import { getViewer, SESSION_EXPIRED } from "@/lib/admission/auth";
import { env } from "@/lib/supabase/env";
import { openAccessSession } from "@/lib/staff/audit";
import { IP_MAX_FAILS, PIN_LOCK_MIN, PIN_MAX_FAILS, hashPin, isPin, normalizeCLMobile, pinProblem, verifyPin } from "./pin";
import { CODE_TTL, HOME_BY_ROLE, audit, checkCode, ipHash, issueCode, openSession, portalLink, sendIdentityEmail } from "./service";
import { ROLE_LABEL, isInternalRole, isPublicRequestRole } from "./roles";
import { DEMO_READONLY, isDemoEmail } from "./demo";
import { ensurePrincipalCredential } from "./principal";

export type FlowResult = {
  ok: boolean;
  message: string;
  /** Siguiente paso de la pantalla de ingreso. */
  step?: "done" | "admin_code" | "change_pin" | "set_pin" | "code_sent";
  redirect?: string;
  devCode?: string;
  /** El correo no salió: ofrecer ingresar con un enlace por correo (Supabase). */
  linkFallback?: boolean;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const GENERIC_SENT = "Si el correo está registrado, te enviamos un código. Revisa tu bandeja (y spam).";
const BAD_LOGIN = "Correo o código incorrectos.";
const dev = () => process.env.NODE_ENV !== "production";
const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null);

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0].trim() || null;
}
async function ua() {
  return (await headers()).get("user-agent")?.slice(0, 300) ?? null;
}

type Account = { id: string; email: string; role: string; status: string; full_name: string | null };
async function accountByEmail(email: string): Promise<Account | null> {
  const { data } = await supabaseService().from("profiles").select("id, email, role, status, full_name").eq("email", email).maybeSingle();
  return (data as Account | null) ?? null;
}

/** Termina el ingreso: sesión de Supabase, registro de auditoría y destino según rol. */
async function finishLogin(acc: Account, method: "CODE" | "LINK", next?: string): Promise<FlowResult> {
  const svc = supabaseService();
  await openSession(acc.email, svc);
  await svc.from("user_credentials").update({ failed_count: 0, locked_until: null, last_login_at: new Date().toISOString() }).eq("user_id", acc.id);
  if (acc.status === "PENDING") await svc.from("profiles").update({ status: "ACTIVE", updated_at: new Date().toISOString() }).eq("id", acc.id);
  if (acc.role === "delivery" || acc.role === "admin") await openAccessSession({ userId: acc.id, email: acc.email, role: acc.role, method, userAgent: await ua() });
  await audit("user.login", { actor: acc.id, actorEmail: acc.email, targetUser: acc.id, targetEmail: acc.email, details: { role: acc.role } }, svc);
  return { ok: true, step: "done", message: "Listo.", redirect: safeNext(next) ?? HOME_BY_ROLE[acc.role] ?? "/inicio" };
}

/** Ingreso habitual: correo + código personal. Admin requiere además un código por correo. */
export async function loginWithPin(rawEmail: string, pin: string, next?: string): Promise<FlowResult> {
  try {
    const email = rawEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email) || !isPin(pin)) return { ok: false, message: BAD_LOGIN };
    const svc = supabaseService();
    const ip = ipHash(await clientIp());
    const since = new Date(Date.now() - PIN_LOCK_MIN * 60_000).toISOString();
    if (ip) {
      const { count } = await svc.from("login_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", ip).eq("success", false).gte("at", since);
      if ((count ?? 0) >= IP_MAX_FAILS) return { ok: false, message: `Demasiados intentos desde esta red. Espera ${PIN_LOCK_MIN} minutos.` };
    }
    await ensurePrincipalCredential(email, svc).catch((e) => console.error("[identidad] cuenta principal", e instanceof Error ? e.message : "error"));
    const acc = await accountByEmail(email);
    const { data: cred } = acc ? await svc.from("user_credentials").select("pin_hash, must_change, failed_count, locked_until").eq("user_id", acc.id).maybeSingle() : { data: null };
    const fail = async (msg = BAD_LOGIN) => {
      await svc.from("login_attempts").insert({ email, ip_hash: ip, success: false });
      return { ok: false, message: msg } as FlowResult;
    };
    if (!acc || !cred) return fail();
    if (cred.locked_until && new Date(cred.locked_until) > new Date()) return { ok: false, message: `Tu cuenta está bloqueada temporalmente por intentos fallidos. Espera ${PIN_LOCK_MIN} minutos o usa "Olvidé mi código".` };
    if (!cred.pin_hash) return { ok: false, message: "Aún no activas tu cuenta. Usa el código temporal que te enviamos (o pide uno nuevo en \"Olvidé mi código\")." };
    if (!verifyPin(pin, cred.pin_hash)) {
      const n = cred.failed_count + 1;
      const lock = n >= PIN_MAX_FAILS;
      await svc.from("user_credentials").update({ failed_count: lock ? 0 : n, locked_until: lock ? new Date(Date.now() + PIN_LOCK_MIN * 60_000).toISOString() : null }).eq("user_id", acc.id);
      if (lock) await audit("user.locked", { targetUser: acc.id, targetEmail: email, details: { reason: "pin_failures" } }, svc);
      return fail(lock ? `Demasiados intentos. Tu cuenta quedó bloqueada ${PIN_LOCK_MIN} minutos.` : BAD_LOGIN);
    }
    if (acc.status === "PAUSED" || acc.status === "REVOKED" || acc.status === "DELETED") return fail("Tu acceso no está habilitado. Si crees que es un error, solicita acceso especial o escríbenos desde Ayuda.");
    await svc.from("login_attempts").insert({ email, ip_hash: ip, success: true });
    if (cred.must_change) return { ok: true, step: "change_pin", message: "Por seguridad, crea un nuevo código personal." };
    if (acc.role === "admin") {
      const code = await issueCode(email, "ADMIN_STEP", acc.id, 6, svc);
      const r = await sendIdentityEmail("ADMIN_STEP", email, { name: acc.full_name ?? undefined, code, minutes: CODE_TTL.ADMIN_STEP }, { userId: acc.id }, svc);
      if (!r.ok && !dev()) return { ok: false, message: "No pudimos enviar tu código de verificación por correo.", linkFallback: true };
      return { ok: true, step: "admin_code", message: "Te enviamos un código de verificación de 6 dígitos a tu correo.", ...(dev() && !r.ok ? { devCode: code } : {}) };
    }
    return finishLogin(acc, "CODE", next);
  } catch (e) {
    console.error("[identidad] loginWithPin", e);
    return { ok: false, message: "No pudimos ingresar. Intenta de nuevo en unos minutos." };
  }
}

/** Segundo factor de administración. Exige volver a validar el PIN (la pantalla lo conserva). */
export async function verifyAdminStep(rawEmail: string, pin: string, code: string, next?: string): Promise<FlowResult> {
  try {
    const email = rawEmail.trim().toLowerCase();
    const svc = supabaseService();
    const acc = await accountByEmail(email);
    // PENDING: primera vez (cuenta recién creada); el PIN y el código por correo prueban que es la persona.
    if (!acc || acc.role !== "admin" || (acc.status !== "ACTIVE" && acc.status !== "PENDING")) return { ok: false, message: BAD_LOGIN };
    const { data: cred } = await svc.from("user_credentials").select("pin_hash").eq("user_id", acc.id).maybeSingle();
    if (!verifyPin(pin, cred?.pin_hash ?? null)) return { ok: false, message: BAD_LOGIN };
    const r = await checkCode(email, ["ADMIN_STEP"], code, true, svc);
    if (!r.ok) return { ok: false, message: r.message };
    return finishLogin(acc, "CODE", next);
  } catch (e) {
    console.error("[identidad] verifyAdminStep", e);
    return { ok: false, message: "No pudimos validar el código." };
  }
}

/** Paso 1 de activación o restablecimiento: valida el código temporal sin consumirlo (cuenta intentos). */
export async function checkTemporaryCode(rawEmail: string, code: string): Promise<FlowResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { ok: false, message: "Ingresa tu correo electrónico." };
  const r = await checkCode(email, ["ACTIVATION", "RESET"], code, false);
  return r.ok ? { ok: true, step: "set_pin", message: "Código correcto." } : { ok: false, message: r.message };
}

/** Paso 2: crea el código personal con el código temporal (se consume aquí) y abre la sesión. */
export async function setPinWithCode(rawEmail: string, code: string, pin: string, pin2: string, next?: string): Promise<FlowResult> {
  try {
    const email = rawEmail.trim().toLowerCase();
    if (isDemoEmail(email)) return { ok: false, message: DEMO_READONLY };
    const problem = pinProblem(pin);
    if (problem) return { ok: false, message: problem };
    if (pin !== pin2) return { ok: false, message: "Los códigos no coinciden." };
    const svc = supabaseService();
    const acc = await accountByEmail(email);
    if (!acc) return { ok: false, message: "El código venció o no existe. Pide uno nuevo." };
    if (acc.status === "PAUSED" || acc.status === "REVOKED" || acc.status === "DELETED") return { ok: false, message: "Tu acceso no está habilitado. Solicita acceso especial si crees que es un error." };
    const r = await checkCode(email, ["ACTIVATION", "RESET"], code, true, svc);
    if (!r.ok) return { ok: false, message: r.message };
    await svc.from("user_credentials").upsert({ user_id: acc.id, pin_hash: hashPin(pin), pin_set_at: new Date().toISOString(), must_change: false, failed_count: 0, locked_until: null, updated_at: new Date().toISOString() });
    await audit(r.purpose === "ACTIVATION" ? "user.activated" : "user.pin.reset_completed", { actor: acc.id, actorEmail: email, targetUser: acc.id, targetEmail: email }, svc);
    return finishLogin({ ...acc, status: acc.status === "PENDING" ? "PENDING" : acc.status }, "CODE", next);
  } catch (e) {
    console.error("[identidad] setPinWithCode", e);
    return { ok: false, message: "No pudimos guardar tu código. Intenta de nuevo." };
  }
}

/** "Olvidé mi código": envía un código temporal (o de activación si aún no activa). Respuesta genérica. */
export async function requestPinReset(rawEmail: string): Promise<FlowResult> {
  try {
    const email = rawEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return { ok: false, message: "Ingresa tu correo electrónico." };
    if (isDemoEmail(email)) return { ok: false, message: DEMO_READONLY };
    const svc = supabaseService();
    const since = new Date(Date.now() - 15 * 60_000).toISOString();
    const { count } = await svc.from("staff_login_codes").select("id", { count: "exact", head: true }).eq("email", email).in("purpose", ["RESET", "ACTIVATION"]).gte("created_at", since);
    if ((count ?? 0) >= 3) return { ok: false, message: "Pediste varios códigos. Espera 15 minutos e inténtalo de nuevo." };
    const acc = await accountByEmail(email);
    if (!acc || acc.status === "PAUSED" || acc.status === "REVOKED" || acc.status === "DELETED") return { ok: true, step: "code_sent", message: GENERIC_SENT };
    const { data: cred } = await svc.from("user_credentials").select("pin_hash").eq("user_id", acc.id).maybeSingle();
    const purpose = cred?.pin_hash ? "RESET" : "ACTIVATION";
    const code = await issueCode(email, purpose, acc.id, 4, svc);
    const r = await sendIdentityEmail(purpose === "RESET" ? "PIN_RESET" : acc.role === "delivery" ? "DELIVERY_INVITE" : "ACTIVATION", email, { name: acc.full_name ?? undefined, code, minutes: CODE_TTL[purpose], link: portalLink("restablecer", email) }, { userId: acc.id }, svc);
    await audit("user.pin.reset_requested", { actor: acc.id, actorEmail: email, targetUser: acc.id, targetEmail: email, details: { by: "self", sent: r.ok } }, svc);
    if (!r.ok && !dev()) return { ok: false, message: "No pudimos enviar el código por correo en este momento.", linkFallback: true };
    return { ok: true, step: "code_sent", message: GENERIC_SENT, ...(dev() && !r.ok ? { devCode: code } : {}) };
  } catch (e) {
    console.error("[identidad] requestPinReset", e);
    return { ok: false, message: "No pudimos enviar el código. Intenta de nuevo." };
  }
}

/** Cambio obligatorio (forzado por admin): valida el PIN actual y fija uno nuevo. */
export async function forcedPinChange(rawEmail: string, current: string, pin: string, pin2: string, next?: string): Promise<FlowResult> {
  try {
    const email = rawEmail.trim().toLowerCase();
    const problem = pinProblem(pin);
    if (problem) return { ok: false, message: problem };
    if (pin !== pin2) return { ok: false, message: "Los códigos no coinciden." };
    if (pin === current) return { ok: false, message: "El nuevo código debe ser distinto del anterior." };
    const svc = supabaseService();
    const acc = await accountByEmail(email);
    const { data: cred } = acc ? await svc.from("user_credentials").select("pin_hash, must_change").eq("user_id", acc.id).maybeSingle() : { data: null };
    if (!acc || !cred?.must_change || !verifyPin(current, cred.pin_hash)) return { ok: false, message: BAD_LOGIN };
    await svc.from("user_credentials").update({ pin_hash: hashPin(pin), pin_set_at: new Date().toISOString(), must_change: false, updated_at: new Date().toISOString() }).eq("user_id", acc.id);
    await audit("user.pin.changed", { actor: acc.id, actorEmail: email, targetUser: acc.id, targetEmail: email, details: { forced: true } }, svc);
    if (acc.role === "admin") return loginWithPin(email, pin, next);
    return finishLogin(acc, "CODE", next);
  } catch (e) {
    console.error("[identidad] forcedPinChange", e);
    return { ok: false, message: "No pudimos cambiar tu código." };
  }
}

/** Cambiar mi código desde el perfil (con sesión). */
export async function changeMyPin(current: string, pin: string, pin2: string): Promise<FlowResult> {
  const v = await getViewer();
  if (!v) return { ok: false, message: SESSION_EXPIRED };
  if (isDemoEmail(v.email)) return { ok: false, message: DEMO_READONLY };
  const problem = pinProblem(pin);
  if (problem) return { ok: false, message: problem };
  if (pin !== pin2) return { ok: false, message: "Los códigos no coinciden." };
  const svc = supabaseService();
  const { data: cred } = await svc.from("user_credentials").select("pin_hash").eq("user_id", v.id).maybeSingle();
  if (cred?.pin_hash && !verifyPin(current, cred.pin_hash)) return { ok: false, message: "Tu código actual no es correcto." };
  await svc.from("user_credentials").upsert({ user_id: v.id, pin_hash: hashPin(pin), pin_set_at: new Date().toISOString(), must_change: false, updated_at: new Date().toISOString() });
  await audit("user.pin.changed", { actor: v.id, actorEmail: v.email, targetUser: v.id, targetEmail: v.email }, svc);
  return { ok: true, message: "Tu código personal quedó actualizado." };
}

/** Solicitud de acceso especial (sin sesión). Llega a la bandeja del Líder de Servicio y se le avisa por correo. */
/**
 * "Crear cuenta": la persona pide acceso como Profesional o Business Partner. No crea la cuenta ni otorga permisos:
 * llega como solicitud al Líder de producto, que decide el rol al aprobar (y entonces se envía el código de
 * activación). Los roles internos (Líder de producto, Delivery, Hub AI, AI Coach, Profesor) nunca se piden aquí:
 * solo los crea Administración. La base de datos rechaza además cualquier otro rol en una solicitud.
 * Respuesta igual exista o no una cuenta con ese correo (no revela quién está registrado).
 */
export async function requestAccount(input: { name: string; email: string; phone: string; role: string; note: string; website?: string }): Promise<FlowResult> {
  try {
    if (input.website) return { ok: true, step: "done", message: "Recibido." };
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim().slice(0, 120);
    const note = input.note.trim().slice(0, 2000);
    if (name.length < 2) return { ok: false, message: "Cuéntanos tu nombre completo." };
    if (!EMAIL_RE.test(email)) return { ok: false, message: "Revisa tu correo electrónico." };
    if (isInternalRole(input.role) && !isPublicRequestRole(input.role)) return { ok: false, message: "Ese rol lo asigna solo el administrador de la plataforma. Si te corresponde, pídele que cree tu cuenta." };
    if (!isPublicRequestRole(input.role)) return { ok: false, message: "Elige cómo participas." };
    const phone = input.phone.trim() ? normalizeCLMobile(input.phone) : null;
    if (input.phone.trim() && !phone) return { ok: false, message: "Revisa el teléfono: +56 9 y 8 dígitos." };
    const svc = supabaseService();
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { count } = await svc.from("access_requests").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", since);
    const sent = { ok: true, step: "done" as const, message: "Recibimos tu solicitud. El Líder de producto asignará tu rol y te llegará un correo para activar tu cuenta." };
    if ((count ?? 0) >= 3) return sent;
    const { data: row, error } = await svc
      .from("access_requests")
      .insert({ kind: "ACCOUNT", reason: "CUENTA", requested_role: input.role, name, email, phone, description: note })
      .select("id")
      .single();
    if (error) throw error;
    await audit("user.account.requested", { targetEmail: email, details: { request: row.id, role: input.role } }, svc);
    const { data: admins } = await svc.from("profiles").select("email").eq("role", "admin").eq("status", "ACTIVE");
    for (const a of admins ?? []) {
      await sendIdentityEmail("ACCESS_REQUEST_ADMIN", a.email, { extra: `${name} (${email}) pide una cuenta como ${ROLE_LABEL[input.role]}.${note ? ` ${note.slice(0, 300)}` : ""}`, link: `${env.appUrl}/admin/usuarios?tab=solicitudes` }, {}, svc);
    }
    return sent;
  } catch (e) {
    console.error("[identidad] requestAccount", e);
    return { ok: false, message: "No pudimos enviar tu solicitud. Intenta de nuevo." };
  }
}

/** Salir (cualquier rol): cierra la sesión de auditoría y la de Supabase. */
export async function signOutEverywhere(): Promise<void> {
  const db = await supabaseUser();
  const { data: { user } } = await db.auth.getUser();
  if (user) await supabaseService().from("access_sessions").update({ ended_at: new Date().toISOString() }).eq("user_id", user.id).is("ended_at", null);
  await db.auth.signOut();
}
