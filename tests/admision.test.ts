import { describe, expect, it } from "vitest";
import { scoreEvaluation, buildUserMessage, type Evaluation } from "@/lib/ai/rubric";
import { parseCandidatesCsv } from "@/lib/import/candidates";
import { renderEmail } from "@/lib/email/templates";

const ev = (s: [number, number, number, number, number], insufficient = false): Evaluation => {
  const d = (score: number) => ({ score, justification: "j", evidence: "" });
  return { real_use: d(s[0]), depth: d(s[1]), reframe: d(s[2]), autonomy: d(s[3]), disposition: d(s[4]), insufficient_evidence: insufficient, summary: "", risks: [] };
};

describe("scoring AET (rúbrica del skill)", () => {
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
  it("evidencia insuficiente → revisión humana", () => {
    expect(scoreEvaluation(ev([1, 1, 1, 1, 1], true)).recommendation).toBe("HUMAN_REVIEW");
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
