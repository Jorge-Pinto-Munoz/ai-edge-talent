import { describe, expect, it } from "vitest";
import { ADMISSION_LABEL, type AdmissionStatus } from "@/lib/domain/types";
import { PHASES, admissionCounts, capacityView, needsAction, phasesOf } from "@/lib/admission/phases";

const ALL = Object.keys(ADMISSION_LABEL) as AdmissionStatus[];

describe("admisión por fases", () => {
  it("cada estado del sistema tiene un valor coherente en cada fase alcanzada", () => {
    for (const s of ALL) {
      const p = phasesOf(s);
      for (const ph of PHASES) {
        const v = p[ph.key];
        if (v) expect(ph.states).toContain(v);
      }
      // Fases encadenadas: no hay decisión sin postulación enviada, ni incorporación sin selección.
      if (p.decision) expect(p.postulacion).toBe("enviada");
      if (p.incorporacion) expect(p.decision).toBe("seleccionado");
    }
  });
  it("postulación enviada y assessment evaluado conviven (no son alternativas)", () => {
    const p = phasesOf("ASSESSMENT_EVALUATED");
    expect(p.postulacion).toBe("enviada");
    expect(p.assessment).toBe("assessment_evaluado");
    expect(p.decision).toBe("decision_pendiente");
  });
  it("mapea los hitos clave", () => {
    expect(phasesOf("APPLICATION_STARTED").postulacion).toBe("iniciada");
    expect(phasesOf("APPLICATION_SUBMITTED").assessment).toBe("assessment_pendiente");
    expect(phasesOf("HUMAN_REVIEW").assessment).toBe("assessment_en_curso");
    expect(phasesOf("NOT_SELECTED").decision).toBe("no_seleccionado");
    expect(phasesOf("CONDITIONS_PENDING").incorporacion).toBe("inscripcion_pendiente");
    expect(phasesOf("ENROLLED").incorporacion).toBe("inscrito");
  });
  it("los conteos no duplican personas", () => {
    const c = admissionCounts(ALL);
    expect(c.total).toBe(ALL.length);
    expect(c.notStarted + c.started + c.submitted).toBe(ALL.length);
    expect(c.selected).toBe(c.enrollPending + c.enrolled);
    expect(needsAction("ENROLLED")).toBe(false);
    expect(needsAction("ASSESSMENT_EVALUATED")).toBe(true);
  });
});

describe("referencia de capacidad", () => {
  it("12 de 15: 80 % y 3 disponibles", () => {
    expect(capacityView(12, 15)).toMatchObject({ pct: 80, available: 3, over: 0, reached: false });
  });
  it("15 de 15 alcanza la referencia", () => {
    expect(capacityView(15, 15)).toMatchObject({ pct: 100, available: 0, over: 0, reached: true });
  });
  it("18 de 15: la barra no pasa de 100 % y se informan 3 adicionales", () => {
    expect(capacityView(18, 15)).toMatchObject({ pct: 100, available: 0, over: 3, reached: true });
  });
});
