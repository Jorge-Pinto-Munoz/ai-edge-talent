import { describe, expect, it } from "vitest";
import { attendanceMatch, cleanSelfProgress, cleanSession, type SessionInput } from "@/lib/teacher/sessions-rules";

const base: SessionInput = { waveId: "w", n: 1, heldOn: "2026-11-03", title: " Prompting ", studentNotes: " notas ", adminComments: "", materials: [], attendance: [] };

describe("sesiones de Role Enablement", () => {
  it("son 4: semana 1 a 4", () => {
    expect(() => cleanSession({ ...base, n: 5 }, "2026-11-05")).toThrow(/4 sesiones/);
    expect(() => cleanSession({ ...base, n: 0 }, "2026-11-05")).toThrow();
    expect(cleanSession({ ...base, n: 4 }, "2026-11-05").title).toBe("Prompting");
  });
  it("la asistencia exige fecha y no puede ser futura", () => {
    const a = [{ candidateId: "c", attended: true, focus: "OK" as const, note: "" }];
    expect(() => cleanSession({ ...base, heldOn: "", attendance: a }, "2026-11-05")).toThrow(/fecha/);
    expect(() => cleanSession({ ...base, heldOn: "2026-11-09", attendance: a }, "2026-11-05")).toThrow(/día de la sesión/);
    expect(cleanSession({ ...base, attendance: a }, "2026-11-05").attendance).toHaveLength(1);
  });
  it("una sesión futura se puede programar con notas, sin asistencia", () => {
    expect(cleanSession({ ...base, heldOn: "2026-11-20" }, "2026-11-05").heldOn).toBe("2026-11-20");
  });
  it("cruza el check-in con la asistencia del profesor", () => {
    expect(attendanceMatch(true, true)).toBe("ok");
    expect(attendanceMatch(true, false)).toBe("attended-no-checkin");
    expect(attendanceMatch(false, true)).toBe("absent-checkin");
    expect(attendanceMatch(null, true)).toBe("checkin-only");
    expect(attendanceMatch(null, false)).toBe("pending");
  });
  it("valida el avance AI CERT reportado por el profesional", () => {
    expect(cleanSelfProgress({ course: "INTRO", tramo: 2, percent: 45, note: " ok " })).toEqual({ course: "INTRO", tramo: 2, percent: 45, note: "ok" });
    expect(() => cleanSelfProgress({ course: "X", tramo: 1, percent: 1, note: "" })).toThrow();
    expect(() => cleanSelfProgress({ course: "INTRO", tramo: 6, percent: 1, note: "" })).toThrow(/tramo/);
    expect(() => cleanSelfProgress({ course: "INTRO", tramo: 1, percent: 101, note: "" })).toThrow(/porcentaje/);
  });
});
