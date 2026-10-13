import "server-only";
import type { supabaseService } from "@/lib/supabase/server";
import { evaluateApplication, EVALUATION_MODEL } from "@/lib/ai/evaluate";
import { EvaluationError, RUBRIC_VERSION } from "@/lib/ai/rubric";
import { aiErrorMessage } from "@/lib/ai/client";

/** Módulo interno (no es server action): evalúa una postulación enviada y guarda la propuesta. */
export async function evaluateOne(svc: ReturnType<typeof supabaseService>, candidateId: string, createdBy: string | null): Promise<string> {
  const { data: c } = await svc.from("candidates").select("id, full_name, role_title, status, wave_id").eq("id", candidateId).single();
  if (!c) return `Candidato no encontrado (${candidateId}).`;
  const { data: app } = await svc.from("applications").select("id, answers, questions_snapshot, submitted_at").eq("candidate_id", candidateId).single();
  if (!app?.submitted_at) return `${c.full_name}: aún no envía su postulación.`;
  const questions = (app.questions_snapshot ?? []) as { id: string; prompt: string }[];
  try {
    const r = await evaluateApplication({ roleTitle: c.role_title, questions, answers: app.answers as Record<string, string> });
    const { error } = await svc.from("ai_evaluations").insert({
      application_id: app.id,
      model: r.model ?? EVALUATION_MODEL,
      rubric_version: RUBRIC_VERSION,
      scores: {
        real_use: r.evaluation.real_use,
        depth: r.evaluation.depth,
        reframe: r.evaluation.reframe,
        autonomy: r.evaluation.autonomy,
        disposition: r.evaluation.disposition,
      },
      weighted_total: r.total,
      level: r.level,
      recommendation: r.recommendation,
      pl_recommendation: r.plRecommendation,
      summary: r.evaluation.summary,
      risks: r.evaluation.risks,
      strengths: r.evaluation.strengths,
      insufficient_fields: r.evaluation.insufficient_fields,
      created_by: createdBy,
    });
    if (error) throw error;
    if (c.status === "APPLICATION_SUBMITTED") {
      await svc.from("candidates").update({ status: "ASSESSMENT_EVALUATED" }).eq("id", c.id);
    }
    return "ok";
  } catch (e) {
    return `${c.full_name}: ${e instanceof EvaluationError ? e.message : aiErrorMessage(e)}`;
  }
}

