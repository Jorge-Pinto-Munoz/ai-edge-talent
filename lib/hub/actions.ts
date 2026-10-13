"use server";

import { revalidatePath } from "next/cache";
import { supabaseService, supabaseUser } from "@/lib/supabase/server";
import { getViewer, myStaffWaves, type Viewer, SESSION_EXPIRED } from "@/lib/admission/auth";
import { advanceGate, safeFileName, type Layer } from "@/lib/journey/rules";
import { LAB_DECISIONS, LAB_STATUS, type LabDecision, type LabMode, type LabStatus } from "./rules";
import { syncMany } from "@/lib/journey/closure-sync";

/** Integrantes de un proyecto: al presentarse en el Showcase se habilita su pulso de cierre. */
async function syncProject(projectId: string, actor: string) {
  const { data } = await supabaseService().from("lab_project_members").select("candidate_id").eq("project_id", projectId);
  await syncMany((data ?? []).map((m) => m.candidate_id), actor);
}

export type Result<T = undefined> = { ok: boolean; message: string; data?: T };
const fail = (e: unknown): Result<never> => ({ ok: false, message: e instanceof Error ? e.message : String(e) });
const MAX_LAB_MB = 100;

/** Admin, o líder del Hub AI asignado a esta Wave. */
async function requireHub(waveId: string): Promise<Viewer> {
  const v = await getViewer();
  if (!v) throw new Error(SESSION_EXPIRED);
  if (v.role === "admin") return v;
  if (v.role === "hub" && (await myStaffWaves(v)).includes(waveId)) return v;
  throw new Error("Solo el líder del Hub AI de esta Wave puede hacer esto.");
}

async function projectWave(projectId: string): Promise<string> {
  const { data } = await supabaseService().from("lab_projects").select("wave_id").eq("id", projectId).maybeSingle();
  if (!data) throw new Error("Proyecto no encontrado.");
  return data.wave_id;
}

const done = (waveId: string) => {
  revalidatePath(`/admin/lab/${waveId}`);
  revalidatePath("/mi-journey");
};

/* ───────── Pase al Lab: gate = AI CERT aprobada y verificada ───────── */
export async function passToLab(waveId: string, candidateIds: string[]): Promise<Result<string[]>> {
  try {
    const viewer = await requireHub(waveId);
    const svc = supabaseService();
    const details: string[] = [];
    let moved = 0;
    for (const id of candidateIds) {
      const { data: c } = await svc.from("candidates").select("id, wave_id, full_name, status, journey_layer").eq("id", id).maybeSingle();
      if (!c || c.wave_id !== waveId) continue;
      const { data: certs } = await svc.from("certifications").select("result, status, created_at").eq("candidate_id", id).order("created_at", { ascending: false });
      const gate = advanceGate(c.journey_layer as Layer | null, "AI_LAB_SHOWCASE", {
        admissionStatus: c.status,
        requiredMindsetCapsules: [],
        approvedCapsules: [],
        certification: (certs ?? []).find((x) => x.status === "VERIFIED") ?? (certs ?? [])[0] ?? null,
      });
      // El Hub no concede excepciones: esas las registra el Product Lead desde Journey.
      if (!gate.ok) {
        details.push(`${c.full_name}: ${gate.reason}`);
        continue;
      }
      // Role Enablement se cierra con su pulso: sin él, la persona no avanza (y si ya respondió, avanzó sola).
      if (c.journey_layer === "ROLE_ENABLEMENT") {
        const { data: p } = await svc.from("pulse_responses").select("pulse").eq("candidate_id", id).eq("pulse", "HAB_CIERRE").maybeSingle();
        if (!p) {
          await syncMany([id], viewer.id);
          details.push(`${c.full_name}: falta su pulso de cierre de Role Enablement (ya está habilitado en su journey).`);
          continue;
        }
      }
      const { error: e1 } = await svc.from("journey_events").insert({ candidate_id: id, from_layer: c.journey_layer, to_layer: "AI_LAB_SHOWCASE", exception: false, actor: viewer.id });
      if (e1) throw e1;
      const { error: e2 } = await svc.from("candidates").update({ journey_layer: "AI_LAB_SHOWCASE", journey_layer_since: new Date().toISOString() }).eq("id", id);
      if (e2) throw e2;
      moved++;
    }
    done(waveId);
    revalidatePath(`/admin/journey/${waveId}`);
    return { ok: moved > 0 || candidateIds.length === 0, message: `${moved} persona(s) pasaron a AI Lab & Showcase.`, data: details };
  } catch (e) {
    return fail(e);
  }
}

/* ───────── Clases del Lab ───────── */
export async function saveLabSession(input: { waveId: string; n: 1 | 2; heldOn: string; notes: string; entries: { projectId: string; attended: boolean | null; note: string }[] }): Promise<Result> {
  try {
    const viewer = await requireHub(input.waveId);
    if (input.n !== 1 && input.n !== 2) throw new Error("El Lab tiene dos clases.");
    const db = await supabaseUser();
    const { data: s, error } = await db
      .from("lab_sessions")
      .upsert({ wave_id: input.waveId, n: input.n, held_on: input.heldOn || null, notes: input.notes.trim() || null, created_by: viewer.id, updated_at: new Date().toISOString() }, { onConflict: "wave_id,n" })
      .select("id")
      .single();
    if (error) throw error;
    if (input.entries.length) {
      const { error: e2 } = await db
        .from("lab_session_entries")
        .upsert(input.entries.map((e) => ({ session_id: s.id, project_id: e.projectId, attended: e.attended, note: e.note.trim() || null })), { onConflict: "session_id,project_id" });
      if (e2) throw e2;
    }
    done(input.waveId);
    return { ok: true, message: `Clase ${input.n} guardada.` };
  } catch (e) {
    return fail(e);
  }
}

/* ───────── Proyectos (individuales o grupales) ───────── */
export async function saveLabProject(input: {
  id?: string;
  waveId: string;
  title: string;
  problem: string;
  clientName: string;
  mode: LabMode;
  status: LabStatus;
  hubNotes: string;
  memberIds: string[];
}): Promise<Result<{ id: string }>> {
  try {
    const viewer = await requireHub(input.waveId);
    if (!input.title.trim()) throw new Error("El proyecto necesita un nombre.");
    if (!LAB_STATUS.some((s) => s.id === input.status)) throw new Error("Estado no válido.");
    if (input.memberIds.length === 0) throw new Error("Agrega al menos una persona.");
    if (input.mode === "INDIVIDUAL" && input.memberIds.length > 1) throw new Error("Un proyecto individual tiene una sola persona. Usa modo grupal.");
    const svc = supabaseService();
    const { data: members } = await svc.from("candidates").select("id, wave_id, journey_layer, full_name").in("id", input.memberIds);
    const bad = (members ?? []).filter((m) => m.wave_id !== input.waveId || m.journey_layer !== "AI_LAB_SHOWCASE");
    if (bad.length || (members ?? []).length !== input.memberIds.length) throw new Error(`Solo participantes que ya pasaron al Lab${bad.length ? `: revisa ${bad.map((b) => b.full_name).join(", ")}` : ""}.`);
    const { data: taken } = await svc.from("lab_project_members").select("candidate_id, project_id").in("candidate_id", input.memberIds);
    const clash = (taken ?? []).filter((t) => t.project_id !== input.id);
    if (clash.length) throw new Error(`${(members ?? []).filter((m) => clash.some((c) => c.candidate_id === m.id)).map((m) => m.full_name).join(", ")} ya está en otro proyecto.`);

    const db = await supabaseUser();
    const row = {
      wave_id: input.waveId,
      title: input.title.trim(),
      problem: input.problem.trim() || null,
      client_name: input.clientName.trim() || null,
      mode: input.mode,
      status: input.status,
      hub_notes: input.hubNotes.trim() || null,
    };
    const { data: p, error } = input.id
      ? await db.from("lab_projects").update(row).eq("id", input.id).eq("wave_id", input.waveId).select("id").single()
      : await db.from("lab_projects").insert({ ...row, created_by: viewer.id }).select("id").single();
    if (error) throw error;
    await db.from("lab_project_members").delete().eq("project_id", p.id);
    const { error: e2 } = await db.from("lab_project_members").insert(input.memberIds.map((candidate_id) => ({ project_id: p.id, candidate_id })));
    if (e2) throw e2;
    await syncMany(input.memberIds, viewer.id);
    done(input.waveId);
    return { ok: true, message: input.id ? "Proyecto actualizado." : "Proyecto creado.", data: { id: p.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteLabProject(projectId: string): Promise<Result> {
  try {
    const waveId = await projectWave(projectId);
    await requireHub(waveId);
    const svc = supabaseService();
    const { data: files } = await svc.from("lab_project_files").select("path").eq("project_id", projectId);
    if (files?.length) await svc.storage.from("lab").remove(files.map((f) => f.path));
    const { error } = await (await supabaseUser()).from("lab_projects").delete().eq("id", projectId);
    if (error) throw error;
    done(waveId);
    return { ok: true, message: "Proyecto eliminado." };
  } catch (e) {
    return fail(e);
  }
}

/* ───────── Showcase ───────── */
export async function saveShowcase(projectId: string, input: { date: string; decision: LabDecision | ""; notes: string }): Promise<Result> {
  try {
    const waveId = await projectWave(projectId);
    const viewer = await requireHub(waveId);
    if (input.decision && !LAB_DECISIONS.some((d) => d.id === input.decision)) throw new Error("Decisión no válida.");
    const patch: Record<string, unknown> = { showcase_date: input.date || null, showcase_decision: input.decision || null, showcase_notes: input.notes.trim() || null };
    if (input.decision) patch.status = "PRESENTED";
    const { error } = await (await supabaseUser()).from("lab_projects").update(patch).eq("id", projectId);
    if (error) throw error;
    if (input.decision) await syncProject(projectId, viewer.id);
    done(waveId);
    return { ok: true, message: input.decision ? "Resultado del Showcase registrado." : "Showcase guardado." };
  } catch (e) {
    return fail(e);
  }
}

/* ───────── Presentaciones: suben integrantes o el Hub; descargan Hub, equipo interno e integrantes ───────── */
async function canUpload(projectId: string): Promise<{ viewer: Viewer; waveId: string }> {
  const viewer = await getViewer();
  if (!viewer) throw new Error(SESSION_EXPIRED);
  const waveId = await projectWave(projectId);
  if (viewer.role === "admin" || viewer.role === "hub") return { viewer: await requireHub(waveId), waveId };
  // RLS: el Kiber solo ve el proyecto si es integrante.
  const { data } = await (await supabaseUser()).from("lab_projects").select("id").eq("id", projectId).maybeSingle();
  if (viewer.role !== "kiber" || !data) throw new Error("Solo integrantes del proyecto o el Hub suben presentaciones.");
  return { viewer, waveId };
}

export async function requestLabUpload(projectId: string, fileName: string, sizeBytes: number): Promise<Result<{ path: string; token: string }>> {
  try {
    if (sizeBytes > MAX_LAB_MB * 1024 * 1024) throw new Error(`El archivo supera ${MAX_LAB_MB} MB.`);
    await canUpload(projectId);
    const path = `${projectId}/${Date.now()}-${safeFileName(fileName)}`;
    const { data, error } = await supabaseService().storage.from("lab").createSignedUploadUrl(path);
    if (error || !data) throw new Error("No se pudo preparar la subida.");
    return { ok: true, message: "ok", data: { path, token: data.token } };
  } catch (e) {
    return fail(e);
  }
}

export async function registerLabFile(projectId: string, file: { path: string; name: string; size: number }): Promise<Result> {
  try {
    const { viewer, waveId } = await canUpload(projectId);
    if (!file.path.startsWith(`${projectId}/`)) throw new Error("Archivo no válido.");
    const ext = file.name.toLowerCase().split(".").pop() ?? "";
    const kind = ["ppt", "pptx", "key", "pdf", "odp"].includes(ext) ? "PRESENTATION" : "OTHER";
    const { error } = await supabaseService().from("lab_project_files").insert({ project_id: projectId, path: file.path, name: file.name.slice(0, 200), size_bytes: file.size, kind, uploaded_by: viewer.id });
    if (error) throw error;
    done(waveId);
    return { ok: true, message: "Archivo subido." };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteLabFile(fileId: string): Promise<Result> {
  try {
    const svc = supabaseService();
    const { data: f } = await svc.from("lab_project_files").select("id, project_id, path, uploaded_by").eq("id", fileId).maybeSingle();
    if (!f) throw new Error("Archivo no encontrado.");
    const { viewer, waveId } = await canUpload(f.project_id);
    if (viewer.role === "kiber" && f.uploaded_by !== viewer.id) throw new Error("Solo puedes quitar archivos que subiste tú.");
    await svc.storage.from("lab").remove([f.path]);
    await svc.from("lab_project_files").delete().eq("id", fileId);
    done(waveId);
    return { ok: true, message: "Archivo quitado." };
  } catch (e) {
    return fail(e);
  }
}

/** Descarga de 10 minutos, solo si RLS deja ver el registro del archivo. */
export async function labFileUrl(fileId: string): Promise<Result<{ url: string }>> {
  try {
    const { data: f } = await (await supabaseUser()).from("lab_project_files").select("path, name").eq("id", fileId).maybeSingle();
    if (!f) throw new Error("No tienes acceso a este archivo.");
    const { data, error } = await supabaseService().storage.from("lab").createSignedUrl(f.path, 600, { download: f.name });
    if (error || !data) throw new Error("Archivo no disponible.");
    return { ok: true, message: "ok", data: { url: data.signedUrl } };
  } catch (e) {
    return fail(e);
  }
}
