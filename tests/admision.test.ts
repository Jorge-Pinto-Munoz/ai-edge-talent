import { describe, expect, it } from "vitest";
import { scoreEvaluation, buildUserMessage, normalizeEvaluation, SYSTEM_PROMPT, type Evaluation } from "@/lib/ai/rubric";
import { parseCandidatesCsv } from "@/lib/import/candidates";
import { renderEmail } from "@/lib/email/templates";

const ev = (s: [number, number, number, number, number], noEvidence = false, followUp = false): Evaluation => {
  const d = (score: number) => ({ score, justification: "j", evidence: "" });
  return {
    real_use: d(s[0]), depth: d(s[1]), reframe: d(s[2]), autonomy: d(s[3]), disposition: d(s[4]),
    strengths: [], risks: [], insufficient_fields: [], no_evaluable_evidence: noEvidence, selection_follow_up: followUp, summary: "",
  };
};

describe("scoring AET (Assessment Evaluator Spec v1)", () => {
  it("reproduce los ejemplos de calibración", () => {
    expect(scoreEvaluation(ev([5, 5, 5, 5, 4])).total).toBe(98.4);
    expect(scoreEvaluation(ev([5, 5, 3, 4, 4])).total).toBe(86);
    expect(scoreEvaluation(ev([5, 4, 4, 4, 3])).total).toBe(83.4);
    expect(scoreEvaluation(ev([2, 2, 1, 1, 1])).total).toBe(31);
  });
  it("aplica niveles y corte 50: bajo el corte → repechaje, nunca descarte", () => {
    expect(scoreEvaluation(ev([5, 5, 5, 5, 4]))).toMatchObject({ level: "A", recommendation: "SELECTED" });
    expect(scoreEvaluation(ev([3, 3, 3, 3, 3]))).toMatchObject({ total: 60, level: "C", recommendation: "SELECTED" });
    expect(scoreEvaluation(ev([2, 2, 1, 1, 1]))).toMatchObject({ level: "D", recommendation: "RESCUE_REQUIRED" });
  });
  it("recomendación al Product Lead según nivel (sección 10)", () => {
    expect(scoreEvaluation(ev([5, 5, 5, 5, 4])).plRecommendation).toBe("SELECCIONAR");
    expect(scoreEvaluation(ev([5, 5, 5, 5, 4], false, true)).plRecommendation).toBe("SELECCIONAR_CON_SEGUIMIENTO");
    expect(scoreEvaluation(ev([4, 4, 3, 3, 3]))).toMatchObject({ level: "B", plRecommendation: "SELECCIONAR" });
    expect(scoreEvaluation(ev([3, 3, 3, 3, 3])).plRecommendation).toBe("EVALUAR_CUPO_Y_SEGUIMIENTO");
    // D nunca es no-selección definitiva: activa rescate aunque el modelo pida seguimiento
    expect(scoreEvaluation(ev([2, 2, 1, 1, 1], false, true)).plRecommendation).toBe("ACTIVAR_RESCATE");
  });
  it("límites de niveles: 80 = A, 65 = B, 50 = C, 49.x = D", () => {
    expect(scoreEvaluation(ev([4, 4, 4, 4, 4])).level).toBe("A"); // 80
    expect(scoreEvaluation(ev([3, 4, 3, 3, 4]))).toMatchObject({ total: 67.6, level: "B" });
    expect(scoreEvaluation(ev([2, 3, 2, 3, 3]))).toMatchObject({ total: 50, level: "C" });
    expect(scoreEvaluation(ev([3, 2, 2, 3, 3]))).toMatchObject({ total: 49, level: "D" });
  });
  it("postulación sin evidencia evaluable → revisión humana, sin recomendación", () => {
    expect(scoreEvaluation(ev([1, 1, 1, 1, 1], true))).toMatchObject({ recommendation: "HUMAN_REVIEW", plRecommendation: null });
  });
  it("máximo 3 fortalezas y 3 riesgos", () => {
    const n = normalizeEvaluation({ ...ev([3, 3, 3, 3, 3]), strengths: ["a", "b", "c", "d"], risks: [" x ", "", "y", "z", "w"] });
    expect(n.strengths).toEqual(["a", "b", "c"]);
    expect(n.risks).toEqual(["x", "y", "z"]);
  });
  it("el prompt incluye las reglas de la especificación", () => {
    for (const rule of ["No confundas frecuencia con profundidad", "No confundas dependencia con madurez", "NO exijas celebridades", "NO inventes evidencia"]) expect(SYSTEM_PROMPT).toContain(rule);
  });
  it("rechaza puntajes fuera de rango", () => {
    expect(() => scoreEvaluation(ev([6, 5, 5, 5, 5]))).toThrow();
    expect(() => scoreEvaluation(ev([0, 5, 5, 5, 5]))).toThrow();
  });
  it("no envía datos personales al modelo", () => {
    const msg = buildUserMessage({ roleTitle: "QA", questions: [{ id: "q1", prompt: "¿Caso?" }], answers: { q1: "Uso agentes" } });
    expect(msg).toContain("Uso agentes");
    expect(msg).not.toMatch(/@|Cliente/);
  });
});

describe("importación de candidatos", () => {
  it("mapea encabezados en español, detecta duplicados y errores", () => {
    const csv = "Nombre;Correo corporativo;Cliente;Rol;Especialidad\nAna Pérez;ANA@kibernum.com;Alfa;QA;Calidad\nBeto;beto@kibernum;Beta;Dev;Ingeniería\nAna P;ana@kibernum.com;Alfa;QA;Calidad";
    const r = parseCandidatesCsv(csv);
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({ full_name: "Ana Pérez", corporate_email: "ana@kibernum.com", specialty: "Calidad" });
    expect(r.errors).toHaveLength(1);
    expect(r.duplicates).toEqual(["ana@kibernum.com"]);
  });
  it("exige nombre y correo", () => {
    expect(parseCandidatesCsv("Cliente,Rol\nA,B").errors[0].message).toMatch(/nombre y correo/);
  });
});

describe("correos", () => {
  it("nunca incluyen puntajes y cada uno tiene una sola acción", () => {
    for (const t of ["INVITATION", "SELECTED", "RESCUE_REQUIRED", "NOT_SELECTED", "REMINDER"] as const) {
      const e = renderEmail(t, { firstName: "Ana", waveName: "Wave 3", link: "https://x/y", deadline: null, senderName: "Equipo AET" });
      expect(e.text).not.toMatch(/puntaje|score|ranking|\d+\/100/i);
      expect(e.text.split("https://").length - 1).toBeLessThanOrEqual(1);
    }
  });
});

import { statusPath } from "@/lib/admission/status";
describe("caminos de estado", () => {
  it("invitado → postulación iniciada pasa por identificado", () => {
    expect(statusPath("INVITED", "APPLICATION_STARTED")).toEqual(["IDENTIFIED", "APPLICATION_STARTED"]);
  });
  it("enviado → seleccionado pasa por evaluado", () => {
    expect(statusPath("APPLICATION_SUBMITTED", "SELECTED")).toEqual(["ASSESSMENT_EVALUATED", "SELECTED"]);
  });
  it("seleccionado → inscrito exige aceptar compromiso", () => {
    expect(statusPath("SELECTED", "ENROLLED")).toEqual(["CONDITIONS_PENDING", "CONDITIONS_ACCEPTED", "ENROLLED"]);
  });
  it("no se puede volver atrás", () => {
    expect(() => statusPath("NOT_SELECTED", "SELECTED")).toThrow();
  });
});
