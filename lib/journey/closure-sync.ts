import "server-only";
import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { audit } from "@/lib/identity/service";
import { CLOSING_PULSE, closureDecision, stageRequirements, type RequirementInput } from "./closure";
import type { Layer } from "./rules";

type Svc = ReturnType<typeof supabaseService>;
const ACTIVE = ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"];

/** Lo que el motor de cierre necesita de una persona (lectura con la llave de servicio; quien llama ya autorizó). */
export async function closureContext(candidateId: string, svc: Svc = supabaseService()) {
  const { data: c } = await svc.from("candidates").select("id, wave_id, status, journey_layer, user_id, corporate_email, full_name").eq("id", candidateId).maybeSingle();
  if (!c) return null;
  const [{ data: caps }, { data: subs }, { data: certs }, { data: member }, { data: pulses }, { data: closures }] = await Promise.all([
    svc.from("capsules").select("id, layer, task_prompt, task_required, max_attempts").eq("wave_id", c.wave_id).eq("published", true),
    svc.from("submissions").select("capsule_id, status, attempt").eq("candidate_id", c.id),
    svc.from("certifications").select("result, status").eq("candidate_id", c.id),
    svc.from("lab_project_members").select("lab_projects(status)").eq("candidate_id", c.id).maybeSingle(),
    svc.from("pulse_responses").select("pulse, created_at").eq("candidate_id", c.id),
    svc.from("stage_closures").select("*").eq("candidate_id", c.id),
  ]);
  const layer = c.journey_layer as Layer | null;
  const closure = (closures ?? []).find((x) => x.layer === layer) ?? null;
  const input: RequirementInput = {
    capsules: (caps ?? []) as RequirementInput["capsules"],
    submissions: subs ?? [],
    certifications: certs ?? [],
    labStatus: (member?.lab_projects as unknown as { status: string } | null)?.status ?? null,
    byException: Boolean(closure?.requirements_by_exception),
  };
  return { candidate: c, layer, input, answered: (pulses ?? []).map((p) => p.pulse as string), pulses: pulses ?? [], closure, closures: closures ?? [] };
}

export type SyncOutcome = { layer: Layer | null; state: "none" | "requirements" | "pulse" | "closed"; advancedTo: Layer | null };

/**
 * Sincroniza el cierre de la etapa actual: registra cuándo se cumplieron los requisitos y cuándo llegó el pulso,
 * y cuando están ambos cierra la etapa y desbloquea la siguiente. Idempotente y segura ante concurrencia:
 * el avance usa `journey_layer = <actual>` como condición, y los eventos llevan clave única.
 */
export async function syncStageClosure(candidateId: string, actor: string | null = null, svc: Svc = supabaseService()): Promise<SyncOutcome> {
  const ctx = await closureContext(candidateId, svc);
  if (!ctx || !ctx.layer || ctx.layer === "ASSESSMENT" || !ACTIVE.includes(ctx.candidate.status)) return { layer: ctx?.layer ?? null, state: "none", advancedTo: null };
  const layer = ctx.layer;
  const c = ctx.candidate;
  const pulseKey = CLOSING_PULSE[layer]!;
  const req = stageRequirements(layer, ctx.input);
  const pulse = ctx.pulses.find((p) => p.pulse === pulseKey) ?? null;
  const now = new Date().toISOString();

  const row = {
    candidate_id: c.id,
    layer,
    pulse_key: pulseKey,
    requirements_met_at: req.met ? ctx.closure?.requirements_met_at ?? now : null,
    pulse_submitted_at: pulse?.created_at ?? null,
    requirements_by_exception: ctx.closure?.requirements_by_exception ?? false,
    updated_at: now,
  };
  const { error } = await svc.from("stage_closures").upsert(row, { onConflict: "candidate_id,layer" });
  if (error) throw error;
  if (req.met && !ctx.closure?.requirements_met_at) {
    await audit("stage.requirements.met", { actor, candidateId: c.id, waveId: c.wave_id, targetUser: c.user_id, details: { layer, byException: req.byException }, eventKey: `requirements:${c.id}:${layer}` }, svc);
  }

  const d = closureDecision(layer, { ...ctx.input, answered: ctx.answered });
  if (!d.close) return { layer, state: d.missing === "pulse" ? "pulse" : "requirements", advancedTo: null };

  await svc.from("stage_closures").update({ closed_at: ctx.closure?.closed_at ?? now }).eq("candidate_id", c.id).eq("layer", layer).is("closed_at", null);
  await audit("stage.closed", { actor, candidateId: c.id, waveId: c.wave_id, targetUser: c.user_id, details: { layer, pulse: pulseKey, byException: req.byException }, eventKey: `closed:${c.id}:${layer}` }, svc);
  if (!d.next) {
    revalidatePath("/mi-journey");
    return { layer, state: "closed", advancedTo: null };
  }

  // Avance optimista: si otra llamada ya movió a la persona, esta no hace nada.
  const { data: moved, error: e2 } = await svc
    .from("candidates")
    .update({ journey_layer: d.next, journey_layer_since: now })
    .eq("id", c.id)
    .eq("journey_layer", layer)
    .select("id");
  if (e2) throw e2;
  if (moved?.length) {
    await svc.from("journey_events").insert({
      candidate_id: c.id,
      from_layer: layer,
      to_layer: d.next,
      exception: req.byException,
      note: req.byException ? "Cierre de etapa: requisitos por excepción + pulso de cierre" : "Cierre de etapa: requisitos cumplidos + pulso de cierre",
      actor,
    });
    await audit("stage.unlocked", { actor, candidateId: c.id, waveId: c.wave_id, targetUser: c.user_id, details: { from: layer, to: d.next }, eventKey: `unlocked:${c.id}:${d.next}` }, svc);
  }
  revalidatePath("/mi-journey");
  revalidatePath(`/admin/journey/${c.wave_id}`, "layout");
  return { layer, state: "closed", advancedTo: moved?.length ? d.next : null };
}

/** Sincroniza varias personas sin que el error de una detenga a las demás. */
export async function syncMany(candidateIds: string[], actor: string | null = null): Promise<void> {
  const svc = supabaseService();
  for (const id of [...new Set(candidateIds)]) {
    try {
      await syncStageClosure(id, actor, svc);
    } catch (e) {
      console.error("[cierre] no se pudo sincronizar", id, e instanceof Error ? e.message : e);
    }
  }
}

/** El admin da por cumplidos los requisitos académicos de la etapa actual (excepción registrada). El pulso sigue siendo obligatorio. */
export async function markRequirementsByException(candidateId: string, layer: Layer, note: string, actor: string, svc: Svc = supabaseService()) {
  const pulseKey = CLOSING_PULSE[layer];
  if (!pulseKey) return;
  const { error } = await svc
    .from("stage_closures")
    .upsert({ candidate_id: candidateId, layer, pulse_key: pulseKey, requirements_by_exception: true, exception_note: note, updated_at: new Date().toISOString() }, { onConflict: "candidate_id,layer" });
  if (error) throw error;
  await audit("stage.requirements.exception", { actor, candidateId, details: { layer, note } }, svc);
}
