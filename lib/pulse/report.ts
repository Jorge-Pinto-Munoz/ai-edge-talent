import "server-only";
import { supabaseUser } from "@/lib/supabase/server";
import { attendanceByPerson } from "@/lib/teacher/rules";
import { aicertAlert, overallProgress, type AiCertProgress, type RiskAlert } from "@/lib/aicert/progress";
import type { Layer } from "@/lib/journey/rules";
import { enablementIndicators, enablementPerson, mindsetIndicators, nps, pairEfficiency, verifiedProgress, type Answers, type ProgressPoint, type PulseRow } from "./rules";
import { PULSES } from "./definitions";

export interface PersonRow {
  id: string;
  name: string;
  role: string | null;
  client: string | null;
  layer: Layer | null;
  layerSince: string | null;
  progress: AiCertProgress | null;
  overall: number;
  attendance: number | null;
  pulse: ReturnType<typeof enablementPerson> | null;
  pulseKey: string | null;
  alert: RiskAlert | null;
  answered: string[];
}

/**
 * Todo lo que necesita el informe de una Wave, calculado en una pasada: avance AI CERT, asistencia, pulsos,
 * indicadores (W2) y eficiencia pre/post. Staff lee con su sesión (RLS).
 */
export async function waveReport(waveId: string, now = new Date()) {
  const db = await supabaseUser();
  const { data: people } = await db
    .from("candidates")
    .select("id, full_name, role_title, client_name, journey_layer, journey_layer_since")
    .eq("wave_id", waveId)
    .in("status", ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"])
    .order("full_name");
  const ids = (people ?? []).map((p) => p.id);
  const none = { data: [] as never[] };
  const [{ data: progress }, { data: history }, { data: classes }, { data: pulses }, { data: certs }] = await Promise.all([
    ids.length ? db.from("aicert_progress").select("*").in("candidate_id", ids) : none,
    ids.length ? db.from("aicert_progress_history").select("candidate_id, course, percent, at").in("candidate_id", ids).order("at") : none,
    db.from("teacher_classes").select("id, held_on, teacher_class_attendance(class_id, candidate_id, attended)").eq("wave_id", waveId),
    db.from("pulse_responses").select("pulse, candidate_id, client_name, created_at, answers").eq("wave_id", waveId).order("created_at"),
    ids.length ? db.from("certifications").select("candidate_id, result, status").in("candidate_id", ids) : none,
  ]);

  const rows = (pulses ?? []) as PulseRow[];
  const points: ProgressPoint[] = (history ?? []).map((h: { candidate_id: string; course: "INTRO" | "SPECIALIST"; percent: number; at: string }) => ({ candidate_id: h.candidate_id, overall: overallProgress(h), at: h.at }));
  const certified = new Set((certs ?? []).filter((c: { result: string; status: string }) => c.result === "PASSED" && c.status === "VERIFIED").map((c: { candidate_id: string }) => c.candidate_id));
  const att = attendanceByPerson(
    (classes ?? []).map((c) => ({ id: c.id, held_on: c.held_on })),
    (classes ?? []).flatMap((c) => c.teacher_class_attendance as { class_id: string; candidate_id: string; attended: boolean }[]),
    ids,
  );
  const tpvOf = (r: PulseRow) => verifiedProgress(points, r.candidate_id!, r.created_at, certified.has(r.candidate_id!));

  const persons: PersonRow[] = (people ?? []).map((p) => {
    const prog = ((progress ?? []) as (AiCertProgress & { candidate_id: string })[]).find((x) => x.candidate_id === p.id) ?? null;
    const mine = rows.filter((r) => r.candidate_id === p.id);
    const lastEnab = [...mine].reverse().find((r) => r.pulse === "HAB_CIERRE" || r.pulse === "HAB_INTERMEDIO") ?? null;
    const reading = lastEnab ? enablementPerson(lastEnab.answers, tpvOf(lastEnab)) : null;
    const a = att.find((x) => x.candidateId === p.id);
    const days = p.journey_layer_since ? (now.getTime() - new Date(p.journey_layer_since).getTime()) / 86_400_000 : 0;
    return {
      id: p.id,
      name: p.full_name,
      role: p.role_title,
      client: p.client_name,
      layer: p.journey_layer as Layer | null,
      layerSince: p.journey_layer_since,
      progress: prog,
      overall: overallProgress(prog),
      attendance: a?.rate ?? null,
      pulse: reading,
      pulseKey: lastEnab?.pulse ?? null,
      alert: p.journey_layer === "ROLE_ENABLEMENT" ? aicertAlert({ progress: prog, daysInStage: days, attendance: a && a.recorded >= 3 ? a.rate : null, pulse: reading, now }) : null,
      answered: mine.map((r) => r.pulse),
    };
  });

  const of = (k: string) => rows.filter((r) => r.pulse === k);
  const enab = (k: string) => enablementIndicators(of(k).filter((r) => r.candidate_id).map((r) => ({ a: r.answers, tpv: tpvOf(r) })));
  const npsOf = (k: string) => nps(of(k).map((r) => r.answers.nps).filter((x): x is number => typeof x === "number"));
  const avgOf = (k: string, field: string) => {
    const xs = of(k).map((r) => r.answers[field]).filter((x): x is number => typeof x === "number");
    return xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 100) / 100 : null;
  };
  const clients = [...new Set((people ?? []).map((p) => p.client_name).filter(Boolean))].length;

  return {
    persons,
    responses: rows.length,
    coverage: PULSES.map((d) => ({ key: d.key, title: d.title, when: d.when, respondent: d.respondent, n: of(d.key).length, of: d.respondent === "CLIENT" ? clients : ids.length })),
    mindset: mindsetIndicators(of("MINDSET").map((r) => r.answers as Answers)),
    enablementMid: enab("HAB_INTERMEDIO"),
    enablementClose: enab("HAB_CIERRE"),
    lab: { n: of("LAB").length, nps: npsOf("LAB"), avg: ["l_problema", "l_sesiones", "l_confianza", "l_showcase"].map((k) => avgOf("LAB", k)) },
    final: { n: of("FINAL").length, nps: npsOf("FINAL"), overall: avgOf("FINAL", "overall") },
    client: { n: of("CLIENTE_FINAL").length, nps: npsOf("CLIENTE_FINAL"), value: avgOf("CLIENTE_FINAL", "c_valor"), satisf: avgOf("CLIENTE_FINAL", "c_satisf"), continuity: of("CLIENTE_FINAL").map((r) => String(r.answers.continuity ?? "")) },
    efficiency: {
      kiber: pairEfficiency(rows, (r) => r.candidate_id, "INICIO", "FINAL"),
      client: pairEfficiency(rows, (r) => (r.candidate_id ? null : r.client_name), "CLIENTE_INICIO", "CLIENTE_FINAL"),
    },
    comments: rows.filter((r) => typeof r.answers.comment === "string" && r.answers.comment).map((r) => ({ pulse: r.pulse, text: String(r.answers.comment), at: r.created_at })),
  };
}
export type WaveReport = Awaited<ReturnType<typeof waveReport>>;
