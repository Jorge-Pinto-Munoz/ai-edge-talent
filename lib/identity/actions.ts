"use server";

import { headers } from "next/headers";
import { supabaseService, supabaseUser } from "@/lib/supabase/server";
import { env } from "@/lib/supabase/env";
import { openAccessSession } from "@/lib/staff/audit";
import { IP_MAX_FAILS, PIN_LOCK_MIN } from "./pin";
import { normalizePhone } from "./phone";
import { HOME_BY_ROLE, audit, checkCode, ensureAccount, ipHash, openSession, sendIdentityEmail, sendLoginCode } from "./service";
import { ROLE_LABEL, isInternalRole, isPublicRequestRole } from "./roles";
import { isDemoEmail } from "./demo";

/**
 * Acceso a la plataforma (todos los roles): correo + código de 6 dígitos enviado a ese correo, de un solo uso y con
 * vencimiento de 10 minutos. No hay códigos personales que recordar. La sesión queda abierta en el navegador.
 * Las respuestas no revelan si un correo está registrado.
 */
export type FlowResult = {
  ok: boolean;
  message: string;
  step?: "done" | "code_sent" | "demo";
  redirect?: string;
  /** Segundos de espera antes de poder pedir otro código. */
  waitS?: number;
};

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const SENT = "Si el correo está registrado, te enviamos un código de 6 dígitos. Revisa tu bandeja (y spam).";
const IP_MAX_REQUESTS = 30; // solicitudes de código por red cada 15 minutos
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
const blocked = (a: Account) => a.status === "PAUSED" || a.status === "REVOKED" || a.status === "DELETED";

/** Termina el ingreso: sesión de Supabase, registro de auditoría y destino según rol. */
async function finishLogin(acc: Account, next?: string): Promise<FlowResult> {
  const svc = supabaseService();
  await openSession(acc.email, svc);
  await svc.from("user_credentials").upsert({ user_id: acc.id, failed_count: 0, locked_until: null, last_login_at: new Date().toISOString() }, { onConflict: "user_id" });
  // Primer ingreso: el código llegó a su correo, así que la cuenta queda activa (también las de rol interno).
  if (acc.status === "PENDING") await svc.from("profiles").update({ status: "ACTIVE", updated_at: new Date().toISOString() }).eq("id", acc.id);
  if (acc.role === "delivery" || acc.role === "admin") await openAccessSession({ userId: acc.id, email: acc.email, role: acc.role, method: "CODE", userAgent: await ua() });
  await audit("user.login", { actor: acc.id, actorEmail: acc.email, targetUser: acc.id, targetEmail: acc.email, details: { role: acc.role, method: "email_code" } }, svc);
  return { ok: true, step: "done", message: "Listo.", redirect: safeNext(next) ?? HOME_BY_ROLE[acc.role] ?? "/inicio" };
}

/**
 * Primer ingreso sin cuenta: se crea solo si el correo ya es conocido. Con un rol autorizado por Administración
 * (role_grants, p. ej. los Delivery), queda con ese rol; si postuló o se registró, como Profesional. Un correo
 * desconocido no crea nada (la respuesta es la misma igual).
 */
async function provisionOnFirstLogin(email: string): Promise<Account | null> {
  const svc = supabaseService();
  const [{ data: grant }, { data: cand }] = await Promise.all([
    svc.from("role_grants").select("full_name").eq("email", email).maybeSingle(),
    svc.from("candidates").select("full_name").ilike("corporate_email", email).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!grant && !cand) return null;
  await ensureAccount(email, grant?.full_name ?? cand?.full_name ?? null, svc);
  return accountByEmail(email);
}

/** Paso 1: pide un código de ingreso. Misma respuesta exista o no la cuenta. */
export async function requestLoginCode(rawEmail: string): Promise<FlowResult> {
  try {
    const email = rawEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return { ok: false, message: "Revisa tu correo electrónico." };
    if (isDemoEmail(email)) return { ok: true, step: "demo", message: "Cuenta de demostración: entra sin código (solo lectura)." };
    const svc = supabaseService();
    const ip = ipHash(await clientIp());
    const since = new Date(Date.now() - PIN_LOCK_MIN * 60_000).toISOString();
    if (ip) {
      const { count } = await svc.from("login_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", ip).eq("kind", "request").gte("at", since);
      if ((count ?? 0) >= IP_MAX_REQUESTS) return { ok: false, message: `Demasiadas solicitudes desde esta red. Espera ${PIN_LOCK_MIN} minutos.` };
      await svc.from("login_attempts").insert({ email, ip_hash: ip, success: true, kind: "request" });
    }
    const acc = (await accountByEmail(email)) ?? (await provisionOnFirstLogin(email));
    if (acc && !blocked(acc)) {
      const r = await sendLoginCode(email, { name: acc.full_name, userId: acc.id }, svc);
      // Espera o límite: misma respuesta que siempre (no revela la cuenta); el código anterior sigue vigente.
      if (!r.ok && r.reason === "wait") return { ok: true, step: "code_sent", message: SENT, waitS: r.waitS };
      if (!r.ok && r.reason === "limit") return { ok: true, step: "code_sent", message: SENT, waitS: 300 };
      if (!r.ok) return { ok: false, message: "No pudimos enviar el código por correo en este momento. Intenta de nuevo en unos minutos." };
      await audit("user.login_code.sent", { targetUser: acc.id, targetEmail: email }, svc);
    }
    return { ok: true, step: "code_sent", message: SENT, waitS: 45 };
  } catch (e) {
    console.error("[identidad] requestLoginCode", e instanceof Error ? e.message : e);
    return { ok: false, message: "No pudimos enviar el código. Intenta de nuevo." };
  }
}

/** Paso 2: valida el código (un solo uso) y abre la sesión. */
export async function verifyLoginCode(rawEmail: string, code: string, next?: string): Promise<FlowResult> {
  try {
    const email = rawEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) return { ok: false, message: "Revisa tu correo electrónico." };
    if (!/^\d{6}$/.test(code)) return { ok: false, message: "El código tiene 6 números." };
    const svc = supabaseService();
    const ip = ipHash(await clientIp());
    const since = new Date(Date.now() - PIN_LOCK_MIN * 60_000).toISOString();
    if (ip) {
      const { count } = await svc.from("login_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", ip).eq("kind", "verify").eq("success", false).gte("at", since);
      if ((count ?? 0) >= IP_MAX_FAILS) return { ok: false, message: `Demasiados intentos desde esta red. Espera ${PIN_LOCK_MIN} minutos.` };
    }
    const r = await checkCode(email, ["LOGIN"], code, true, svc);
    const acc = r.ok ? await accountByEmail(email) : null;
    if (!r.ok || !acc || blocked(acc)) {
      await svc.from("login_attempts").insert({ email, ip_hash: ip, success: false, kind: "verify" });
      if (r.ok && acc && blocked(acc)) return { ok: false, message: "Tu acceso no está habilitado. Si crees que es un error, escríbenos desde Ayuda." };
      return { ok: false, message: r.ok ? "El código venció o no existe. Pide uno nuevo." : r.message };
    }
    await svc.from("login_attempts").insert({ email, ip_hash: ip, success: true, kind: "verify" });
    return finishLogin(acc, next);
  } catch (e) {
    console.error("[identidad] verifyLoginCode", e instanceof Error ? e.message : e);
    return { ok: false, message: "No pudimos validar el código. Intenta de nuevo." };
  }
}

/** Cuentas de demostración (correo .invalid, de solo lectura): entran sin código. */
export async function loginDemo(rawEmail: string, next?: string): Promise<FlowResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!isDemoEmail(email)) return { ok: false, message: "Revisa tu correo electrónico." };
  const acc = await accountByEmail(email);
  if (!acc || blocked(acc)) return { ok: false, message: "Esa cuenta de demostración no existe." };
  return finishLogin(acc, next);
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
    const phone = input.phone.trim() ? normalizePhone(input.phone) : null;
    if (input.phone.trim() && !phone) return { ok: false, message: "Revisa el teléfono: elige el código de país y escribe el número." };
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
