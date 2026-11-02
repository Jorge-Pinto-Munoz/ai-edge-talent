"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/admission/auth";
import { supabaseService } from "@/lib/supabase/server";
import { aiConfigured } from "@/lib/ai/client";
import { errorText } from "@/lib/text/errors";
import { aiReviewSubmission, pendingAiReviewIds, runAiReviews } from "./ai-review";

/** Admin: genera en segundo plano las propuestas de IA de todas las entregas por revisar de la Wave que no la tienen. */
export async function generateAiReviews(waveId: string): Promise<{ ok: boolean; message: string; count?: number }> {
  try {
    await requireRole(["admin"]);
    if (!aiConfigured()) throw new Error("Falta ANTHROPIC_API_KEY en el servidor (Vercel → Settings → Environment Variables).");
    const svc = supabaseService();
    const ids = await pendingAiReviewIds(waveId, svc);
    if (!ids.length) return { ok: true, message: "Todas las entregas por revisar ya tienen su propuesta.", count: 0 };
    const now = new Date().toISOString();
    await svc.from("submission_ai_reviews").upsert(ids.map((submission_id) => ({ submission_id, status: "pending", error: null, updated_at: now })));
    after(async () => {
      await runAiReviews(ids);
      revalidatePath(`/admin/journey/${waveId}`, "layout");
    });
    return { ok: true, message: `Claude está revisando ${ids.length} entrega(s). Recarga en 1–2 minutos para ver las propuestas.`, count: ids.length };
  } catch (e) {
    return { ok: false, message: errorText(e) };
  }
}

/** Admin: vuelve a generar la propuesta de una entrega. */
export async function regenerateAiReview(submissionId: string): Promise<{ ok: boolean; message: string }> {
  try {
    await requireRole(["admin"]);
    if (!aiConfigured()) throw new Error("Falta ANTHROPIC_API_KEY en el servidor.");
    const r = await aiReviewSubmission(submissionId);
    return r;
  } catch (e) {
    return { ok: false, message: errorText(e) };
  }
}
