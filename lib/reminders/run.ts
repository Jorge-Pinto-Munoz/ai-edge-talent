import "server-only";
import { supabaseService } from "@/lib/supabase/server";
import { env } from "@/lib/supabase/env";
import { sendEmail } from "@/lib/email/send";
import { audit, sendIdentityEmail } from "@/lib/identity/service";
import { syncMany } from "@/lib/journey/closure-sync";
import { layerName, type Layer } from "@/lib/journey/rules";
import { notifyDueOpenings } from "@/lib/journey/opening";
import { DEFAULT_REMINDERS, MAX_EMAIL_ATTEMPTS, RETRYABLE, deliveryAlertDue, reminderDue, type ReminderSettings } from "./rules";

/**
 * Corrida diaria: sincroniza cierres de etapa, recuerda pulsos pendientes, avisa a Delivery y reintenta correos fallidos.
 * Idempotente: cada envío reserva su fila con una actualización condicionada al valor anterior.
 */
export async function runReminders(now = new Date()) {
  const svc = supabaseService();
  const { data: st } = await svc.from("app_settings").select("value").eq("key", "reminders").maybeSingle();
  const s: ReminderSettings = { ...DEFAULT_REMINDERS, ...((st?.value as Partial<ReminderSettings>) ?? {}) };

  // 1) Cierres al día (por si un requisito se cumplió por una vía que no sincronizó).
  const { data: waves } = await svc.from("waves").select("id").neq("status", "CLOSED");
  const waveIds = (waves ?? []).map((w) => w.id);
  const { data: cands } = waveIds.length
    ? await svc.from("candidates").select("id").in("wave_id", waveIds).in("status", ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"]).not("journey_layer", "is", null)
    : { data: [] as { id: string }[] };
  await syncMany((cands ?? []).map((c) => c.id));

  // 2) Pulsos pendientes.
  const { data: pending } = await svc
    .from("stage_closures")
    .select("candidate_id, layer, requirements_met_at, last_reminder_at, reminders_sent, delivery_alerted_at, candidates!inner(full_name, corporate_email, user_id, wave_id, journey_layer)")
    .not("requirements_met_at", "is", null)
    .is("pulse_submitted_at", null)
    .is("closed_at", null);
  const out = { reminders: 0, deliveryAlerts: 0, retried: 0, failed: 0 };
  for (const row of pending ?? []) {
    const c = row.candidates as unknown as { full_name: string; corporate_email: string; user_id: string | null; wave_id: string; journey_layer: string };
    if (c.journey_layer !== row.layer || !waveIds.includes(c.wave_id)) continue;
    const stage = layerName(row.layer as Layer);
    const pc = { requirements_met_at: row.requirements_met_at!, last_reminder_at: row.last_reminder_at, reminders_sent: row.reminders_sent, delivery_alerted_at: row.delivery_alerted_at };

    if (reminderDue(pc, s, now)) {
      let claim = svc.from("stage_closures").update({ last_reminder_at: now.toISOString(), reminders_sent: row.reminders_sent + 1 }).eq("candidate_id", row.candidate_id).eq("layer", row.layer).eq("reminders_sent", row.reminders_sent);
      claim = row.last_reminder_at ? claim.eq("last_reminder_at", row.last_reminder_at) : claim.is("last_reminder_at", null);
      const { data: got } = await claim.select("candidate_id");
      if (got?.length) {
        const r = await sendIdentityEmail("PULSE_REMINDER", c.corporate_email, { name: c.full_name, stage, link: `${env.appUrl}/ingresar?next=/mi-journey` }, { userId: c.user_id, candidateId: row.candidate_id, waveId: c.wave_id }, svc);
        await audit("pulse.reminder.sent", { candidateId: row.candidate_id, waveId: c.wave_id, targetEmail: c.corporate_email, details: { layer: row.layer, n: row.reminders_sent + 1, ok: r.ok } }, svc);
        if (r.ok) out.reminders++;
        else out.failed++;
      }
    }

    const { data: a } = await svc.from("delivery_assignments").select("delivery_email").eq("candidate_id", row.candidate_id).maybeSingle();
    if (deliveryAlertDue(pc, s, now, Boolean(a))) {
      const { data: got } = await svc.from("stage_closures").update({ delivery_alerted_at: now.toISOString() }).eq("candidate_id", row.candidate_id).eq("layer", row.layer).is("delivery_alerted_at", null).select("candidate_id");
      if (got?.length) {
        const { data: d } = await svc.from("profiles").select("full_name").eq("email", a!.delivery_email).maybeSingle();
        const r = await sendIdentityEmail("DELIVERY_PULSE_ALERT", a!.delivery_email, { name: d?.full_name ?? undefined, stage, extra: c.full_name, link: `${env.appUrl}/ingresar?next=${encodeURIComponent(`/equipo?wave=${c.wave_id}`)}` }, { candidateId: row.candidate_id, waveId: c.wave_id }, svc);
        await audit("pulse.delivery.alerted", { candidateId: row.candidate_id, waveId: c.wave_id, targetEmail: a!.delivery_email, details: { layer: row.layer, ok: r.ok } }, svc);
        if (r.ok) out.deliveryAlerts++;
        else out.failed++;
      }
    }
  }

  // 3) Reintentos de correos fallidos sin código (últimas 48 h).
  const { data: failed } = await svc
    .from("email_messages")
    .select("id, to_email, template, subject, body_text, attempts, created_at")
    .eq("status", "failed")
    .lt("attempts", MAX_EMAIL_ATTEMPTS)
    .gte("created_at", new Date(now.getTime() - 2 * 86_400_000).toISOString())
    .limit(50);
  for (const m of failed ?? []) {
    if (!RETRYABLE.has(m.template)) continue;
    // Una invitación al rescate vieja ya no sirve (su plazo es de 24 h): Administración puede extender y reenviar.
    if (m.template === "RESCUE_INVITE" && now.getTime() - new Date(m.created_at).getTime() > 12 * 3_600_000) continue;
    const { data: got } = await svc.from("email_messages").update({ attempts: m.attempts + 1, status: "queued" }).eq("id", m.id).eq("attempts", m.attempts).eq("status", "failed").select("id");
    if (!got?.length) continue;
    const res = await sendEmail(m.to_email, m.subject, m.body_text);
    await svc.from("email_messages").update(res.error ? { status: "failed", error: res.error.slice(0, 300) } : { status: "sent", provider_id: res.id, sent_at: new Date().toISOString(), error: null }).eq("id", m.id);
    if (!res.error) out.retried++;
  }
  // 4) Aperturas programadas de AI First Mindset ya vencidas: aviso único "primer reto disponible".
  const openings = await notifyDueOpenings(svc);
  // 5) Rescates vencidos sin video: queda registrado (la decisión sigue siendo humana; la base ya bloquea envíos).
  const { data: expired } = await svc
    .from("rescue_invitations")
    .select("candidate_id, wave_id, expires_at, candidates!inner(status)")
    .is("expired_logged_at", null)
    .not("expires_at", "is", null)
    .lt("expires_at", now.toISOString());
  let rescuesExpired = 0;
  for (const r of expired ?? []) {
    if ((r.candidates as unknown as { status: string }).status !== "RESCUE_REQUIRED") continue;
    const { data: video } = await svc.from("rescue_videos").select("candidate_id").eq("candidate_id", r.candidate_id).maybeSingle();
    if (video) continue;
    const { data: got } = await svc.from("rescue_invitations").update({ expired_logged_at: now.toISOString() }).eq("candidate_id", r.candidate_id).is("expired_logged_at", null).select("candidate_id");
    if (!got?.length) continue;
    await audit("admission.rescue.expired", { candidateId: r.candidate_id, waveId: r.wave_id, details: { expires_at: r.expires_at }, eventKey: `rescue-expired:${r.candidate_id}:${r.expires_at}` }, svc);
    rescuesExpired++;
  }
  return { ...out, openingsNotified: openings.reduce((n, o) => n + o.sent, 0), rescuesExpired };
}
