import "server-only";
import { supabaseService } from "@/lib/supabase/server";
import { env } from "@/lib/supabase/env";
import { audit, sendIdentityEmail } from "@/lib/identity/service";

/**
 * Apertura de AI First Mindset por Wave. El acceso al portal y el acceso al contenido son cosas distintas: la
 * persona puede ingresar apenas confirma su compromiso, pero las cápsulas de la etapa solo se ven (RLS) desde la
 * apertura que decide Administración. El aviso "primer reto disponible" sale una sola vez por persona.
 */
type Svc = ReturnType<typeof supabaseService>;
import { openingStatus } from "./opening-labels";
export { OPENING_LABEL, openingStatus, type OpeningStatus } from "./opening-labels";

const JOURNEY = ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"];
const SELECTED = ["SELECTED", "CONDITIONS_PENDING"];
const LAYER = "AI_MINDSET";

export async function mindsetOpening(waveId: string, svc: Svc = supabaseService()) {
  const [{ data: row }, { data: people }, { data: first }] = await Promise.all([
    svc.from("wave_stage_openings").select("opens_at, notified_at, set_at").eq("wave_id", waveId).eq("layer", LAYER).maybeSingle(),
    svc.from("candidates").select("id, status, journey_layer, user_id").eq("wave_id", waveId).in("status", [...JOURNEY, ...SELECTED]),
    svc.from("capsules").select("id, title").eq("wave_id", waveId).eq("layer", LAYER).eq("published", true).order("position").limit(1).maybeSingle(),
  ]);
  const enrolled = (people ?? []).filter((p) => JOURNEY.includes(p.status));
  const inStage = enrolled.filter((p) => (p.journey_layer ?? LAYER) === LAYER).length;
  const opensAt = row?.opens_at ?? null;
  return {
    status: openingStatus(opensAt, inStage, enrolled.length),
    opensAt,
    notifiedAt: row?.notified_at ?? null,
    enabled: enrolled.length,
    pending: (people ?? []).filter((p) => SELECTED.includes(p.status)).length,
    firstChallenge: first?.title ?? null,
  };
}

/**
 * Si la etapa ya abrió y aún no se avisó, envía "primer reto disponible" a quienes están en la etapa. La fila se
 * reclama con una actualización condicional (dos procesos a la vez no duplican) y cada persona lleva su clave de
 * evento. Devuelve cuántos correos salieron y cuántos fallaron (los fallidos quedan en reintento del cron diario).
 */
export async function notifyStageOpen(waveId: string, svc: Svc = supabaseService()): Promise<{ claimed: boolean; sent: number; failed: number }> {
  const now = new Date().toISOString();
  const { data: claimed } = await svc
    .from("wave_stage_openings")
    .update({ notified_at: now })
    .eq("wave_id", waveId)
    .eq("layer", LAYER)
    .is("notified_at", null)
    .lte("opens_at", now)
    .select("wave_id");
  if (!claimed?.length) return { claimed: false, sent: 0, failed: 0 };
  const { data: people } = await svc.from("candidates").select("id, full_name, corporate_email, user_id, journey_layer").eq("wave_id", waveId).in("status", JOURNEY);
  let sent = 0;
  let failed = 0;
  for (const p of people ?? []) {
    if ((p.journey_layer ?? LAYER) !== LAYER) continue;
    const first = await audit("journey.stage_open.notified", { candidateId: p.id, waveId, targetEmail: p.corporate_email, details: { layer: LAYER }, eventKey: `stage-open:${waveId}:${LAYER}:${p.id}` }, svc);
    if (!first) continue;
    const r = await sendIdentityEmail("STAGE_OPEN", p.corporate_email, { name: p.full_name, stage: "AI First Mindset", link: `${env.appUrl}/mi-journey` }, { userId: p.user_id, candidateId: p.id, waveId }, svc);
    if (r.ok) sent++;
    else failed++;
  }
  return { claimed: true, sent, failed };
}

/** Todas las Waves con apertura vencida y sin aviso (lo usa el cron diario y la carga de páginas). */
export async function notifyDueOpenings(svc: Svc = supabaseService()) {
  const { data } = await svc.from("wave_stage_openings").select("wave_id").eq("layer", LAYER).is("notified_at", null).lte("opens_at", new Date().toISOString());
  const out: { waveId: string; sent: number; failed: number }[] = [];
  for (const r of data ?? []) {
    const x = await notifyStageOpen(r.wave_id, svc);
    if (x.claimed) out.push({ waveId: r.wave_id, sent: x.sent, failed: x.failed });
  }
  return out;
}
