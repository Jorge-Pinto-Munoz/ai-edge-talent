import { describe, expect, it } from "vitest";
import { advanceGate, certificationAttemptNote, embedUrl, safeFileName, submissionGate, weekStart } from "@/lib/journey/rules";

describe("entregas e intentos", () => {
  it("revisión humana no consume intento", () => {
    expect(submissionGate(["NOT_APPROVED"], 2)).toMatchObject({ allowed: true, nextAttempt: 2 });
    expect(submissionGate(["HUMAN_REVIEW"], 2).allowed).toBe(false); // pendiente de revisión
  });
  it("dos intentos no aprobados bloquean (excepción explícita)", () => {
    const g = submissionGate(["NOT_APPROVED", "NOT_APPROVED"], 2);
    expect(g.allowed).toBe(false);
    expect(g.reason).toMatch(/Product Lead/);
  });
  it("sin máximo (AI Lab) se puede seguir ajustando", () => {
    expect(submissionGate(["NOT_APPROVED", "NOT_APPROVED", "NOT_APPROVED"], null).allowed).toBe(true);
  });
  it("no se reenvía una tarea aprobada ni pendiente", () => {
    expect(submissionGate(["APPROVED"], 2).allowed).toBe(false);
    expect(submissionGate(["SUBMITTED"], 2).allowed).toBe(false);
  });
});

describe("gates entre capas", () => {
  const ctx = { admissionStatus: "ENROLLED", requiredMindsetCapsules: ["a", "b"], approvedCapsules: ["a"], certification: null };
  it("AI Mindset requiere inscripción", () => {
    expect(advanceGate(null, "AI_MINDSET", { ...ctx, admissionStatus: "SELECTED" }).ok).toBe(false);
    expect(advanceGate(null, "AI_MINDSET", ctx).ok).toBe(true);
  });
  it("Role Enablement requiere tareas obligatorias de Mindset aprobadas", () => {
    expect(advanceGate("AI_MINDSET", "ROLE_ENABLEMENT", ctx).ok).toBe(false);
    expect(advanceGate("AI_MINDSET", "ROLE_ENABLEMENT", { ...ctx, approvedCapsules: ["a", "b"] }).ok).toBe(true);
  });
  it("AI Lab requiere certificación aprobada y verificada", () => {
    expect(advanceGate("ROLE_ENABLEMENT", "AI_LAB_SHOWCASE", { ...ctx, certification: { result: "PASSED", status: "PENDING_REVIEW" } }).ok).toBe(false);
    expect(advanceGate("ROLE_ENABLEMENT", "AI_LAB_SHOWCASE", { ...ctx, certification: { result: "PASSED", status: "VERIFIED" } }).ok).toBe(true);
  });
  it("no se saltan capas", () => {
    expect(advanceGate("AI_MINDSET", "AI_LAB_SHOWCASE", ctx).ok).toBe(false);
  });
});

describe("utilidades", () => {
  it("semana del feedback = lunes (hora de Chile)", () => {
    expect(weekStart(new Date("2026-10-15T15:00:00Z"))).toBe("2026-10-12"); // jueves
    expect(weekStart(new Date("2026-10-12T02:00:00Z"))).toBe("2026-10-05"); // domingo 23:00 en Chile
  });
  it("AI CERT: dos intentos financiados", () => {
    expect(certificationAttemptNote(1)).toMatch(/segundo intento financiado/);
    expect(certificationAttemptNote(2)).toMatch(/no financia/);
  });
  it("videos embebibles", () => {
    expect(embedUrl("https://www.youtube.com/watch?v=abc123").src).toBe("https://www.youtube-nocookie.com/embed/abc123");
    expect(embedUrl("https://vimeo.com/12345").src).toBe("https://player.vimeo.com/video/12345");
    expect(embedUrl("https://x.cl/v.mp4").kind).toBe("video");
  });
  it("nombres de archivo seguros", () => {
    expect(safeFileName("Tarea Mindset (versión 2).pdf")).toBe("Tarea-Mindset-version-2-.pdf");
    expect(safeFileName("../../etc/passwd")).not.toContain("/");
  });
});
