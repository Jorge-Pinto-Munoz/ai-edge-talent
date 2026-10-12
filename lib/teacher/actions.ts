"use server";

import { revalidatePath } from "next/cache";
import { supabaseUser } from "@/lib/supabase/server";
import { getViewer } from "@/lib/admission/auth";
import { weekStart } from "@/lib/journey/rules";
import { TEACHER_FLAGS, TEACHER_STATUS, type TeacherEntry } from "./rules";

export type Result = { ok: boolean; message: string };
const fail = (e: unknown): Result => ({ ok: false, message: e instanceof Error ? e.message : String(e) });

/**
 * Guarda (o cierra) la semana del profesor: avance de cada participante, feedback general y casos
 * preocupantes o destacados. Una semana cerrada queda visible para Delivery y no se edita salvo que se reabra.
 */
export async function saveTeacherWeek(input: { waveId: string; week: string; entries: TeacherEntry[]; generalFeedback: string; close: boolean }): Promise<Result> {
  try {
    const viewer = await getViewer();
    if (!viewer || (viewer.role !== "profesor" && viewer.role !== "admin")) throw new Error("Solo el profesor registra el cierre semanal.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.week) || weekStart(new Date(`${input.week}T12:00:00Z`)) !== input.week) throw new Error("Semana no válida.");
    if (input.week > weekStart(new Date())) throw new Error("No puedes registrar semanas futuras.");
    for (const e of input.entries) {
      if (!TEACHER_STATUS.some((s) => s.id === e.status) || !TEACHER_FLAGS.some((f) => f.id === e.flag)) throw new Error("Valor no válido.");
      if (e.progress !== null && (!Number.isInteger(e.progress) || e.progress < 0 || e.progress > 100)) throw new Error("El avance va de 0 a 100.");
    }
    if (input.close) {
      if (!input.generalFeedback.trim()) throw new Error("Para cerrar la semana, deja el feedback general de la clase.");
      const missing = input.entries.filter((e) => e.flag !== "NONE" && !e.note.trim());
      if (missing.length) throw new Error("Explica en una nota cada caso marcado como preocupante o destacado.");
    }
    const db = await supabaseUser();
    const { data: existing } = await db.from("teacher_weekly_reports").select("id, closed_at").eq("wave_id", input.waveId).eq("week_start", input.week).eq("author", viewer.id).maybeSingle();
    if (existing?.closed_at) throw new Error("Esta semana ya está cerrada. Reábrela para editarla.");
    const { data: report, error } = await db
      .from("teacher_weekly_reports")
      .upsert(
        { wave_id: input.waveId, week_start: input.week, author: viewer.id, general_feedback: input.generalFeedback.trim() || null, closed_at: input.close ? new Date().toISOString() : null },
        { onConflict: "wave_id,week_start,author" },
      )
      .select("id")
      .single();
    if (error) throw new Error(error.code === "42501" ? "No estás asignado/a como profesor/a de esta Wave." : error.message);
    if (input.entries.length) {
      const { error: e2 } = await db.from("teacher_weekly_entries").upsert(
        input.entries.map((e) => ({
          report_id: report.id,
          candidate_id: e.candidateId,
          status: e.status,
          progress: e.progress,
          attended: e.attended,
          note: e.note.trim() || null,
          flag: e.flag,
        })),
        { onConflict: "report_id,candidate_id" },
      );
      if (e2) throw e2;
    }
    revalidatePath(`/admin/profesor/${input.waveId}`);
    revalidatePath("/admin");
    return { ok: true, message: input.close ? "Semana cerrada. Delivery ya puede ver el avance y los casos marcados." : "Borrador guardado." };
  } catch (e) {
    return fail(e);
  }
}

export async function reopenTeacherWeek(waveId: string, week: string): Promise<Result> {
  try {
    const viewer = await getViewer();
    if (!viewer || (viewer.role !== "profesor" && viewer.role !== "admin")) throw new Error("Sin permiso.");
    const db = await supabaseUser();
    const { error } = await db.from("teacher_weekly_reports").update({ closed_at: null }).eq("wave_id", waveId).eq("week_start", week).eq("author", viewer.id);
    if (error) throw error;
    revalidatePath(`/admin/profesor/${waveId}`);
    return { ok: true, message: "Semana reabierta." };
  } catch (e) {
    return fail(e);
  }
}
