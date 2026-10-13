import { describe, expect, it } from "vitest";
import { CLOSING_PULSE, closureDecision, nextLayer, stageRequirements, stageStatus, type RequirementInput } from "@/lib/journey/closure";
import { PULSES, CORE_IDS } from "@/lib/pulse/definitions";

const caps: RequirementInput["capsules"] = [
  { id: "c1", layer: "AI_MINDSET", task_prompt: "Desafío", task_required: true, max_attempts: 2 },
  { id: "c2", layer: "AI_MINDSET", task_prompt: null, task_required: false },
];
const base: RequirementInput = { capsules: caps, submissions: [], certifications: [], labStatus: null };
const approved = { ...base, submissions: [{ capsule_id: "c1", status: "APPROVED", attempt: 1 }] };

describe("cierre de etapa: requisitos", () => {
  it("cada etapa con pulso de cierre tiene las cinco preguntas base", () => {
    for (const [layer, key] of Object.entries(CLOSING_PULSE)) {
      if (!key) continue;
      const def = PULSES.find((p) => p.key === key)!;
      expect(def.closes).toBe(layer);
      for (const id of CORE_IDS) expect(def.questions.find((q) => q.id === id && !q.optional)).toBeTruthy();
    }
  });
  it("Mindset: desafío aprobado; sin tareas publicadas no se cumple", () => {
    expect(stageRequirements("AI_MINDSET", base).met).toBe(false);
    expect(stageRequirements("AI_MINDSET", approved).met).toBe(true);
    expect(stageRequirements("AI_MINDSET", { ...base, capsules: [] }).met).toBe(false);
  });
  it("Role Enablement: aprobada Y verificada; pendiente o reprobada no cuenta", () => {
    expect(stageRequirements("ROLE_ENABLEMENT", { ...base, certifications: [{ result: "PASSED", status: "PENDING_REVIEW" }] }).met).toBe(false);
    expect(stageRequirements("ROLE_ENABLEMENT", { ...base, certifications: [{ result: "FAILED", status: "VERIFIED" }] }).met).toBe(false);
    expect(stageRequirements("ROLE_ENABLEMENT", { ...base, certifications: [{ result: "PASSED", status: "VERIFIED" }] }).met).toBe(true);
  });
  it("AI Lab: presentado en el Showcase; Cierre: siempre", () => {
    expect(stageRequirements("AI_LAB_SHOWCASE", { ...base, labStatus: "READY" }).met).toBe(false);
    expect(stageRequirements("AI_LAB_SHOWCASE", { ...base, labStatus: "PRESENTED" }).met).toBe(true);
    expect(stageRequirements("CLOSURE", base).met).toBe(true);
  });
  it("una excepción da por cumplidos los requisitos, pero no el pulso", () => {
    expect(stageRequirements("AI_MINDSET", { ...base, byException: true })).toMatchObject({ met: true, byException: true });
    expect(closureDecision("AI_MINDSET", { ...base, byException: true, answered: [] })).toMatchObject({ close: false, missing: "pulse" });
  });
});

describe("cierre de etapa: decisión", () => {
  it("requisitos sin pulso no cierran; pulso sin requisitos tampoco", () => {
    expect(closureDecision("AI_MINDSET", { ...approved, answered: [] })).toMatchObject({ close: false, missing: "pulse" });
    expect(closureDecision("AI_MINDSET", { ...base, answered: ["MINDSET"] })).toMatchObject({ close: false, missing: "requirements" });
  });
  it("requisitos + pulso cierran y desbloquean la siguiente", () => {
    expect(closureDecision("AI_MINDSET", { ...approved, answered: ["MINDSET"] })).toEqual({ close: true, next: "ROLE_ENABLEMENT", missing: null });
    expect(closureDecision("CLOSURE", { ...base, answered: ["FINAL"] })).toEqual({ close: true, next: null, missing: null });
    expect(nextLayer("AI_LAB_SHOWCASE")).toBe("CLOSURE");
  });
});

describe("cierre de etapa: estados", () => {
  const st = (x: Partial<Parameters<typeof stageStatus>[0]>) => stageStatus({ ...base, current: "AI_MINDSET", layer: "AI_MINDSET", answered: [], started: false, ...x });
  it("distingue disponible, en curso, en revisión, pulso pendiente y cerrada", () => {
    expect(st({})).toBe("AVAILABLE");
    expect(st({ started: true })).toBe("IN_PROGRESS");
    expect(st({ started: true, submissions: [{ capsule_id: "c1", status: "SUBMITTED", attempt: 1 }] })).toBe("ACADEMIC_PENDING");
    expect(st({ ...approved, started: true })).toBe("PULSE_PENDING");
    expect(st({ ...approved, started: true, answered: ["MINDSET"], closedAt: "2026-10-01" })).toBe("CLOSED");
    expect(st({ layer: "ROLE_ENABLEMENT" })).toBe("LOCKED");
    expect(st({ current: "ROLE_ENABLEMENT" })).toBe("CLOSED");
  });
  it("requiere atención: intentos agotados o pulso pendiente por demasiado tiempo", () => {
    const failed = [1, 2].map((attempt) => ({ capsule_id: "c1", status: "NOT_APPROVED", attempt }));
    expect(st({ started: true, submissions: failed })).toBe("ATTENTION");
    expect(st({ ...approved, started: true, pulseWaitDays: 9, attentionAfterDays: 7 })).toBe("ATTENTION");
    expect(stageStatus({ ...base, current: "ROLE_ENABLEMENT", layer: "ROLE_ENABLEMENT", answered: [], started: true, certifications: [{ result: "FAILED", status: "VERIFIED" }, { result: "FAILED", status: "VERIFIED" }] })).toBe("ATTENTION");
  });
});
