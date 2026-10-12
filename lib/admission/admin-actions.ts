"use server";

import { revalidatePath } from "next/cache";
import { supabaseService, supabaseUser } from "@/lib/supabase/server";
import { env } from "@/lib/supabase/env";
import { requireRole } from "./auth";
import { statusPath } from "./status";
import { parseCandidatesCsv } from "@/lib/import/candidates";
import { evaluateOne } from "./evaluate-one";
import { renderEmail, type EmailTemplate } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import type { AdmissionStatus } from "@/lib/domain/types";
import { fmtDeadline } from "@/components/ui";

export type ActionResult = { ok: boolean; message: string; details?: string[] };

const fail = (e: unknown): ActionResult => ({ ok: false, message: e instanceof Error ? e.message : String(e) });

/* ───────── Importar base de candidatos ───────── */
export async function importCandidates(waveId: string, csvText: string): Promise<ActionResult> {
  try {
    await requireRole(["admin", "delivery"]);
    const parsed = parseCandidatesCsv(csvText);
    if (parsed.rows.length === 0) return { ok: false, message: "No hay filas válidas para importar.", details: parsed.errors.map((e) => `Línea ${e.line}: ${e.message}`) };
    const db = await supabaseUser();
    const { data: existing, error: e1 } = await db.from("candidates").select("corporate_email").eq("wave_id", waveId);
    if (e1) throw e1;
    const have = new Set((existing ?? []).map((r) => r.corporate_email.toLowerCase()));
    const fresh = parsed.rows.filter((r) => !have.has(r.corporate_email));
    if (fresh.length) {
      const { error } = await db.from("candidates").insert(fresh.map((r) => ({ ...r, wave_id: waveId, source: "import", status: "INVITED" })));
      if (error) throw error;
    }
    revalidatePath(`/admin/admision/${waveId}`);
    const details = [
      ...parsed.errors.map((e) => `Línea ${e.line}: ${e.message}`),
      ...parsed.duplicates.map((d) => `Duplicado en el archivo: ${d}`),
      ...parsed.rows.filter((r) => have.has(r.corporate_email)).map((r) => `Ya existía en la Wave: ${r.corporate_email}`),
    ];
    return { ok: true, message: `${fresh.length} candidato(s) importado(s).`, details };
  } catch (e) {
    return fail(e);
  }
}

/* ───────── Evaluación con IA (propuesta) ───────── */
export async function evaluateCandidates(waveId: string, candidateIds: string[]): Promise<ActionResult> {
  try {
    const viewer = await requireRole(["admin"]);
    const svc = supabaseService();
    const details: string[] = [];
    let done = 0;
    for (const id of candidateIds) {
      const r = await evaluateOne(svc, id, viewer.id);
      if (r === "ok") done++;
      else details.push(r);
    }
    revalidatePath(`/admin/admision/${waveId}`);
    return { ok: done > 0 || candidateIds.length === 0, message: `${done} de ${candidateIds.length} evaluación(es) generada(s).`, details };
  } catch (e) {
    return fail(e);
  }
}

/* ───────── Decisión humana ───────── */
export async function decideCandidates(
  waveId: string,
  candidateIds: string[],
  outcome: "SELECTED" | "RESCUE_REQUIRED" | "NOT_SELECTED" | "HUMAN_REVIEW",
  note: string,
): Promise<ActionResult> {
  try {
    const viewer = await requireRole(["admin"]);
    const db = await supabaseUser();
    const details: string[] = [];
    let done = 0;
    for (const id of candidateIds) {
      const { data: c } = await db.from("candidates").select("id, full_name, status").eq("id", id).single();
      if (!c) continue;
      let path: AdmissionStatus[];
      try {
        path = statusPath(c.status as AdmissionStatus, outcome);
      } catch {
        details.push(`${c.full_name}: no se puede pasar de ${c.status} a ${outcome}.`);
        continue;
      }
      const { data: app } = await db.from("applications").select("id").eq("candidate_id", id).maybeSingle();
      const { data: ev } = app
        ? await db.from("ai_evaluations").select("id, recommendation").eq("application_id", app.id).order("created_at", { ascending: false }).limit(1).maybeSingle()
        : { data: null };
      const { error: e1 } = await db.from("decisions").insert({
        candidate_id: id,
        outcome,
        ai_evaluation_id: ev?.id ?? null,
        agrees_with_ai: ev ? ev.recommendation === outcome : null,
        note: note || null,
        decided_by: viewer.id,
      });
      if (e1) throw e1;
      for (const step of path) {
        const { error } = await db.from("candidates").update({ status: step }).eq("id", id);
        if (error) throw error;
      }
      done++;
    }
    revalidatePath(`/admin/admision/${waveId}`);
    return { ok: true, message: `Decisión registrada para ${done} candidato(s).`, details };
  } catch (e) {
    return fail(e);
  }
}

/* ───────── Correos ───────── */
export async function sendCandidateEmails(waveId: string, candidateIds: string[], template: EmailTemplate): Promise<ActionResult> {
  try {
    const viewer = await requireRole(["admin"]);
    const svc = supabaseService();
    const { data: wave } = await svc.from("waves").select("name, application_deadline").eq("id", waveId).single();
    const { data: rows } = await svc.from("candidates").select("id, full_name, corporate_email, invite_token").in("id", candidateIds);
    let sent = 0;
    const details: string[] = [];
    for (const c of rows ?? []) {
      const { subject, text } = renderEmail(template, {
        firstName: c.full_name.split(" ")[0],
        waveName: wave?.name ?? "AI Edge Talent",
        link: `${env.appUrl}/postular/${c.invite_token}`,
        deadline: wave?.application_deadline ? fmtDeadline(wave.application_deadline) : null,
        senderName: viewer.fullName ?? "Equipo AI Edge Talent",
      });
      const { data: msg } = await svc
        .from("email_messages")
        .insert({ wave_id: waveId, candidate_id: c.id, to_email: c.corporate_email, template, subject, body_text: text, sent_by: viewer.id })
        .select("id")
        .single();
      const r = await sendEmail(c.corporate_email, subject, text);
      await svc
        .from("email_messages")
        .update(r.error ? { status: "failed", error: r.error } : { status: "sent", provider_id: r.id, sent_at: new Date().toISOString() })
        .eq("id", msg!.id);
      if (r.error) details.push(`${c.corporate_email}: ${r.error}`);
      else sent++;
    }
    revalidatePath(`/admin/admision/${waveId}`);
    return { ok: sent > 0, message: `${sent} de ${rows?.length ?? 0} correo(s) enviado(s).`, details };
  } catch (e) {
    return fail(e);
  }
}

/* ───────── Accesos ───────── */
export async function grantRole(email: string, role: "admin" | "delivery" | "client" | "kiber" | "profesor" | "hub", clientName: string, waveId?: string): Promise<ActionResult> {
  try {
    const viewer = await requireRole(["admin"]);
    const db = await supabaseUser();
    const e = email.trim().toLowerCase();
    const { error } = await db.from("role_grants").upsert({ email: e, role, client_name: clientName || null, granted_by: viewer.id });
    if (error) throw error;
    await db.from("profiles").update({ role, client_name: clientName || null }).eq("email", e);
    if ((role === "profesor" || role === "hub") && waveId) {
      const { error: e2 } = await db.from("wave_staff").upsert({ wave_id: waveId, email: e, role, added_by: viewer.id });
      if (e2) throw e2;
    }
    revalidatePath("/admin/accesos");
    return { ok: true, message: `${e} tendrá rol ${ROLE_NAME[role]}${waveId && (role === "profesor" || role === "hub") ? ` en ${waveId}` : ""}.` };
  } catch (e) {
    return fail(e);
  }
}

const ROLE_NAME: Record<string, string> = { admin: "Admin", delivery: "Delivery", client: "Cliente", kiber: "Kiber", mentor: "Mentor", profesor: "Profesor", hub: "Líder Hub AI" };

/* ───────── Equipo por Wave: profesor/a y líder del Hub AI ───────── */
export async function addWaveStaff(waveId: string, email: string, role: "profesor" | "hub"): Promise<ActionResult> {
  try {
    const viewer = await requireRole(["admin"]);
    const e = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new Error("Correo no válido.");
    const db = await supabaseUser();
    const { data: profile } = await db.from("profiles").select("role").eq("email", e).maybeSingle();
    // Un rol por persona: no se pisa el de alguien del equipo interno o un mentor.
    if (profile && !["kiber", role].includes(profile.role)) {
      if (profile.role !== "admin") throw new Error(`${e} ya tiene rol ${ROLE_NAME[profile.role] ?? profile.role}. Cámbialo primero en Accesos.`);
    } else {
      const { error } = await db.from("role_grants").upsert({ email: e, role, granted_by: viewer.id });
      if (error) throw error;
      if (profile) await db.from("profiles").update({ role }).eq("email", e);
    }
    const { error } = await db.from("wave_staff").upsert({ wave_id: waveId, email: e, role, added_by: viewer.id });
    if (error) throw error;
    revalidatePath("/admin", "layout");
    return { ok: true, message: `${e} quedó como ${ROLE_NAME[role]} de la Wave. Entra con su correo en /login.` };
  } catch (e) {
    return fail(e);
  }
}

export async function removeWaveStaff(waveId: string, email: string, role: "profesor" | "hub"): Promise<ActionResult> {
  try {
    await requireRole(["admin"]);
    const db = await supabaseUser();
    const { error } = await db.from("wave_staff").delete().eq("wave_id", waveId).eq("email", email).eq("role", role);
    if (error) throw error;
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Quitado/a de la Wave." };
  } catch (e) {
    return fail(e);
  }
}

/** Reevaluación del video de rescate por el Product Lead (admin). La decisión final se registra aparte, en decisiones. */
export async function reviewRescue(waveId: string, candidateId: string, input: { commitment: number; interest: number; ai_affinity: number; note: string }): Promise<ActionResult> {
  try {
    const viewer = await requireRole(["admin"]);
    for (const v of [input.commitment, input.interest, input.ai_affinity]) if (!Number.isInteger(v) || v < 1 || v > 5) throw new Error("Cada criterio va de 1 a 5.");
    const db = await supabaseUser();
    const { error } = await db
      .from("rescue_videos")
      .update({ commitment: input.commitment, interest: input.interest, ai_affinity: input.ai_affinity, review_note: input.note.trim() || null, reviewed_by: viewer.id, reviewed_at: new Date().toISOString() })
      .eq("candidate_id", candidateId);
    if (error) throw error;
    revalidatePath(`/admin/admision/${waveId}/c/${candidateId}`);
    return { ok: true, message: "Revisión del video guardada. Registra ahora la decisión en la lista de candidatos." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
