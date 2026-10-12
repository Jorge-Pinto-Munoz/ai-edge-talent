"use server";

import { revalidatePath } from "next/cache";
import { supabaseUser } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admission/auth";
import type { AiCertCourse } from "./progress";

export type Result = { ok: boolean; message: string };
export interface AiCertInput {
  candidateId: string;
  waveId: string;
  introCourse: string;
  specialistCourse: string;
  course: AiCertCourse;
  tramo: number;
  percent: number;
  examDate: string;
  note: string;
}

/** Actualiza la ruta y el avance por tramo de un participante. Solo el líder del programa (admin). */
export async function saveAiCertProgress(input: AiCertInput): Promise<Result> {
  try {
    const viewer = await requireRole(["admin"]);
    const tramo = Math.round(Number(input.tramo));
    const percent = Math.round(Number(input.percent));
    if (!(tramo >= 0 && tramo <= 5)) throw new Error("El tramo va de 0 a 5.");
    if (!(percent >= 0 && percent <= 100)) throw new Error("El porcentaje va de 0 a 100.");
    if (input.course !== "INTRO" && input.course !== "SPECIALIST") throw new Error("Elige el curso.");
    if (input.examDate && !/^\d{4}-\d{2}-\d{2}$/.test(input.examDate)) throw new Error("Revisa la fecha de examen.");
    const db = await supabaseUser();
    const { error } = await db.from("aicert_progress").upsert({
      candidate_id: input.candidateId,
      intro_course: input.introCourse.trim().slice(0, 120) || null,
      specialist_course: input.specialistCourse.trim().slice(0, 120) || null,
      course: input.course,
      tramo,
      percent,
      exam_date: input.examDate || null,
      note: input.note.trim().slice(0, 500) || null,
      updated_at: new Date().toISOString(),
      updated_by: viewer.id,
    });
    if (error) throw error;
    revalidatePath(`/admin/journey/${input.waveId}`);
    revalidatePath(`/admin/pulsos/${input.waveId}`);
    return { ok: true, message: "Avance guardado." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
