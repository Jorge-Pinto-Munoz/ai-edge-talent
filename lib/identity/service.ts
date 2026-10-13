import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";
import { supabaseService, supabaseUser } from "@/lib/supabase/server";
import { env, serverEnv } from "@/lib/supabase/env";
import { sendEmail } from "@/lib/email/send";
import { renderIdentity, type IdentityTemplate } from "@/lib/email/identity";
import { hashCode, isCode, newCode, sameHash } from "@/lib/staff/codes";

type Svc = ReturnType<typeof supabaseService>;
export type CodePurpose = "LOGIN" | "ACTIVATION" | "RESET" | "ADMIN_STEP";

/** Vigencia de cada código temporal (minutos). */
export const CODE_TTL: Record<CodePurpose, number> = { LOGIN: 10, ACTIVATION: 48 * 60, RESET: 30, ADMIN_STEP: 10 };
export const CODE_ATTEMPTS = 5;
/** Ingreso con código por correo: espera mínima entre envíos y máximo de códigos por correo cada 15 minutos. */
export const LOGIN_RESEND_S = 45;
export const LOGIN_MAX_PER_15 = 5;

function secret(): string {
  const s = process.env.STAFF_CODE_SECRET || serverEnv().serviceRoleKey;
  if (!s) throw new Error("Falta configuración del servidor.");
  return s;
}
export const ipHash = (ip: string | null) => (ip ? createHmac("sha256", secret()).update(ip).digest("hex").slice(0, 32) : null);

// ───────────── Auditoría (eventos de dominio) ─────────────
/** Registra un evento. Con `eventKey`, es idempotente: devuelve false si ya se había registrado. */
export async function audit(
  action: string,
  e: { actor?: string | null; actorEmail?: string | null; targetUser?: string | null; targetEmail?: string | null; candidateId?: string | null; waveId?: string | null; details?: Record<string, unknown>; eventKey?: string },
  svc: Svc = supabaseService(),
): Promise<boolean> {
  const { error } = await svc.from("audit_log").insert({
    action,
    event_key: e.eventKey ?? null,
    actor: e.actor ?? null,
    actor_email: e.actorEmail ?? null,
    target_user: e.targetUser ?? null,
    target_email: e.targetEmail?.toLowerCase() ?? null,
    candidate_id: e.candidateId ?? null,
    wave_id: e.waveId ?? null,
    details: e.details ?? {},
  });
  if (error?.code === "23505") return false;
  if (error) throw error;
  return true;
}

// ───────────── Códigos temporales ─────────────
/** Emite un código nuevo (invalida los anteriores del mismo propósito). Devuelve el código en claro solo para enviarlo. */
export async function issueCode(email: string, purpose: CodePurpose, requestedBy: string | null, digits: 4 | 6 = 4, svc: Svc = supabaseService()): Promise<string> {
  const e = email.toLowerCase();
  await svc.from("staff_login_codes").update({ consumed_at: new Date().toISOString() }).eq("email", e).eq("purpose", purpose).is("consumed_at", null);
  const code = digits === 6 ? `${newCode()}${newCode()}`.slice(0, 6) : newCode();
  const { error } = await svc.from("staff_login_codes").insert({
    email: e, purpose, requested_by: requestedBy, code_hash: hashCode(e, code, secret()),
    expires_at: new Date(Date.now() + CODE_TTL[purpose] * 60_000).toISOString(),
  });
  if (error) throw error;
  return code;
}

/** Verifica un código. Cuenta intentos fallidos; `consume` lo invalida si es correcto. */
export async function checkCode(email: string, purposes: CodePurpose[], code: string, consume: boolean, svc: Svc = supabaseService()): Promise<{ ok: true; purpose: CodePurpose } | { ok: false; message: string }> {
  const e = email.toLowerCase();
  if (!/^\d{4}$|^\d{6}$/.test(code)) return { ok: false, message: "Revisa el código: son solo números." };
  const { data: row } = await svc.from("staff_login_codes").select("id, code_hash, expires_at, attempts, purpose").eq("email", e).in("purpose", purposes).is("consumed_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!row || new Date(row.expires_at).getTime() < Date.now()) return { ok: false, message: "El código venció o no existe. Pide uno nuevo." };
  if (row.attempts >= CODE_ATTEMPTS) return { ok: false, message: "Demasiados intentos con este código. Pide uno nuevo." };
  if (!sameHash(row.code_hash, hashCode(e, code, secret()))) {
    const left = CODE_ATTEMPTS - row.attempts - 1;
    await svc.from("staff_login_codes").update({ attempts: row.attempts + 1, ...(left <= 0 ? { consumed_at: new Date().toISOString() } : {}) }).eq("id", row.id);
    return { ok: false, message: left > 0 ? `Código incorrecto. Te quedan ${left} intento${left === 1 ? "" : "s"}.` : "Demasiados intentos. Pide un código nuevo." };
  }
  if (consume) await svc.from("staff_login_codes").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);
  return { ok: true, purpose: row.purpose as CodePurpose };
}
export { isCode };

// ───────────── Sesiones ─────────────
/** Abre la sesión de Supabase (cookies) para un correo ya verificado por el servidor. */
export async function openSession(email: string, svc: Svc = supabaseService()) {
  const { data: link, error } = await svc.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !link?.properties?.hashed_token) throw error ?? new Error("Sin token");
  const db = await supabaseUser();
  const { data, error: ve } = await db.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
  if (ve || !data.user) throw ve ?? new Error("Sin usuario");
  return data.user;
}

/**
 * Cierra todas las sesiones de una persona: revoca sus refresh tokens (cierre global) y marca la hora, para que el
 * servidor rechace también los tokens de acceso emitidos antes (que de otro modo seguirían válidos hasta una hora).
 */
export async function revokeSessions(userId: string, email: string, svc: Svc = supabaseService()) {
  await svc.from("profiles").update({ sessions_revoked_at: new Date().toISOString() }).eq("id", userId);
  try {
    const { data: link } = await svc.auth.admin.generateLink({ type: "magiclink", email });
    const tmp = createClient(env.supabaseUrl, env.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await tmp.auth.verifyOtp({ type: "magiclink", token_hash: link!.properties!.hashed_token });
    if (data.session) await svc.auth.admin.signOut(data.session.access_token, "global");
  } catch (e) {
    console.error("[identidad] revocar sesiones", e);
  }
}

/** Bloquea o desbloquea el ingreso en Supabase Auth (impide renovar sesiones). */
export async function setAuthBan(userId: string, banned: boolean, svc: Svc = supabaseService()) {
  await svc.auth.admin.updateUserById(userId, { ban_duration: banned ? "876000h" : "none" });
}

// ───────────── Cuentas ─────────────
/** Crea la cuenta si no existe (sin duplicar). El perfil lo crea el trigger con el rol otorgado en role_grants. */
export async function ensureAccount(email: string, fullName: string | null, svc: Svc = supabaseService()): Promise<{ userId: string; created: boolean }> {
  const e = email.toLowerCase();
  const { data: p } = await svc.from("profiles").select("id, full_name").eq("email", e).maybeSingle();
  if (p) {
    if (fullName && !p.full_name) await svc.from("profiles").update({ full_name: fullName }).eq("id", p.id);
    return { userId: p.id, created: false };
  }
  const { data, error } = await svc.auth.admin.createUser({ email: e, email_confirm: true, user_metadata: fullName ? { full_name: fullName } : undefined });
  if (error && !/already/i.test(error.message)) throw error;
  const { data: p2 } = await svc.from("profiles").select("id").eq("email", e).single();
  await svc.from("profiles").update({ status: "PENDING", full_name: fullName, updated_at: new Date().toISOString() }).eq("id", p2!.id);
  await svc.from("user_credentials").upsert({ user_id: p2!.id }, { onConflict: "user_id", ignoreDuplicates: true });
  // Vincula postulaciones previas con ese correo (el trigger solo lo hace al crear el usuario).
  await svc.from("candidates").update({ user_id: p2!.id }).ilike("corporate_email", e).is("user_id", null);
  return { userId: data?.user?.id ?? p2!.id, created: true };
}

// ───────────── Correos (con registro real del envío) ─────────────
/**
 * Envía un correo de identidad/journey y lo registra en email_messages: "sent" significa aceptado por el proveedor
 * (Resend), no entregado. Si falla queda "failed" para reintento.
 */
export async function sendIdentityEmail(
  template: IdentityTemplate,
  to: string,
  ctx: Parameters<typeof renderIdentity>[1],
  meta: { userId?: string | null; candidateId?: string | null; waveId?: string | null; sentBy?: string | null } = {},
  svc: Svc = supabaseService(),
): Promise<{ ok: boolean; error: string | null }> {
  const r = renderIdentity(template, ctx);
  const { data: row } = await svc.from("email_messages").insert({
    to_email: to.toLowerCase(), template, kind: "identity", subject: r.subject,
    // El cuerpo guardado nunca incluye el código.
    body_text: ctx.code ? r.text.replace(ctx.code, "••••") : r.text,
    user_id: meta.userId ?? null, candidate_id: meta.candidateId ?? null, wave_id: meta.waveId ?? null, sent_by: meta.sentBy ?? null,
  }).select("id").single();
  const res = await sendEmail(to, r.subject, r.text, undefined, r.html);
  if (row) await svc.from("email_messages").update(res.error ? { status: "failed", error: res.error.slice(0, 300) } : { status: "sent", provider_id: res.id, sent_at: new Date().toISOString() }).eq("id", row.id);
  return { ok: !res.error, error: res.error };
}

export const portalLink = (mode: "activar" | "ingresar" | "restablecer", email?: string, next?: string) =>
  `${env.appUrl}/ingresar?modo=${mode}${email ? `&email=${encodeURIComponent(email)}` : ""}${next ? `&next=${encodeURIComponent(next)}` : ""}`;

export const HOME_BY_ROLE: Record<string, string> = { admin: "/admin", delivery: "/equipo", bp: "/equipo", mentor: "/ai-coach", client: "/cliente", kiber: "/mi-journey", profesor: "/admin/profesor", hub: "/admin/lab" };

/**
 * Envía un código de ingreso de 6 dígitos (un solo uso, 10 minutos) a una cuenta existente.
 * Respeta la espera entre envíos y el máximo cada 15 minutos. Nunca devuelve el código.
 */
export async function sendLoginCode(
  email: string,
  opts: { name?: string | null; context?: string; userId?: string | null; candidateId?: string | null; waveId?: string | null } = {},
  svc: Svc = supabaseService(),
): Promise<{ ok: boolean; reason?: "wait" | "limit" | "email"; waitS?: number }> {
  const e = email.toLowerCase();
  const since = new Date(Date.now() - 15 * 60_000).toISOString();
  const { data: recent } = await svc.from("staff_login_codes").select("created_at").eq("email", e).eq("purpose", "LOGIN").gte("created_at", since).order("created_at", { ascending: false });
  const last = recent?.[0] ? Date.parse(recent[0].created_at) : 0;
  const waitS = Math.ceil(LOGIN_RESEND_S - (Date.now() - last) / 1000);
  if (last && waitS > 0) return { ok: false, reason: "wait", waitS };
  if ((recent?.length ?? 0) >= LOGIN_MAX_PER_15) return { ok: false, reason: "limit" };
  const code = await issueCode(e, "LOGIN", opts.userId ?? null, 6, svc);
  const r = await sendIdentityEmail("LOGIN_CODE", e, { name: opts.name ?? undefined, code, minutes: CODE_TTL.LOGIN, stage: opts.context, link: portalLink("ingresar", e) }, { userId: opts.userId ?? null, candidateId: opts.candidateId ?? null, waveId: opts.waveId ?? null }, svc);
  return r.ok ? { ok: true } : { ok: false, reason: "email" };
}
