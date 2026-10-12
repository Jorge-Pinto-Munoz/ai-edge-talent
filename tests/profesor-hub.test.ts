import { describe, expect, it } from "vitest";
import { shiftWeek, weekLabel, statusLabel, flagLabel } from "@/lib/teacher/rules";
import { labDecisionLabel, labStatusLabel } from "@/lib/hub/rules";
import { advanceGate } from "@/lib/journey/rules";

describe("cierre semanal del profesor", () => {
  it("mueve semanas de lunes a lunes", () => {
    expect(shiftWeek("2026-10-12", -1)).toBe("2026-10-05");
    expect(shiftWeek("2026-10-26", 1)).toBe("2026-11-02");
  });
  it("rotula la semana", () => {
    expect(weekLabel("2026-10-12")).toBe("12 – 18 oct");
    expect(weekLabel("2026-10-26")).toBe("26 oct – 1 nov");
  });
  it("traduce estado y marca", () => {
    expect(statusLabel("EN_RIESGO")).toBe("En riesgo");
    expect(flagLabel("CONCERN")).toBe("Preocupante");
  });
});

describe("AI Lab", () => {
  const ctx = { admissionStatus: "MINDSET_READY", requiredMindsetCapsules: [], approvedCapsules: [] };
  it("solo pasa al Lab con AI CERT aprobada y verificada", () => {
    expect(advanceGate("ROLE_ENABLEMENT", "AI_LAB_SHOWCASE", { ...ctx, certification: { result: "PASSED", status: "VERIFIED" } }).ok).toBe(true);
    expect(advanceGate("ROLE_ENABLEMENT", "AI_LAB_SHOWCASE", { ...ctx, certification: { result: "PASSED", status: "PENDING_REVIEW" } }).ok).toBe(false);
    expect(advanceGate("ROLE_ENABLEMENT", "AI_LAB_SHOWCASE", { ...ctx, certification: null }).ok).toBe(false);
  });
  it("rotula estados y decisiones", () => {
    expect(labStatusLabel("READY")).toBe("Listo para Showcase");
    expect(labDecisionLabel("PILOTO")).toBe("Piloto con el cliente");
    expect(labDecisionLabel(null)).toBeNull();
  });
});
