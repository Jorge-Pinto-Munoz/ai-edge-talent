"use server";

import { revalidatePath } from "next/cache";
import { supabaseUser } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admission/auth";
import { followUpDates, parseHistoricalCsv, specialtyFamily, type ServiceStatus } from "./rules";

export type TalentResult = { ok: boolean; message: string; details?: string[] };
const fail = (e: unknown): TalentResult => ({ ok: false, message: e instanceof Error ? e.message : String(e) });

export async function updateServiceStatus(talentId: string, status: ServiceStatus, since: string, reason: string): Promise<TalentResult> {
  try {
    await requireRole(["admin", "delivery"]);
    if (status === "LEFT" && !reason.trim()) throw new Error("Indica el motivo de salida.");
    const db = await supabaseUser();
    const { error } = await db
      .from("talent")
      .update({ service_status: status, service_status_since: since || new Date().toISOString().slice(0, 10), left_reason: status === "LEFT" ? reason.trim() : reason.trim() || null })
      .eq("id", talentId);
    if (error) throw error;
    revalidatePath("/admin/talento", "layout");
    return { ok: true, message: "Estado de servicio actualizado (queda en el historial)." };
  } catch (e) {
    return fail(e);
  }
}

export async function setHighTalent(talentId: string, flag: boolean, reason: string): Promise<TalentResult> {
  try {
    const viewer = await requireRole(["admin"]);
    if (flag && !reason.trim()) throw new Error("Indica por qué es High Talent (evidencia).");
    const db = await supabaseUser();
    const { error } = await db
      .from("talent")
      .update({ high_talent: flag, high_talent_reason: flag ? reason.trim() : null, high_talent_by: flag ? viewer.id : null, high_talent_at: flag ? new Date().toISOString() : null })
      .eq("id", talentId);
    if (error) throw error;
    revalidatePath("/admin/talento", "layout");
    return { ok: true, message: flag ? "Marcado/a como High Talent." : "High Talent retirado." };
  } catch (e) {
    return fail(e);
  }
}

export async function updateTalentProfile(talentId: string, input: { specialty: string; family: string; client: string; role: string; notes: string }): Promise<TalentResult> {
  try {
    await requireRole(["admin", "delivery"]);
    const db = await supabaseUser();
    const { error } = await db
      .from("talent")
      .update({
        specialty: input.specialty || null,
        specialty_family: input.family || specialtyFamily(input.specialty) || null,
        current_client: input.client || null,
        role_title: input.role || null,
        notes: input.notes || null,
      })
      .eq("id", talentId);
    if (error) throw error;
    revalidatePath("/admin/talento", "layout");
    return { ok: true, message: "Ficha actualizada." };
  } catch (e) {
    return fail(e);
  }
}

/** Programa Mes 1 y Mes 3 desde la fecha base (p.ej. cierre de la Wave o del Showcase). */
export async function scheduleFollowUps(talentId: string, waveId: string, baseDate: string): Promise<TalentResult> {
  try {
    await requireRole(["admin", "delivery"]);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(baseDate)) throw new Error("Fecha base inválida (AAAA-MM-DD).");
    const d = followUpDates(baseDate);
    const db = await supabaseUser();
    const { error } = await db.from("follow_ups").upsert(
      [
        { talent_id: talentId, wave_id: waveId, kind: "MONTH_1", due_date: d.MONTH_1 },
        { talent_id: talentId, wave_id: waveId, kind: "MONTH_3", due_date: d.MONTH_3 },
      ],
      { onConflict: "talent_id,wave_id,kind", ignoreDuplicates: true },
    );
    if (error) throw error;
    revalidatePath("/admin/talento", "layout");
    return { ok: true, message: `Seguimientos programados: Mes 1 (${d.MONTH_1}) y Mes 3 (${d.MONTH_3}).` };
  } catch (e) {
    return fail(e);
  }
}

export async function recordFollowUp(id: string, input: { adoption: number; stillUsingAi: boolean; impact: string; clientPerception: string; nextStep: string }): Promise<TalentResult> {
  try {
    const viewer = await requireRole(["admin", "delivery"]);
    const db = await supabaseUser();
    const { error } = await db
      .from("follow_ups")
      .update({
        done_at: new Date().toISOString(),
        adoption: Math.min(5, Math.max(1, Math.round(input.adoption))),
        still_using_ai: input.stillUsingAi,
        impact: input.impact || null,
        client_perception: input.clientPerception || null,
        next_step: input.nextStep || null,
        recorded_by: viewer.id,
      })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/talento", "layout");
    return { ok: true, message: "Seguimiento registrado." };
  } catch (e) {
    return fail(e);
  }
}

/** Carga participantes de Waves pasadas para darles seguimiento. */
export async function importHistorical(csvText: string): Promise<TalentResult> {
  try {
    await requireRole(["admin"]);
    const { rows, errors } = parseHistoricalCsv(csvText);
    if (!rows.length) return { ok: false, message: "No hay filas válidas.", details: errors };
    const db = await supabaseUser();
    const { data: waves } = await db.from("waves").select("id");
    const known = new Set((waves ?? []).map((w) => w.id));
    const details = [...errors];
    let created = 0;
    for (const r of rows) {
      if (!known.has(r.wave_id)) {
        details.push(`${r.corporate_email}: la ${r.wave_id} no existe en la plataforma.`);
        continue;
      }
      const { data: exists } = await db.from("candidates").select("id").eq("wave_id", r.wave_id).ilike("corporate_email", r.corporate_email).maybeSingle();
      if (!exists) {
        const { error } = await db.from("candidates").insert({
          wave_id: r.wave_id,
          full_name: r.full_name,
          corporate_email: r.corporate_email,
          client_name: r.client_name,
          role_title: r.role_title,
          specialty: r.specialty,
          source: "historical",
          status: "ENROLLED",
          journey_layer: r.completed ? "CLOSURE" : null,
        });
        if (error) {
          details.push(`${r.corporate_email}: ${error.message}`);
          continue;
        }
        created++;
      }
      await db.from("talent").update({ service_status: r.service_status }).eq("email", r.corporate_email);
    }
    revalidatePath("/admin/talento", "layout");
    return { ok: true, message: `${created} participante(s) histórico(s) cargado(s).`, details };
  } catch (e) {
    return fail(e);
  }
}
