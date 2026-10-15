import { describe, expect, it } from "vitest";
import { rescueEligibility, rescueOpen, rescueState, timeLeft } from "@/lib/admission/rescue";

const now = new Date("2026-10-20T12:00:00Z");
const inv = (hoursLeft: number | null, started = false) => ({ expires_at: hoursLeft === null ? null : new Date(now.getTime() + hoursLeft * 3_600_000).toISOString(), started_at: started ? now.toISOString() : null });

describe("rescate con plazo", () => {
  it("sin invitación no existe rescate (ni se puede entregar)", () => {
    expect(rescueState({ status: "NOT_SELECTED", invitation: null, video: null }, now)).toBe("none");
    expect(rescueOpen({ status: "RESCUE_REQUIRED", invitation: null, video: null }, now)).toBe(false);
  });
  it("disponible → en preparación → enviado → en revisión", () => {
    expect(rescueState({ status: "RESCUE_REQUIRED", invitation: inv(10), video: null }, now)).toBe("available");
    expect(rescueState({ status: "RESCUE_REQUIRED", invitation: inv(10, true), video: null }, now)).toBe("preparing");
    expect(rescueState({ status: "RESCUE_REQUIRED", invitation: inv(10), video: { submitted_at: now.toISOString(), reviewed_at: null } }, now)).toBe("submitted");
    expect(rescueState({ status: "RESCUE_REQUIRED", invitation: inv(10), video: { submitted_at: now.toISOString(), reviewed_at: now.toISOString() } }, now)).toBe("in_review");
  });
  it("vence a las 24 h: ya no se puede entregar", () => {
    const expired = inv(-0.01);
    expect(rescueState({ status: "RESCUE_REQUIRED", invitation: expired, video: null }, now)).toBe("expired");
    expect(rescueOpen({ status: "RESCUE_REQUIRED", invitation: expired, video: null }, now)).toBe(false);
    expect(rescueOpen({ status: "RESCUE_REQUIRED", invitation: inv(0.5), video: null }, now)).toBe(true);
  });
  it("decisión final tras el video", () => {
    const video = { submitted_at: now.toISOString(), reviewed_at: now.toISOString() };
    expect(rescueState({ status: "SELECTED", invitation: inv(-5), video }, now)).toBe("approved");
    expect(rescueState({ status: "NOT_SELECTED", invitation: inv(-5), video }, now)).toBe("not_approved");
  });
  it("tiempo restante legible", () => {
    expect(timeLeft(new Date(now.getTime() + 23 * 3_600_000 + 10 * 60_000).toISOString(), now)).toBe("23 h 10 min");
    expect(timeLeft(new Date(now.getTime() - 1000).toISOString(), now)).toBe("0 min");
  });
  it("elegibilidad: bajo el corte, evaluado y una sola vez", () => {
    expect(rescueEligibility({ status: "ASSESSMENT_EVALUATED", level: "D", recommendation: "RESCUE_REQUIRED", pl: "ACTIVAR_RESCATE", hadInvitation: false }).ok).toBe(true);
    expect(rescueEligibility({ status: "ASSESSMENT_EVALUATED", level: "B", recommendation: "SELECTED", pl: "SELECCIONAR", hadInvitation: false }).ok).toBe(false);
    expect(rescueEligibility({ status: "ASSESSMENT_EVALUATED", level: "D", recommendation: null, pl: null, hadInvitation: true }).ok).toBe(false);
    expect(rescueEligibility({ status: "APPLICATION_SUBMITTED", level: null, recommendation: null, pl: null, hadInvitation: false }).ok).toBe(false);
  });
});
