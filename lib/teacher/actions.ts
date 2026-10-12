"use server";

import { revalidatePath } from "next/cache";
import { supabaseUser } from "@/lib/supabase/server";
import { getViewer, SESSION_EXPIRED } from "@/lib/admission/auth";
import { todayChile, type ClassInput } from "./rules";

export type Result = { ok: boolean; message: string };
const fail = (e: unknown): Result => ({ ok: false, message: e instanceof Error ? e.message : String(e) });
const clean = (s: string) => s.trim() || null;

/** Guarda una clase con su asistencia. Queda visible de inmediato para Delivery y admin. */
export async function saveClass(input: ClassInput): Promise<Result> {
  try {
    const viewer = await getViewer();
    if (!viewer) throw new Error(SESSION_EXPIRED);
    if (viewer.role !== "profesor" && viewer.role !== "admin") throw new Error("Solo el profesor registra clases.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.heldOn)) throw new Error("Indica la fecha de la clase.");
    if (input.heldOn > todayChile()) throw new Error("No puedes registrar una clase futura.");
    if (!input.topic.trim()) throw new Error("Indica el tema abordado.");
    if (input.attendance.length === 0) throw new Error("Marca la asistencia.");
    const db = await supabaseUser();
    const row = {
      wave_id: input.waveId,
      held_on: input.heldOn,
      objective: clean(input.objective),
      topic: clean(input.topic),
      highlights: clean(input.highlights),
      next_steps: clean(input.nextSteps),
      comments: clean(input.comments),
    };
    const { data: cls, error } = input.id
      ? await db.from("teacher_classes").update(row).eq("id", input.id).select("id").single()
      : await db.from("teacher_classes").insert({ ...row, author: viewer.id }).select("id").single();
    if (error) {
      if (error.code === "23505") throw new Error("Ya registraste una clase en esa fecha. Ábrela desde la lista para editarla.");
      if (error.code === "42501" || error.code === "PGRST116") throw new Error("No estás asignado/a como profesor/a de esta Wave.");
      throw error;
    }
    const { error: e2 } = await db
      .from("teacher_class_attendance")
      .upsert(input.attendance.map((a) => ({ class_id: cls.id, candidate_id: a.candidateId, attended: a.attended })), { onConflict: "class_id,candidate_id" });
    if (e2) throw e2;
    revalidatePath(`/admin/profesor/${input.waveId}`);
    revalidatePath("/admin");
    const present = input.attendance.filter((a) => a.attended).length;
    return { ok: true, message: `Clase guardada · asistieron ${present} de ${input.attendance.length}.` };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteClass(waveId: string, classId: string): Promise<Result> {
  try {
    const viewer = await getViewer();
    if (!viewer || (viewer.role !== "profesor" && viewer.role !== "admin")) throw new Error("Sin permiso.");
    const { error } = await (await supabaseUser()).from("teacher_classes").delete().eq("id", classId);
    if (error) throw error;
    revalidatePath(`/admin/profesor/${waveId}`);
    revalidatePath("/admin");
    return { ok: true, message: "Clase eliminada." };
  } catch (e) {
    return fail(e);
  }
}
