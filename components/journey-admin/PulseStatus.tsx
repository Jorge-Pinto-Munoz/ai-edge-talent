import "server-only";
import { supabaseService } from "@/lib/supabase/server";
import { CLOSING_PULSE } from "@/lib/journey/closure";
import { pulseTitle } from "@/lib/pulse/rules";
import { DEFAULT_REMINDERS, type ReminderSettings } from "@/lib/reminders/rules";
import { Icon } from "@/components/site/Icon";
import type { Layer } from "@/lib/journey/rules";

/**
 * Pulso de cierre de una etapa, a la vista del admin: quiénes lo respondieron, a quiénes se les pidió
 * y cuándo se envía. Se habilita al cumplir los requisitos de la etapa (correo inmediato) y se recuerda solo.
 */
export async function PulseStatus({ waveId, layer }: { waveId: string; layer: Layer }) {
  const key = CLOSING_PULSE[layer];
  if (!key) return null;
  const svc = supabaseService();
  const [{ data: people }, { data: st }] = await Promise.all([
    svc.from("candidates").select("id, journey_layer").eq("wave_id", waveId).in("status", ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"]).not("journey_layer", "is", null),
    svc.from("app_settings").select("value").eq("key", "reminders").maybeSingle(),
  ]);
  const ids = (people ?? []).map((p) => p.id);
  const [{ data: answers }, { data: closures }] = ids.length
    ? await Promise.all([
        svc.from("pulse_responses").select("candidate_id").eq("pulse", key).in("candidate_id", ids),
        svc.from("stage_closures").select("candidate_id, requirements_met_at, reminders_sent, pulse_submitted_at").eq("layer", layer).in("candidate_id", ids),
      ])
    : [{ data: [] as { candidate_id: string }[] }, { data: [] as { candidate_id: string; requirements_met_at: string | null; reminders_sent: number; pulse_submitted_at: string | null }[] }];
  const s: ReminderSettings = { ...DEFAULT_REMINDERS, ...((st?.value as Partial<ReminderSettings>) ?? {}) };
  const answered = new Set((answers ?? []).map((a) => a.candidate_id));
  const due = (closures ?? []).filter((c) => c.requirements_met_at && !answered.has(c.candidate_id));
  const reminders = (closures ?? []).reduce((n, c) => n + (c.reminders_sent ?? 0), 0);
  return (
    <section className="adm-card pulse-status" aria-label="Pulso de cierre de la etapa">
      <div className="ps-head">
        <span className="ps-ico" aria-hidden="true"><Icon name="chat" size={20} /></span>
        <div>
          <h2>{pulseTitle(key)}</h2>
          <p className="muted">
            Se habilita en el portal cuando la persona cumple los requisitos de la etapa y en ese momento le llega un correo.
            Si no responde, recordatorio cada {s.every_days} días (máximo {s.max}) y aviso a su Delivery a los {s.delivery_after_days} días.
          </p>
        </div>
      </div>
      <div className="ps-stats">
        <div><strong>{answered.size}</strong><small>Respondieron</small></div>
        <div className={due.length ? "warn" : ""}><strong>{due.length}</strong><small>Habilitado · sin responder</small></div>
        <div><strong>{reminders}</strong><small>Correos de pulso enviados</small></div>
      </div>
    </section>
  );
}
