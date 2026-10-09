import { describe, expect, it } from "vitest";
import { fmtDate, fmtDay, fmtDeadline } from "@/components/ui";

describe("formato de fechas (hora de Chile)", () => {
  it("deadline Wave 3", () => {
    expect(fmtDeadline("2026-10-16T12:00:00-03:00")).toBe("viernes, 16 de octubre de 2026 · 12:00 hrs");
    expect(fmtDay("2026-10-16T12:00:00-03:00")).toBe("viernes, 16 de octubre de 2026");
    expect(fmtDate("2026-10-01T10:00:00-03:00")).toBe("1 de octubre de 2026, 10:00");
  });
});
