import { describe, expect, it } from "vitest";
import { answeredCount, assessmentState, cleanAnswers, firstPending, missingRequired } from "@/lib/admission/assessment";

const qs = [
  { id: "a", required: true, kind: "long_text" },
  { id: "b", required: true, kind: "single_choice", options: ["Nunca", "A diario"] },
  { id: "c", required: false, kind: "long_text" },
];

describe("estados del Assessment", () => {
  it("distingue No iniciado, En progreso y Completado", () => {
    expect(assessmentState("IDENTIFIED")).toBe("NOT_STARTED");
    expect(assessmentState("APPLICATION_STARTED")).toBe("IN_PROGRESS");
    expect(assessmentState("APPLICATION_SUBMITTED", "2026-10-13T10:00:00Z")).toBe("COMPLETED");
  });
  it("un borrador con respuestas sigue En progreso (no es evaluación finalizada)", () => {
    expect(assessmentState("APPLICATION_STARTED", null)).toBe("IN_PROGRESS");
  });
});

describe("respuestas", () => {
  it("guarda solo preguntas del formulario y opciones válidas", () => {
    const c = cleanAnswers(qs, { a: "hola", b: "Inventada", z: "extra", c: 5 as unknown as string });
    expect(c).toEqual({ a: "hola", b: "", c: "" });
  });
  it("acota textos largos", () => {
    expect(cleanAnswers(qs, { a: "x".repeat(9000) }).a.length).toBe(8000);
  });
  it("obligatorias solo al enviar y retomar en la primera pendiente", () => {
    const a = { a: "listo", b: "", c: "" };
    expect(missingRequired(qs, a)).toEqual(["b"]);
    expect(firstPending(qs, a)).toBe("b");
    expect(answeredCount(qs, a)).toBe(1);
    expect(missingRequired(qs, { a: "  ", b: "Nunca" })).toEqual(["a"]);
  });
});
