import { describe, expect, it } from "vitest";
import { admissionStep, STALLED_DAYS } from "@/lib/admission/delivery-progress";

const now = new Date("2026-10-13T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

describe("admissionStep", () => {
  it("distingue registrado, respondiendo y enviado", () => {
    expect(admissionStep("IDENTIFIED", now, now).label).toMatch(/sin empezar/);
    expect(admissionStep("APPLICATION_STARTED", now, now).label).toMatch(/sin enviar/);
    expect(admissionStep("HUMAN_REVIEW", now, now).label).toBe("Assessment enviado");
  });
  it("marca falta de firma tras la selección", () => {
    expect(admissionStep("CONDITIONS_PENDING", now, now).label).toMatch(/falta firmar/);
  });
  it("marca detenido solo mientras postula y sin movimiento", () => {
    expect(admissionStep("APPLICATION_STARTED", daysAgo(STALLED_DAYS + 1), now).stalled).toBe(true);
    expect(admissionStep("APPLICATION_STARTED", daysAgo(1), now).stalled).toBe(false);
    expect(admissionStep("APPLICATION_SUBMITTED", daysAgo(30), now).stalled).toBe(false);
  });
});
