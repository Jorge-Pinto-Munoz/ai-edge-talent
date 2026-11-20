import "server-only";
import { supabaseService } from "@/lib/supabase/server";
import { audit, portalLink, sendIdentityEmail } from "@/lib/identity/service";

type Svc = ReturnType<typeof supabaseService>;
export const reWelcomeKey = (candidateId: string) => `welcome:ROLE_ENABLEMENT:${candidateId}`;

/**
 * Correo de bienvenida a Role Enablement (qué hacer en la plataforma), con copia a su Delivery.
 * Una sola vez por persona (eventKey): sirve al avanzar sola, al moverla el admin o al enviarlo en lote.
 */
export async function sendReWelcome(candidateId: string, opts: { actor?: string | null; note?: string; svc?: Svc } = {}): Promise<"sent" | "failed" | "skipped"> {
  const svc = opts.svc ?? supabaseService();
  const { data: c } = await svc.from("candidates").select("id, wave_id, full_name, corporate_email, user_id").eq("id", candidateId).maybeSingle();
  if (!c) return "skipped";
  const first = await audit("stage.welcome.sent", { actor: opts.actor ?? null, candidateId: c.id, waveId: c.wave_id, targetEmail: c.corporate_email, details: { layer: "ROLE_ENABLEMENT" }, eventKey: reWelcomeKey(c.id) }, svc);
  if (!first) return "skipped";
  const r = await sendIdentityEmail("RE_WELCOME", c.corporate_email, { name: c.full_name, extra: opts.note?.trim() || undefined, link: portalLink("ingresar", c.corporate_email, "/mi-journey") }, { userId: c.user_id, candidateId: c.id, waveId: c.wave_id, sentBy: opts.actor ?? undefined }, svc);
  return r.ok ? "sent" : "failed";
}

/** Personas en Role Enablement de la Wave que aún no reciben la bienvenida. */
export async function pendingReWelcome(waveId: string, svc: Svc = supabaseService()) {
  const { data: people } = await svc.from("candidates").select("id, full_name").eq("wave_id", waveId).eq("journey_layer", "ROLE_ENABLEMENT").in("status", ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"]).order("full_name");
  const ids = (people ?? []).map((p) => p.id);
  const { data: sent } = ids.length ? await svc.from("audit_log").select("event_key").in("event_key", ids.map(reWelcomeKey)) : { data: [] as { event_key: string }[] };
  const done = new Set((sent ?? []).map((s) => s.event_key));
  return { all: people ?? [], pending: (people ?? []).filter((p) => !done.has(reWelcomeKey(p.id))) };
}
