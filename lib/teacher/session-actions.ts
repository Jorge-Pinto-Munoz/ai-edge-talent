"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getViewer, myStaffWaves, SESSION_EXPIRED, type Viewer } from "@/lib/admission/auth";
import { safeFileName } from "@/lib/journey/rules";
import { audit } from "@/lib/identity/service";
import { DEMO_READONLY, isDemoEmail } from "@/lib/identity/demo";
import { errorText } from "@/lib/text/errors";
import { todayChile } from "./rules";
import { RE_SESSIONS, cleanSelfProgress, cleanSession, type SessionInput, type SessionN } from "./sessions-rules";

export type Result<T = undefined> = { ok: boolean; message: string; data?: T };
const fail = (e: unknown): Result<never> => ({ ok: false, message: errorText(e) });
const MAX_MB = 100;

/** Admin, o profesor asignado a esta Wave. */
async function requireTeacher(waveId: string): Promise<Viewer> {
  const v = await getViewer();
  if (!v) throw new Error(SESSION_EXPIRED);
  if (v.role === "admin") return v;
  if (v.role === "profesor" && (await myStaffWaves(v)).includes(waveId)) return v;
  throw new Error("Solo el profesor de esta Wave (o un admin) registra las sesiones.");
}

const refresh = (waveId: string) => {
  revalidatePath(`/admin/journey/${waveId}`, "layout");
  revalidatePath(`/admin/profesor/${waveId}`);
  revalidatePath("/mi-journey");
};

/** Subida de material de una sesión (bucket privado `content`, bajo la carpeta de la Wave). */
export async function requestSessionUpload(waveId: string, n: number, fileName: string, sizeBytes: number): Promise<Result<{ path: string; token: string }>> {
  try {
    await requireTeacher(waveId);
    if (!RE_SESSIONS.includes(n as SessionN)) throw new Error("Sesión no válida.");
    if (sizeBytes > MAX_MB * 1024 * 1024) throw new Error(`El archivo supera ${MAX_MB} MB.`);
    const path = `${waveId}/sesiones/${n}/${Date.now()}-${safeFileName(fileName)}`;
    const { data, error } = await supabaseService().storage.from("content").createSignedUploadUrl(path);
    if (error || !data) throw new Error("No se pudo preparar la subida.");
    return { ok: true, message: "ok", data: { path, token: data.token } };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Guarda una sesión: lo que ven los profesionales (fecha, tema, notas, material), los comentarios para el admin
 * y la asistencia con la concentración observada (privadas).
 */
export async function saveReSession(raw: SessionInput): Promise<Result> {
  try {
    const viewer = await requireTeacher(raw.waveId);
    const x = cleanSession(raw, todayChile());
    if (x.materials.some((m) => !m.path.startsWith(`${x.waveId}/sesiones/`))) throw new Error("Archivo no válido.");
    const svc = supabaseService();
    const now = new Date().toISOString();
    const { data: prev } = await svc.from("re_sessions").select("materials").eq("wave_id", x.waveId).eq("n", x.n).maybeSingle();
    const { error } = await svc.from("re_sessions").upsert({ wave_id: x.waveId, n: x.n, held_on: x.heldOn || null, title: x.title || null, student_notes: x.studentNotes || null, materials: x.materials, updated_by: viewer.id, updated_at: now });
    if (error) throw error;
    const { error: e2 } = await svc.from("re_session_private").upsert({ wave_id: x.waveId, n: x.n, admin_comments: x.adminComments || null, updated_by: viewer.id, updated_at: now });
    if (e2) throw e2;
    if (x.attendance.length) {
      const ids = x.attendance.map((a) => a.candidateId);
      const { data: ok } = await svc.from("candidates").select("id").eq("wave_id", x.waveId).in("id", ids);
      if ((ok ?? []).length !== new Set(ids).size) throw new Error("Hay personas que no son de esta Wave.");
      const { error: e3 } = await svc.from("re_session_attendance").upsert(
        x.attendance.map((a) => ({ wave_id: x.waveId, n: x.n, candidate_id: a.candidateId, attended: a.attended, focus: a.focus, note: a.note || null, updated_at: now })),
      );
      if (e3) throw e3;
    }
    // Archivos que se quitaron de la sesión: se borran del bucket.
    const gone = ((prev?.materials ?? []) as { path: string }[]).filter((m) => m?.path && !x.materials.some((k) => k.path === m.path)).map((m) => m.path);
    if (gone.length) await svc.storage.from("content").remove(gone);
    await audit("re_session.saved", { actor: viewer.id, waveId: x.waveId, details: { n: x.n, attendance: x.attendance.length, materials: x.materials.length } }, svc);
    refresh(x.waveId);
    return { ok: true, message: `Sesión ${x.n} guardada.` };
  } catch (e) {
    return fail(e);
  }
}

/* ───────── Profesional ───────── */
async function myCandidate() {
  const viewer = await getViewer();
  if (!viewer) throw new Error(SESSION_EXPIRED);
  if (isDemoEmail(viewer.email)) throw new Error(DEMO_READONLY);
  const { data } = await supabaseService()
    .from("candidates")
    .select("id, wave_id, journey_layer")
    .eq("user_id", viewer.id)
    .in("status", ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("No encontramos tu participación activa.");
  return { viewer, c: data };
}

/** «Fui a la sesión»: check-in del profesional. No es la asistencia oficial (esa la marca el profesor). */
export async function checkInSession(n: number, note = ""): Promise<Result> {
  try {
    const { viewer, c } = await myCandidate();
    if (c.journey_layer !== "ROLE_ENABLEMENT") throw new Error("El check-in de sesiones es de Role Enablement.");
    if (!RE_SESSIONS.includes(n as SessionN)) throw new Error("Sesión no válida.");
    const svc = supabaseService();
    const { error } = await svc.from("re_session_checkins").upsert({ wave_id: c.wave_id, n, candidate_id: c.id, note: note.trim().slice(0, 300) || null }, { onConflict: "wave_id,n,candidate_id", ignoreDuplicates: true });
    if (error) throw error;
    await audit("re_session.checkin", { actor: viewer.id, candidateId: c.id, waveId: c.wave_id, details: { n }, eventKey: `re-checkin:${c.id}:${n}` }, svc);
    revalidatePath("/mi-journey");
    revalidatePath(`/admin/journey/${c.wave_id}`, "layout");
    return { ok: true, message: `Check-in de la Sesión ${n} registrado.` };
  } catch (e) {
    return fail(e);
  }
}

/** El profesional reporta su avance en la plataforma AI CERT (queda marcado como «reportado por el profesional»). */
export async function reportMyAicertProgress(input: { course: string; tramo: number; percent: number; note: string }): Promise<Result> {
  try {
    const { viewer, c } = await myCandidate();
    if (c.journey_layer !== "ROLE_ENABLEMENT") throw new Error("El avance AI CERT se reporta durante Role Enablement.");
    const x = cleanSelfProgress(input);
    const now = new Date().toISOString();
    const svc = supabaseService();
    const { error } = await svc.from("aicert_progress").upsert({ candidate_id: c.id, course: x.course, tramo: x.tramo, percent: x.percent, note: x.note, updated_at: now, updated_by: viewer.id, self_reported_at: now });
    if (error) throw error;
    await audit("aicert.self_reported", { actor: viewer.id, candidateId: c.id, waveId: c.wave_id, details: { course: x.course, tramo: x.tramo, percent: x.percent } }, svc);
    revalidatePath("/mi-journey");
    revalidatePath(`/admin/journey/${c.wave_id}`, "layout");
    return { ok: true, message: "Avance guardado. Tu Delivery y el equipo lo verán en tu seguimiento." };
  } catch (e) {
    return fail(e);
  }
}
