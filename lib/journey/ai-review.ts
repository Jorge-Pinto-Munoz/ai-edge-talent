import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { supabaseService } from "@/lib/supabase/server";
import { aiConfigured, aiErrorMessage } from "@/lib/ai/client";
import { reviewSubmissionWithClaude } from "@/lib/ai/submission-review";
import { suggestedVerdict } from "./ai-verdict";
import { officeText } from "./office-text";

type Block = Anthropic.Beta.Messages.BetaContentBlockParam;
type FileRef = { name: string; path: string; size?: number };
type Svc = ReturnType<typeof supabaseService>;

const MAX_TEXT = 60_000;
const MAX_PDF_BYTES = 25 * 1024 * 1024;
/** Una revisión «pendiente» más antigua que esto se considera caída y se puede reintentar. */
const STALE_MS = 10 * 60_000;

/** Un archivo como bloque para Claude: PDF e imágenes nativos; Office y texto como texto extraído. */
async function fileBlocks(svc: Svc, bucket: "content" | "submissions", f: FileRef): Promise<Block[]> {
  const ext = f.name.toLowerCase().split(".").pop() ?? "";
  const { data, error } = await svc.storage.from(bucket).download(f.path);
  if (error || !data) return [{ type: "text", text: `[Archivo «${f.name}»: no se pudo descargar]` }];
  const bytes = await data.arrayBuffer();
  if (ext === "pdf") {
    if (bytes.byteLength > MAX_PDF_BYTES) return [{ type: "text", text: `[Archivo «${f.name}»: PDF demasiado grande para revisión automática]` }];
    return [{ type: "document", title: f.name, source: { type: "base64", media_type: "application/pdf", data: Buffer.from(bytes).toString("base64") } }];
  }
  const image = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif" }[ext] as "image/png" | "image/jpeg" | "image/webp" | "image/gif" | undefined;
  if (image) return [{ type: "text", text: `Imagen «${f.name}»:` }, { type: "image", source: { type: "base64", media_type: image, data: Buffer.from(bytes).toString("base64") } }];
  let text: string | null = null;
  try {
    if (["pptx", "docx", "xlsx"].includes(ext)) text = await officeText(f.name, bytes);
    else if (["txt", "md", "csv"].includes(ext)) text = new TextDecoder().decode(bytes);
  } catch {
    text = null;
  }
  if (!text?.trim()) return [{ type: "text", text: `[Archivo «${f.name}»: formato .${ext} sin texto legible automáticamente; requiere revisión humana]` }];
  return [{ type: "text", text: `Archivo «${f.name}»:\n${text.slice(0, MAX_TEXT)}${text.length > MAX_TEXT ? "\n[…recortado]" : ""}` }];
}

/** Revisa una entrega con Claude y guarda la propuesta (borrador). Nunca cambia el estado de la entrega. */
export async function aiReviewSubmission(submissionId: string, svc: Svc = supabaseService()): Promise<{ ok: boolean; message: string }> {
  if (!aiConfigured()) return { ok: false, message: "Falta ANTHROPIC_API_KEY en el servidor." };
  const { data: s } = await svc.from("submissions").select("id, text_answer, files, capsules(title, task_prompt, resources, extras)").eq("id", submissionId).maybeSingle();
  const cap = s?.capsules as unknown as { title: string; task_prompt: string | null; resources: FileRef[] | null; extras: FileRef[] | null } | null;
  if (!s || !cap?.task_prompt) return { ok: false, message: "Entrega o tarea no encontrada." };
  await svc.from("submission_ai_reviews").upsert({ submission_id: s.id, status: "pending", error: null, updated_at: new Date().toISOString() });
  try {
    const materials: Block[] = [];
    for (const f of [...(cap.resources ?? []), ...(cap.extras ?? [])].slice(0, 4)) materials.push(...(await fileBlocks(svc, "content", f)));
    if (!materials.length) materials.push({ type: "text", text: "(El módulo no tiene materiales adjuntos: usa los criterios de la tarea.)" });
    const submission: Block[] = [{ type: "text", text: `Comentario del profesional: ${s.text_answer?.trim() || "(sin comentario)"}` }];
    const files = (s.files ?? []) as FileRef[];
    if (!files.length) submission.push({ type: "text", text: "(La entrega no tiene archivos adjuntos.)" });
    for (const f of files.slice(0, 5)) submission.push(...(await fileBlocks(svc, "submissions", f)));

    const { review, model } = await reviewSubmissionWithClaude({ moduleTitle: cap.title, taskPrompt: cap.task_prompt, materials, submission });
    await svc.from("submission_ai_reviews").upsert({
      submission_id: s.id,
      status: "done",
      score: review.score,
      threshold: review.threshold,
      verdict: suggestedVerdict(review),
      criteria: review.criteria,
      strengths: review.strengths,
      improvements: review.improvements,
      feedback: review.feedback,
      internal_note: review.readable ? review.internal_note : `No se pudo evaluar el contenido: ${review.internal_note}`,
      model,
      error: null,
      updated_at: new Date().toISOString(),
    });
    return { ok: true, message: "Propuesta lista." };
  } catch (e) {
    const message = aiErrorMessage(e);
    await svc.from("submission_ai_reviews").upsert({ submission_id: s.id, status: "error", error: message, updated_at: new Date().toISOString() });
    return { ok: false, message };
  }
}

/** Entregas por revisar de una Wave sin propuesta lista (o con una caída o con error). */
export async function pendingAiReviewIds(waveId: string, svc: Svc = supabaseService()): Promise<string[]> {
  const { data: subs } = await svc
    .from("submissions")
    .select("id, status, candidates!inner(wave_id), submission_ai_reviews(status, updated_at)")
    .eq("candidates.wave_id", waveId)
    .in("status", ["SUBMITTED", "HUMAN_REVIEW"]);
  return (subs ?? [])
    .filter((s) => {
      const r = (s.submission_ai_reviews as unknown as { status: string; updated_at: string }[] | { status: string; updated_at: string } | null);
      const row = Array.isArray(r) ? r[0] : r;
      if (!row) return true;
      if (row.status === "done") return false;
      return row.status === "error" || Date.now() - new Date(row.updated_at).getTime() > STALE_MS;
    })
    .map((s) => s.id);
}

/** Corre varias revisiones con concurrencia acotada (para no saturar la API). */
export async function runAiReviews(ids: string[], concurrency = 4): Promise<{ ok: number; failed: number }> {
  const svc = supabaseService();
  let ok = 0;
  let failed = 0;
  const queue = [...ids];
  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      for (let id = queue.shift(); id; id = queue.shift()) {
        const r = await aiReviewSubmission(id, svc);
        if (r.ok) ok++;
        else failed++;
      }
    }),
  );
  return { ok, failed };
}
