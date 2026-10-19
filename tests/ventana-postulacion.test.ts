import { describe, expect, it } from "vitest";
import { applicationWindow } from "@/lib/admission/window";
import { chileToIso, isoToChileLocal } from "@/lib/time/chile";

const now = Date.parse("2026-10-19T12:00:00Z");
describe("ventana de postulación", () => {
  it("abierta, programada y cerrada", () => {
    expect(applicationWindow({ application_deadline: null }, now)).toBe("open");
    expect(applicationWindow({ application_deadline: "2026-10-19T15:00:00Z" }, now)).toBe("open");
    expect(applicationWindow({ application_deadline: "2026-10-19T11:00:00Z" }, now)).toBe("closed");
    expect(applicationWindow({ application_opens_at: "2026-10-20T12:00:00Z", application_deadline: null }, now)).toBe("scheduled");
  });
  it("hora de Chile ida y vuelta", () => {
    expect(chileToIso("2026-10-19T12:00")).toBe("2026-10-19T15:00:00.000Z");
    expect(isoToChileLocal("2026-10-19T15:00:00.000Z")).toBe("2026-10-19T12:00");
  });
});
