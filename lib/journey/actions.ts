"use server";

import { revalidatePath } from "next/cache";
import { supabaseService, supabaseUser } from "@/lib/supabase/server";
import { getViewer, requireRole, type Viewer, SESSION_EXPIRED } from "@/lib/admission/auth";
import { advanceGate, safeFileName, submissionGate, weekStart, type Layer, type SubmissionStatus } from "./rules";

export type Result<T = undefined> = { ok: boolean; message: string; data?: T };
const fail = (e: unknown): Result<never> => ({ ok: false, message: e instanceof Error ? e.message : String(e) });

type Bucket = "content" | "submissions" | "certificates";
const MAX_UPLOAD_MB: Record<Bucket, number> = { content: 500, submissions: 50, certificates: 20 };

/* ───────── Participante actual ───────── */
async function requireParticipant(): Promise<{ viewer: Viewer; candidate: { id: string; wave_id: string; journey_layer: Layer | null; status: string } }> {
  const viewer = await getViewer();
  if (!viewer) throw new Error(SESSION_EXPIRED);
  const db = await supabaseUser();
  const { data } = await db
    .from("candidates")
    .select("id, wave_id, journey_layer, status")
    .eq("user_id", viewer.id)
    .in("status", ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("No encontramos una participación activa asociada a tu correo.");
  return { viewer, candidate: data as never };
}

/* ───────── Archivos: subida y descarga con URL firmada ───────── */
export async function requestUpload(bucket: Bucket, fileName: string, sizeBytes: number, waveId?: string): Promise<Result<{ path: string; token: string }>> {
  try {
    if (sizeBytes > MAX_UPLOAD_MB[bucket] * 1024 * 1024) return { ok: false, message: `El archivo supera ${MAX_UPLOAD_MB[bucket]} MB.` };
    let prefix: string;
    if (bucket === "content") {
      await requireRole(["admin"]);
      if (!waveId) throw new Error("Falta la Wave.");
      prefix = `${waveId}`;
    } else {
      const { candidate } = await requireParticipant();
      prefix = `${candidate.id}`;
    }
    const path = `${prefix}/${Date.now()}-${safeFileName(fileName)}`;
    const { data, error } = await supabaseService().storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data) throw new Error("No se pudo preparar la subida.");
    return { ok: true, message: "ok", data: { path, token: data.token } };
  } catch (e) {
    return fail(e);
  }
}

/** URL de descarga/visualización de 10 minutos, solo si quien la pide tiene derecho a ese archivo. */
export async function signedFileUrl(bucket: Bucket, path: string): Promise<Result<{ url: string }>> {
  try {
    const viewer = await getViewer();
    if (!viewer) throw new Error(SESSION_EXPIRED);
    const owner = path.split("/")[0];
    const db = await supabaseUser();
    let allowed = false;
    if (viewer.role === "admin" || viewer.role === "delivery") allowed = true;
    else if (bucket === "content") {
      // RLS: si puede leer una guía o cápsula de esa Wave, puede ver su contenido.
      const { count } = await db.from("capsules").select("id", { count: "exact", head: true }).eq("wave_id", owner);
      const { count: g } = await db.from("stage_guides").select("layer", { count: "exact", head: true }).eq("wave_id", owner);
      allowed = (count ?? 0) + (g ?? 0) > 0;
    } else {
      // RLS: el propio Kiber y los mentores de su grupo pueden leer al candidato.
      const { data } = await db.from("candidates").select("id").eq("id", owner).maybeSingle();
      allowed = Boolean(data);
    }
    if (!allowed) throw new Error("No tienes acceso a este archivo.");
    const { data, error } = await supabaseService().storage.from(bucket).createSignedUrl(path, 600);
    if (error || !data) throw new Error("Archivo no disponible.");
    return { ok: true, message: "ok", data: { url: data.signedUrl } };
  } catch (e) {
    return fail(e);
  }
}

/* ───────── Kiber ───────── */
export async function markCapsuleComplete(capsuleId: string, done: boolean): Promise<Result> {
  try {
    const { candidate } = await requireParticipant();
    const db = await supabaseUser();
    if (done) await db.from("capsule_progress").upsert({ candidate_id: candidate.id, capsule_id: capsuleId });
    else await db.from("capsule_progress").delete().eq("candidate_id", candidate.id).eq("capsule_id", capsuleId);
    revalidatePath("/mi-journey");
    return { ok: true, message: "ok" };
  } catch (e) {
    return fail(e);
  }
}

export async function submitTask(capsuleId: string, textAnswer: string, files: { name: string; path: string; size: number }[]): Promise<Result> {
  try {
    const { candidate } = await requireParticipant();
    const db = await supabaseUser();
    const { data: cap } = await db.from("capsules").select("id, wave_id, task_prompt, max_attempts").eq("id", capsuleId).single();
    if (!cap || cap.wave_id !== candidate.wave_id || !cap.task_prompt) throw new Error("Esta cápsula no tiene una tarea disponible.");
    if (!textAnswer.trim() && files.length === 0) throw new Error("Agrega una respuesta o un archivo.");
    if (files.some((f) => !f.path.startsWith(`${candidate.id}/`))) throw new Error("Archivo no válido.");
    const { data: prev } = await db.from("submissions").select("status").eq("candidate_id", candidate.id).eq("capsule_id", capsuleId).order("attempt");
    const gate = submissionGate((prev ?? []).map((p) => p.status as SubmissionStatus), cap.max_attempts);
    if (!gate.allowed) throw new Error(gate.reason);
    const { error } = await supabaseService().from("submissions").insert({
      candidate_id: candidate.id,
      capsule_id: capsuleId,
      attempt: gate.nextAttempt,
      text_answer: textAnswer.trim() || null,
      files,
    });
    if (error) throw error;
    revalidatePath("/mi-journey");
    return { ok: true, message: "Entrega recibida. Te avisaremos cuando esté revisada." };
  } catch (e) {
    return fail(e);
  }
}

export async function submitCertification(input: { result: "PASSED" | "FAILED"; issuedOn: string; credentialUrl: string; filePath: string | null }): Promise<Result> {
  try {
    const { candidate } = await requireParticipant();
    if (candidate.journey_layer !== "ROLE_ENABLEMENT") throw new Error("La certificación se registra durante Role Enablement.");
    if (input.filePath && !input.filePath.startsWith(`${candidate.id}/`)) throw new Error("Archivo no válido.");
    if (!input.filePath && !input.credentialUrl.trim()) throw new Error("Sube el certificado o agrega el enlace de la credencial.");
    const db = await supabaseUser();
    const { data: prev } = await db.from("certifications").select("result, status").eq("candidate_id", candidate.id);
    if ((prev ?? []).some((p) => p.status === "PENDING_REVIEW")) throw new Error("Tienes un registro pendiente de verificación.");
    const { error } = await supabaseService().from("certifications").insert({
      candidate_id: candidate.id,
      attempt: (prev ?? []).filter((p) => p.status !== "REJECTED").length + 1,
      result: input.result,
      issued_on: input.issuedOn || null,
      credential_url: input.credentialUrl.trim() || null,
      file_path: input.filePath,
    });
    if (error) throw error;
    revalidatePath("/mi-journey");
    return { ok: true, message: "Registro recibido. El equipo lo verificará." };
  } catch (e) {
    return fail(e);
  }
}

/* ───────── Admin: contenido ───────── */
export async function saveStageGuide(input: { waveId: string; layer: Layer; title: string; summary: string; whatHappens: string; whatWeExpect: string; videoUrl: string; videoPath: string | null }): Promise<Result> {
  try {
    await requireRole(["admin"]);
    const db = await supabaseUser();
    const { error } = await db.from("stage_guides").upsert({
      wave_id: input.waveId,
      layer: input.layer,
      title: input.title,
      summary: input.summary || null,
      what_happens: input.whatHappens || null,
      what_we_expect: input.whatWeExpect || null,
      video_url: input.videoUrl || null,
      video_path: input.videoPath,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    revalidatePath(`/admin/contenido/${input.waveId}`);
    return { ok: true, message: "Guía de etapa guardada." };
  } catch (e) {
    return fail(e);
  }
}

export interface CapsuleInput {
  id?: string;
  waveId: string;
  layer: Layer;
  position: number;
  title: string;
  description: string;
  durationMin: number | null;
  videoUrl: string;
  videoPath: string | null;
  resources: { name: string; path: string; size: number }[];
  taskPrompt: string;
  taskRequired: boolean;
  maxAttempts: number | null;
  dueDate: string;
  published: boolean;
}

export async function saveCapsule(c: CapsuleInput): Promise<Result> {
  try {
    await requireRole(["admin"]);
    if (!c.title.trim()) throw new Error("La cápsula necesita un título.");
    const db = await supabaseUser();
    const row = {
      wave_id: c.waveId,
      layer: c.layer,
      position: c.position,
      title: c.title.trim(),
      description: c.description || null,
      duration_min: c.durationMin,
      video_url: c.videoUrl || null,
      video_path: c.videoPath,
      resources: c.resources,
      task_prompt: c.taskPrompt.trim() || null,
      task_required: Boolean(c.taskPrompt.trim()) && c.taskRequired,
      max_attempts: c.maxAttempts,
      due_date: c.dueDate || null,
      published: c.published,
    };
    const { error } = c.id ? await db.from("capsules").update(row).eq("id", c.id) : await db.from("capsules").insert(row);
    if (error) throw error;
    revalidatePath(`/admin/contenido/${c.waveId}`);
    return { ok: true, message: c.id ? "Cápsula actualizada." : "Cápsula creada." };
  } catch (e) {
    return fail(e);
  }
}

/* ───────── Admin / Delivery: revisión ───────── */
export async function reviewSubmission(id: string, status: "APPROVED" | "NOT_APPROVED" | "HUMAN_REVIEW", score: number | null, feedback: string): Promise<Result> {
  try {
    const viewer = await requireRole(["admin", "delivery"]);
    const db = await supabaseUser();
    const { error } = await db
      .from("submissions")
      .update({ status, score, feedback: feedback || null, reviewed_by: viewer.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/journey", "layout");
    return { ok: true, message: "Revisión registrada." };
  } catch (e) {
    return fail(e);
  }
}

export async function reviewCertification(id: string, status: "VERIFIED" | "REJECTED", note: string): Promise<Result> {
  try {
    const viewer = await requireRole(["admin", "delivery"]);
    const db = await supabaseUser();
    const { error } = await db.from("certifications").update({ status, review_note: note || null, reviewed_by: viewer.id, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/journey", "layout");
    return { ok: true, message: status === "VERIFIED" ? "Certificación verificada." : "Registro rechazado." };
  } catch (e) {
    return fail(e);
  }
}

/* ───────── Admin: avance de capa (con gates; excepción explícita y registrada) ───────── */
export async function advanceLayer(waveId: string, candidateIds: string[], to: Layer, exceptionNote: string): Promise<Result<string[]>> {
  try {
    const viewer = await requireRole(["admin"]);
    const db = await supabaseUser();
    const { data: required } = await db.from("capsules").select("id").eq("wave_id", waveId).eq("layer", "AI_MINDSET").eq("task_required", true).eq("published", true);
    const details: string[] = [];
    let moved = 0;
    for (const id of candidateIds) {
      const { data: c } = await db.from("candidates").select("id, full_name, status, journey_layer").eq("id", id).single();
      if (!c) continue;
      const [{ data: subs }, { data: certs }] = await Promise.all([
        db.from("submissions").select("capsule_id, status").eq("candidate_id", id),
        db.from("certifications").select("result, status, created_at").eq("candidate_id", id).order("created_at", { ascending: false }),
      ]);
      const gate = advanceGate(c.journey_layer as Layer | null, to, {
        admissionStatus: c.status,
        requiredMindsetCapsules: (required ?? []).map((r) => r.id),
        approvedCapsules: (subs ?? []).filter((s) => s.status === "APPROVED").map((s) => s.capsule_id),
        certification: (certs ?? []).find((x) => x.status === "VERIFIED") ?? (certs ?? [])[0] ?? null,
      });
      const exception = !gate.ok;
      if (exception && !exceptionNote.trim()) {
        details.push(`${c.full_name}: ${gate.reason}`);
        continue;
      }
      const { error: e1 } = await db.from("journey_events").insert({ candidate_id: id, from_layer: c.journey_layer, to_layer: to, exception, note: exception ? exceptionNote : null, actor: viewer.id });
      if (e1) throw e1;
      const patch: Record<string, unknown> = { journey_layer: to, journey_layer_since: new Date().toISOString() };
      if (to === "AI_MINDSET" && c.status === "ENROLLED") patch.status = "MINDSET_READY";
      const { error: e2 } = await db.from("candidates").update(patch).eq("id", id);
      if (e2) throw e2;
      moved++;
    }
    revalidatePath(`/admin/journey/${waveId}`);
    return { ok: moved > 0, message: `${moved} persona(s) avanzaron a la nueva etapa.`, data: details };
  } catch (e) {
    return fail(e);
  }
}

/* ───────── Admin: grupos y mentores ───────── */
export async function createGroup(waveId: string, name: string): Promise<Result> {
  try {
    await requireRole(["admin"]);
    const db = await supabaseUser();
    const { error } = await db.from("wave_groups").insert({ wave_id: waveId, name: name.trim() });
    if (error) throw new Error(error.code === "23505" ? "Ya existe un grupo con ese nombre." : error.message);
    revalidatePath(`/admin/journey/${waveId}`);
    return { ok: true, message: "Grupo creado." };
  } catch (e) {
    return fail(e);
  }
}

export async function setGroupMembers(waveId: string, groupId: string, candidateIds: string[]): Promise<Result> {
  try {
    await requireRole(["admin"]);
    const db = await supabaseUser();
    await db.from("group_members").delete().eq("group_id", groupId);
    if (candidateIds.length) {
      const { error } = await db.from("group_members").insert(candidateIds.map((candidate_id) => ({ group_id: groupId, candidate_id })));
      if (error) throw error;
    }
    revalidatePath(`/admin/journey/${waveId}`);
    return { ok: true, message: `${candidateIds.length} persona(s) en el grupo.` };
  } catch (e) {
    return fail(e);
  }
}

export async function addGroupMentor(waveId: string, groupId: string, email: string): Promise<Result> {
  try {
    const viewer = await requireRole(["admin"]);
    const db = await supabaseUser();
    const e = email.trim().toLowerCase();
    const { data: profile } = await db.from("profiles").select("id, role").eq("email", e).maybeSingle();
    if (!profile) {
      await db.from("role_grants").upsert({ email: e, role: "mentor", granted_by: viewer.id });
      return { ok: false, message: `${e} quedó habilitado/a como mentor/a. Pídele que ingrese una vez en /login y luego asígnalo/a al grupo.` };
    }
    if (profile.role !== "mentor") await db.from("profiles").update({ role: "mentor" }).eq("id", profile.id);
    const { error } = await db.from("group_mentors").upsert({ group_id: groupId, mentor_id: profile.id });
    if (error) throw error;
    revalidatePath(`/admin/journey/${waveId}`);
    return { ok: true, message: `${e} asignado/a al grupo.` };
  } catch (e) {
    return fail(e);
  }
}

export async function removeGroupMentor(waveId: string, groupId: string, mentorId: string): Promise<Result> {
  try {
    await requireRole(["admin"]);
    const db = await supabaseUser();
    await db.from("group_mentors").delete().eq("group_id", groupId).eq("mentor_id", mentorId);
    revalidatePath(`/admin/journey/${waveId}`);
    return { ok: true, message: "Mentor/a quitado/a del grupo." };
  } catch (e) {
    return fail(e);
  }
}

/* ───────── Mentor: feedback semanal ───────── */
export interface FeedbackEntry {
  candidateId: string;
  attendance: "FULL" | "PARTIAL" | "NONE";
  progress: number;
  risk: "LOW" | "MEDIUM" | "HIGH";
  comment: string;
}

export async function saveWeeklyFeedback(groupId: string, entries: FeedbackEntry[], courseFeedback: string, blockers: string): Promise<Result> {
  try {
    const viewer = await getViewer();
    if (!viewer || viewer.role !== "mentor") throw new Error("Solo mentores registran feedback semanal.");
    const week = weekStart(new Date());
    const db = await supabaseUser();
    if (entries.length) {
      const { error } = await db.from("weekly_feedback").upsert(
        entries.map((e) => ({
          group_id: groupId,
          candidate_id: e.candidateId,
          mentor_id: viewer.id,
          week_start: week,
          attendance: e.attendance,
          progress: Math.min(5, Math.max(1, Math.round(e.progress))),
          risk: e.risk,
          comment: e.comment || null,
        })),
        { onConflict: "mentor_id,candidate_id,week_start" },
      );
      if (error) throw error;
    }
    if (!courseFeedback.trim()) throw new Error("Cuéntanos cómo va el curso/acompañamiento esta semana.");
    const { error: e2 } = await db
      .from("group_weekly_notes")
      .upsert({ group_id: groupId, mentor_id: viewer.id, week_start: week, course_feedback: courseFeedback.trim(), blockers: blockers.trim() || null }, { onConflict: "group_id,mentor_id,week_start" });
    if (e2) throw e2;
    revalidatePath("/mentor");
    return { ok: true, message: "Feedback de la semana guardado. Puedes editarlo hasta el domingo." };
  } catch (e) {
    return fail(e);
  }
}
