import "server-only";
import { supabaseService } from "@/lib/supabase/server";
import { RE_SESSIONS, type Focus, type SessionFile } from "./sessions-rules";

export interface WaveSession {
  n: number;
  heldOn: string | null;
  title: string | null;
  studentNotes: string | null;
  materials: SessionFile[];
  updatedAt: string | null;
  /** Solo admin y profesor. */
  adminComments: string | null;
  attendance: { candidateId: string; attended: boolean; focus: Focus; note: string | null }[];
  checkins: { candidateId: string; note: string | null; at: string }[];
}

/**
 * Las 4 sesiones de una Wave con todo lo que registró el profesor (lectura con la llave de servicio:
 * quien llama ya validó que es admin o profesor de la Wave, o recibe solo la parte pública).
 */
export async function waveSessions(waveId: string, opts: { private: boolean }): Promise<WaveSession[]> {
  const svc = supabaseService();
  const [{ data: rows }, { data: priv }, { data: att }, { data: chk }] = await Promise.all([
    svc.from("re_sessions").select("n, held_on, title, student_notes, materials, updated_at").eq("wave_id", waveId),
    opts.private ? svc.from("re_session_private").select("n, admin_comments").eq("wave_id", waveId) : Promise.resolve({ data: [] as { n: number; admin_comments: string | null }[] }),
    opts.private ? svc.from("re_session_attendance").select("n, candidate_id, attended, focus, note").eq("wave_id", waveId) : Promise.resolve({ data: [] as { n: number; candidate_id: string; attended: boolean; focus: Focus; note: string | null }[] }),
    svc.from("re_session_checkins").select("n, candidate_id, note, created_at").eq("wave_id", waveId),
  ]);
  return RE_SESSIONS.map((n) => {
    const r = (rows ?? []).find((x) => x.n === n);
    return {
      n,
      heldOn: r?.held_on ?? null,
      title: r?.title ?? null,
      studentNotes: r?.student_notes ?? null,
      materials: ((r?.materials ?? []) as SessionFile[]).filter((m) => m?.path),
      updatedAt: r?.updated_at ?? null,
      adminComments: (priv ?? []).find((x) => x.n === n)?.admin_comments ?? null,
      attendance: (att ?? []).filter((x) => x.n === n).map((x) => ({ candidateId: x.candidate_id, attended: x.attended, focus: x.focus as Focus, note: x.note })),
      checkins: (chk ?? []).filter((x) => x.n === n).map((x) => ({ candidateId: x.candidate_id, note: x.note, at: x.created_at })),
    };
  });
}

/** Lo que ve el profesional de cada sesión: lo público, su check-in y su asistencia (sin notas privadas). */
export interface MySession { n: number; heldOn: string | null; title: string | null; studentNotes: string | null; materials: SessionFile[]; checkedInAt: string | null; attended: boolean | null }
export async function mySessions(waveId: string, candidateId: string): Promise<MySession[]> {
  const svc = supabaseService();
  const [{ data: rows }, { data: att }, { data: chk }] = await Promise.all([
    svc.from("re_sessions").select("n, held_on, title, student_notes, materials").eq("wave_id", waveId),
    svc.from("re_session_attendance").select("n, attended").eq("wave_id", waveId).eq("candidate_id", candidateId),
    svc.from("re_session_checkins").select("n, created_at").eq("wave_id", waveId).eq("candidate_id", candidateId),
  ]);
  return RE_SESSIONS.map((n) => {
    const r = (rows ?? []).find((x) => x.n === n);
    return {
      n,
      heldOn: r?.held_on ?? null,
      title: r?.title ?? null,
      studentNotes: r?.student_notes ?? null,
      materials: ((r?.materials ?? []) as SessionFile[]).filter((m) => m?.path),
      checkedInAt: (chk ?? []).find((x) => x.n === n)?.created_at ?? null,
      attended: (att ?? []).find((x) => x.n === n)?.attended ?? null,
    };
  });
}
