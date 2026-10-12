import "server-only";
import ExcelJS from "exceljs";
import { supabaseUser } from "@/lib/supabase/server";
import { DIMENSIONS, LEVEL_LABEL, PL_LABEL, RUBRIC_VERSION, type Level, type PlRecommendation } from "@/lib/ai/rubric";
import { ADMISSION_LABEL, type AdmissionStatus } from "@/lib/domain/types";
import { RESCUE_CRITERIA } from "@/lib/admission/rescue";

type DimScore = { score: number; evidence: string; justification: string };
type Q = { id: string; prompt: string };

interface Row {
  id: string;
  full_name: string;
  corporate_email: string;
  role_title: string | null;
  client_name: string | null;
  specialty: string | null;
  status: string;
  submitted_at: string | null;
  questions: Q[];
  answers: Record<string, string>;
  ev: {
    total: number;
    level: string;
    pl: string | null;
    summary: string;
    strengths: string[];
    risks: string[];
    insufficient: string[];
    scores: Record<string, DimScore>;
    model: string;
    created_at: string;
  } | null;
  decision: { outcome: string; note: string | null; decided_at: string } | null;
  rescue: { commitment: number | null; interest: number | null; ai_affinity: number | null; review_note: string | null; submitted_at: string } | null;
}

/** Datos de admisión de una Wave (o de un candidato). Solo admin: depende de RLS sobre evaluaciones. */
async function loadRows(waveId: string, candidateId?: string): Promise<{ waveName: string; rows: Row[] }> {
  const db = await supabaseUser();
  const { data: wave } = await db.from("waves").select("name").eq("id", waveId).single();
  let q = db.from("candidates").select("id, full_name, corporate_email, role_title, client_name, specialty, status").eq("wave_id", waveId);
  if (candidateId) q = q.eq("id", candidateId);
  const { data: cands } = await q;
  const ids = (cands ?? []).map((c) => c.id);
  if (!ids.length) return { waveName: wave?.name ?? waveId, rows: [] };
  const [{ data: apps }, { data: decs }, { data: resc }] = await Promise.all([
    db.from("applications").select("id, candidate_id, answers, questions_snapshot, submitted_at").in("candidate_id", ids),
    db.from("decisions").select("candidate_id, outcome, note, decided_at").in("candidate_id", ids).order("decided_at", { ascending: false }),
    db.from("rescue_videos").select("candidate_id, commitment, interest, ai_affinity, review_note, submitted_at").in("candidate_id", ids),
  ]);
  const appIds = (apps ?? []).map((a) => a.id);
  const { data: evs } = appIds.length
    ? await db.from("ai_evaluations").select("*").in("application_id", appIds).order("created_at", { ascending: false })
    : { data: [] as Record<string, unknown>[] };

  const rows: Row[] = (cands ?? []).map((c) => {
    const app = (apps ?? []).find((a) => a.candidate_id === c.id);
    const e = (evs ?? []).find((x) => x.application_id === app?.id) as Record<string, unknown> | undefined;
    const d = (decs ?? []).find((x) => x.candidate_id === c.id);
    const r = (resc ?? []).find((x) => x.candidate_id === c.id);
    return {
      ...c,
      submitted_at: app?.submitted_at ?? null,
      questions: (app?.questions_snapshot ?? []) as Q[],
      answers: (app?.answers ?? {}) as Record<string, string>,
      ev: e
        ? {
            total: Number(e.weighted_total),
            level: String(e.level),
            pl: (e.pl_recommendation as string | null) ?? null,
            summary: String(e.summary ?? ""),
            strengths: (e.strengths as string[] | null) ?? [],
            risks: (e.risks as string[] | null) ?? [],
            insufficient: (e.insufficient_fields as string[] | null) ?? [],
            scores: e.scores as Record<string, DimScore>,
            model: String(e.model),
            created_at: String(e.created_at),
          }
        : null,
      decision: d ? { outcome: d.outcome, note: d.note, decided_at: d.decided_at } : null,
      rescue: r ?? null,
    };
  });
  rows.sort((a, b) => (b.ev?.total ?? -1) - (a.ev?.total ?? -1) || a.full_name.localeCompare(b.full_name));
  return { waveName: wave?.name ?? waveId, rows };
}

const DECISION_LABEL: Record<string, string> = { SELECTED: "Seleccionado/a", RESCUE_REQUIRED: "Rescate por video", HUMAN_REVIEW: "Revisión humana", NOT_SELECTED: "No continúa" };
const OBSIDIAN = "FF080B10";
const CYAN = "FF3DC9D4";
const LEVEL_FILL: Record<string, string> = { A: "FFB2D5AD", B: "FFDFF1F3", C: "FFFFF3DB", D: "FFFFE9E7" };

function header(ws: ExcelJS.Worksheet, title: string, subtitle: string, cols: { header: string; width: number }[]) {
  ws.addRow([title]).font = { bold: true, size: 16, color: { argb: OBSIDIAN } };
  ws.addRow([subtitle]).font = { italic: true, color: { argb: "FF4B5763" } };
  ws.addRow([]);
  const h = ws.addRow(cols.map((c) => c.header));
  h.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: OBSIDIAN } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = { bottom: { style: "medium", color: { argb: CYAN } } };
  });
  h.height = 34;
  cols.forEach((c, i) => (ws.getColumn(i + 1).width = c.width));
  ws.views = [{ state: "frozen", ySplit: 4 }];
}

function wrapRow(row: ExcelJS.Row) {
  row.eachCell((cell) => (cell.alignment = { vertical: "top", wrapText: true }));
}

/** Libro de Excel con el mismo formato que la planilla de scoring de Waves anteriores, más respuestas y decisión. */
export async function buildAdmissionWorkbook(waveId: string, candidateId?: string): Promise<{ buffer: Buffer; filename: string }> {
  const { waveName, rows } = await loadRows(waveId, candidateId);
  const wb = new ExcelJS.Workbook();
  wb.creator = "AET Platform";
  wb.created = new Date();
  const scope = candidateId ? rows[0]?.full_name ?? "Candidato" : waveName;
  const stamp = new Date().toISOString().slice(0, 10);

  // 1 · Ranking
  const rk = wb.addWorksheet("Ranking");
  header(rk, `AI EDGE TALENT — EVALUACIÓN DE CANDIDATOS · ${waveName}`, `Scoring ponderado · 5 dimensiones · ${RUBRIC_VERSION} · ${stamp} · Evidencia interna: no compartir con profesionales ni clientes`, [
    { header: "Ranking", width: 9 }, { header: "Nombre", width: 26 }, { header: "Rol", width: 22 }, { header: "Cliente", width: 20 },
    ...DIMENSIONS.map((d) => ({ header: `${d.label.split(" ")[0] === "Uso" ? "Uso IA" : d.label.split(" ")[0]}\n(${Math.round(d.weight * 100)}%)`, width: 12 })),
    { header: "SCORE", width: 10 }, { header: "Nivel", width: 24 }, { header: "Recomendación al Product Lead", width: 28 }, { header: "Estado", width: 22 }, { header: "Decisión", width: 20 },
  ]);
  let rank = 0;
  for (const r of rows) {
    const ranked = r.ev ? ++rank : "";
    const row = rk.addRow([
      ranked, r.full_name, r.role_title ?? "", r.client_name ?? "",
      ...DIMENSIONS.map((d) => r.ev?.scores?.[d.key]?.score ?? ""),
      r.ev ? r.ev.total : "", r.ev ? LEVEL_LABEL[r.ev.level as Level] ?? r.ev.level : r.submitted_at ? "Sin evaluar" : "No enviada",
      r.ev?.pl ? PL_LABEL[r.ev.pl as PlRecommendation] : "", ADMISSION_LABEL[r.status as AdmissionStatus] ?? r.status, r.decision ? DECISION_LABEL[r.decision.outcome] ?? r.decision.outcome : "",
    ]);
    if (r.ev) {
      row.getCell(10).font = { bold: true };
      row.getCell(11).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LEVEL_FILL[r.ev.level] ?? "FFFFFFFF" } };
    }
    wrapRow(row);
  }

  // 2 · Análisis ejecutivo por candidato
  const an = wb.addWorksheet("Justificación por candidato");
  header(an, "JUSTIFICACIÓN DETALLADA POR CANDIDATO", "Análisis ejecutivo, evidencia por dimensión, fortalezas, riesgos y rescate", [
    { header: "Rank", width: 7 }, { header: "Nombre", width: 24 }, { header: "Score", width: 9 }, { header: "Nivel", width: 20 }, { header: "Recomendación", width: 22 },
    { header: "Análisis ejecutivo", width: 50 }, { header: "Evidencia y justificación por dimensión", width: 70 }, { header: "Fortalezas", width: 36 }, { header: "Riesgos o brechas", width: 36 },
    { header: "Campos insuficientes", width: 24 }, { header: "Video de rescate (PL)", width: 34 }, { header: "Decisión y nota", width: 34 },
  ]);
  rank = 0;
  for (const r of rows) {
    if (!r.ev && !r.submitted_at && !r.rescue) continue;
    const dims = r.ev
      ? DIMENSIONS.map((d) => {
          const s = r.ev!.scores?.[d.key];
          return `${d.label} (${Math.round(d.weight * 100)}%): ${s?.score ?? "–"}/5${s?.evidence ? ` · “${s.evidence}”` : ""}${s?.justification ? ` · ${s.justification}` : ""}`;
        }).join("\n")
      : "";
    const rescue = r.rescue
      ? `Enviado ${r.rescue.submitted_at.slice(0, 10)}${r.rescue.commitment ? ` · ${RESCUE_CRITERIA.map((c) => `${c.label} ${r.rescue![c.key] ?? "–"}/5`).join(" · ")}` : " · sin revisar"}${r.rescue.review_note ? `\n${r.rescue.review_note}` : ""}`
      : r.ev?.level === "D" ? "Pendiente" : "";
    const row = an.addRow([
      r.ev ? ++rank : "", r.full_name, r.ev?.total ?? "", r.ev ? LEVEL_LABEL[r.ev.level as Level] : "Sin evaluar", r.ev?.pl ? PL_LABEL[r.ev.pl as PlRecommendation] : "",
      r.ev ? `${r.ev.summary}${r.ev.level === "D" ? "\nNivel D: no es no-selección definitiva hasta resolver el rescate o una decisión explícita del Product Lead." : ""}` : "",
      dims, (r.ev?.strengths ?? []).map((x) => `• ${x}`).join("\n"), (r.ev?.risks ?? []).map((x) => `• ${x}`).join("\n"), (r.ev?.insufficient ?? []).join(", "),
      rescue, r.decision ? `${DECISION_LABEL[r.decision.outcome] ?? r.decision.outcome}${r.decision.note ? ` · ${r.decision.note}` : ""}` : "",
    ]);
    wrapRow(row);
  }

  // 3 · Respuestas completas
  const rs = wb.addWorksheet("Respuestas");
  const questions: Q[] = rows.find((r) => r.questions.length)?.questions ?? [];
  header(rs, "RESPUESTAS DEL ASSESSMENT", "Respuestas textuales de cada postulación", [
    { header: "Nombre", width: 24 }, { header: "Correo", width: 30 }, { header: "Rol", width: 20 }, { header: "Cliente", width: 18 }, { header: "Enviada", width: 12 },
    ...questions.map((q, i) => ({ header: `${i + 1}. ${q.prompt}`, width: 48 })),
  ]);
  for (const r of rows) {
    const row = rs.addRow([r.full_name, r.corporate_email, r.role_title ?? "", r.client_name ?? "", r.submitted_at?.slice(0, 10) ?? "No", ...questions.map((q) => r.answers[q.id] ?? "")]);
    wrapRow(row);
  }

  // 4 · Metodología
  const me = wb.addWorksheet("Metodología");
  header(me, "METODOLOGÍA DE EVALUACIÓN", `Especificación operativa v1 · ${RUBRIC_VERSION}`, [{ header: "DIMENSIÓN", width: 36 }, { header: "PESO", width: 9 }, { header: "QUÉ MIDE", width: 90 }]);
  const what: Record<string, string> = {
    real_use: "Frecuencia declarada validada contra el caso real descrito. Distingue uso declarado de uso demostrado.",
    depth: "Si reformula procesos, workflows o decisiones, o se limita a consultas o automatizaciones aisladas. Mayor peso.",
    reframe: "Cómo proyecta la evolución de su rol, qué delegaría y si su aporte se mueve hacia criterio, revisión, diseño o decisión.",
    autonomy: "Iniciativa para aprender: calidad de fuentes y prácticas y su conexión con el trabajo. No exige celebridades.",
    disposition: "Integración genuina de IA y actitud frente al proceso. Dependencia no es madurez.",
  };
  for (const d of DIMENSIONS) wrapRow(me.addRow([d.label, `${Math.round(d.weight * 100)}%`, what[d.key]]));
  me.addRow([]);
  for (const line of [
    "Score = Σ (puntaje ÷ 5 × peso), sobre 100. Escala por dimensión: 1 muy baja · 2 incipiente · 3 suficiente · 4 sólida · 5 excepcional.",
    "A — IDEAL ≥ 80 · B — APTO 65–79 · C — APTO CON SEGUIMIENTO 50–64 · D — BAJO CORTE < 50 (activa rescate por video; no es no-selección definitiva).",
    "El evaluador recomienda; el corte final lo hace el Product Lead. Scores y rankings son evidencia interna.",
  ]) wrapRow(me.addRow([line]));

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  const slug = scope.normalize("NFD").replace(/[^\w]+/g, "_").replace(/^_|_$/g, "");
  return { buffer, filename: `AET_${slug}_${stamp}.xlsx` };
}
