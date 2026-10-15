import { describe, expect, it } from "vitest";
import { chipFromParams, queueView } from "@/lib/admission/queue";
import { openingStatus } from "@/lib/journey/opening-labels";

const now = new Date("2026-10-20T12:00:00Z");
const inv = (h: number, started = false) => ({ expires_at: new Date(now.getTime() + h * 3_600_000).toISOString(), started_at: started ? now.toISOString() : null, submitted_at: null, reviewed_at: null });

describe("cola de admisión", () => {
  it("prioriza rescate enviado, luego evaluados por decidir, luego otras acciones", () => {
    const sent = queueView({ status: "RESCUE_REQUIRED", hasEval: true, rescue: { ...inv(5), submitted_at: now.toISOString() } }, now);
    const evald = queueView({ status: "ASSESSMENT_EVALUATED", hasEval: true, rescue: null }, now);
    const toEval = queueView({ status: "APPLICATION_SUBMITTED", hasEval: false, rescue: null }, now);
    const applying = queueView({ status: "APPLICATION_STARTED", hasEval: false, rescue: null }, now);
    const enrolled = queueView({ status: "ENROLLED", hasEval: true, rescue: null }, now);
    const closed = queueView({ status: "NOT_SELECTED", hasEval: true, rescue: null }, now);
    expect([sent, evald, toEval, applying, enrolled, closed].map((v) => v.priority)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(sent.primary).toBe("review_rescue");
    expect(evald.primary).toBe("review");
    expect(toEval.primary).toBe("evaluate_ai");
    expect(closed.primary).toBeNull();
  });
  it("rescate vencido sin video pide decidir y aparece en 'Requieren decisión'", () => {
    const v = queueView({ status: "RESCUE_REQUIRED", hasEval: true, rescue: inv(-1) }, now);
    expect(v.rescue).toBe("expired");
    expect(v.primary).toBe("decide_expired");
    expect(v.chips).toContain("decision");
  });
  it("rescate abierto esperando video no exige acción", () => {
    const v = queueView({ status: "RESCUE_REQUIRED", hasEval: true, rescue: inv(10, true) }, now);
    expect(v.rescue).toBe("preparing");
    expect(v.primary).toBeNull();
    expect(v.chips).toEqual(["rescate"]);
  });
  it("filtros desde la URL", () => {
    expect(chipFromParams("rescate")).toBe("rescate");
    expect(chipFromParams(undefined, "APPLICATION_SUBMITTED")).toBe("assessment");
    expect(chipFromParams("cualquiera")).toBe("todos");
  });
});

describe("apertura de AI First Mindset", () => {
  it("cerrada, programada, abierta y finalizada", () => {
    expect(openingStatus(null, 3, 3, now)).toBe("closed");
    expect(openingStatus("2026-10-21T12:00:00Z", 3, 3, now)).toBe("scheduled");
    expect(openingStatus("2026-10-19T12:00:00Z", 3, 3, now)).toBe("open");
    expect(openingStatus("2026-10-19T12:00:00Z", 0, 3, now)).toBe("finished");
    expect(openingStatus("2026-10-19T12:00:00Z", 0, 0, now)).toBe("open");
  });
});
