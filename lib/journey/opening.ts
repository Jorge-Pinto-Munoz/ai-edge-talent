import "server-only";
import { supabaseService } from "@/lib/supabase/server";
import { env } from "@/lib/supabase/env";
import { audit, sendIdentityEmail } from "@/lib/identity/service";
import { layerName, type Layer } from "./rules";
import { sendReWelcome } from "./welcome";

/**
 * «Habilitar etapa» por Wave (todas las etapas del journey). El acceso al portal y el acceso al contenido son cosas
 * distintas: los módulos de una etapa solo se ven (RLS) desde que Administración la habilita para la Wave. Al
 * habilitarla, cada persona que está en la etapa recibe un aviso, una sola vez.
 */
type Svc = ReturnType<typeof supabaseService>;
import { openingStatus } from "./opening-labels";
export { OPENING_LABEL, openingStatus, type OpeningStatus } from "./opening-labels";

const JOURNEY = ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"];
const SELECTED = ["SELECTED", "CONDITIONS_PENDING"];
export const OPENABLE: Layer[] = ["AI_MINDSET", "ROLE_ENABLEMENT", "AI_LAB_SHOWCASE", "SHOWCASE", "CLOSURE"];
/** Etapa efectiva de una persona (inscrita sin etapa = empieza en AI First Mindset). */
const layerOf = (p: { journey_layer: string | null }) => (p.journey_layer ?? "AI_MINDSET") as Layer;
export const stageLabel = (l: Layer) => (l === "AI_MINDSET" ? "AI First Mindset" : layerName(l));

export async function stageIsOpen(waveId: string, layer: Layer, svc: Svc = supabaseService()): Promise<boolean> {
  if (layer === "ASSESSMENT") return true;
  const { data } = await svc.from("wave_stage_openings").select("opens_at").eq("wave_id", waveId).eq("layer", layer).maybeSingle();
  return Boolean(data?.opens_at && new Date(data.opens_at).getTime() <= Date.now());
}

export async function stageOpening(waveId: string, layer: Layer, svc: Svc = supabaseService()) {
  const [{ data: row }, { data: people }, { data: first }] = await Promise.all([
    svc.from("wave_stage_openings").select("opens_at, notified_at, set_at").eq("wave_id", waveId).eq("layer", layer).maybeSingle(),
    svc.from("candidates").select("id, status, journey_layer").eq("wave_id", waveId).in("status", [...JOURNEY, ...SELECTED]),
    svc.from("capsules").select("id, title").eq("wave_id", waveId).eq("layer", layer).eq("published", true).order("position").limit(1).maybeSingle(),
  ]);
  const enrolled = (people ?? []).filter((p) => JOURNEY.includes(p.status));
  const order = OPENABLE.indexOf(layer);
  const inStage = enrolled.filter((p) => layerOf(p) === layer).length;
  const before = enrolled.filter((p) => OPENABLE.indexOf(layerOf(p)) < order).length;
  const after = enrolled.filter((p) => OPENABLE.indexOf(layerOf(p)) > order).length;
  const opensAt = row?.opens_at ?? null;
  return {
    layer,
    stageName: stageLabel(layer),
    // Finalizada: nadie en la etapa ni por llegar, y alguien ya más adelante.
    status: openingStatus(opensAt, inStage + before, inStage + before + after),
    opensAt,
    notifiedAt: row?.notified_at ?? null,
    // Mindset: inscritos y por confirmar compromiso. Otras etapas: quienes ya están y quienes aún no llegan.
    enabled: layer === "AI_MINDSET" ? enrolled.length : inStage,
    pending: layer === "AI_MINDSET" ? (people ?? []).filter((p) => SELECTED.includes(p.status)).length : before,
    firstChallenge: first?.title ?? null,
  };
}
export const mindsetOpening = (waveId: string, svc: Svc = supabaseService()) => stageOpening(waveId, "AI_MINDSET", svc);

/**
 * Si la etapa ya abrió y aún no se avisó, avisa a quienes están en ella. La fila se reclama con una actualización
 * condicional (dos procesos a la vez no duplican) y cada persona lleva su clave de evento. Role Enablement envía su
 * bienvenida con instrucciones; las demás, «etapa habilitada».
 */
export async function notifyStageOpen(waveId: string, layer: Layer = "AI_MINDSET", svc: Svc = supabaseService()): Promise<{ claimed: boolean; sent: number; failed: number }> {
  const now = new Date().toISOString();
  const { data: claimed } = await svc
    .from("wave_stage_openings")
    .update({ notified_at: now })
    .eq("wave_id", waveId)
    .eq("layer", layer)
    .is("notified_at", null)
    .lte("opens_at", now)
    .select("wave_id");
  if (!claimed?.length) return { claimed: false, sent: 0, failed: 0 };
  const { data: people } = await svc.from("candidates").select("id, full_name, corporate_email, user_id, journey_layer").eq("wave_id", waveId).in("status", JOURNEY);
  let sent = 0;
  let failed = 0;
  for (const p of people ?? []) {
    if (layerOf(p) !== layer) continue;
    if (layer === "ROLE_ENABLEMENT") {
      const r = await sendReWelcome(p.id, { svc });
      if (r === "sent") sent++;
      else if (r === "failed") failed++;
      continue;
    }
    const first = await audit("journey.stage_open.notified", { candidateId: p.id, waveId, targetEmail: p.corporate_email, details: { layer }, eventKey: `stage-open:${waveId}:${layer}:${p.id}` }, svc);
    if (!first) continue;
    const r = await sendIdentityEmail("STAGE_OPEN", p.corporate_email, { name: p.full_name, stage: stageLabel(layer), link: `${env.appUrl}/mi-journey` }, { userId: p.user_id, candidateId: p.id, waveId }, svc);
    if (r.ok) sent++;
    else failed++;
  }
  return { claimed: true, sent, failed };
}

/** Todas las aperturas vencidas y sin aviso (lo usa el cron diario y la carga de páginas). */
export async function notifyDueOpenings(svc: Svc = supabaseService()) {
  const { data } = await svc.from("wave_stage_openings").select("wave_id, layer").is("notified_at", null).lte("opens_at", new Date().toISOString());
  const out: { waveId: string; layer: string; sent: number; failed: number }[] = [];
  for (const r of data ?? []) {
    const x = await notifyStageOpen(r.wave_id, r.layer as Layer, svc);
    if (x.claimed) out.push({ waveId: r.wave_id, layer: r.layer, sent: x.sent, failed: x.failed });
  }
  return out;
}
