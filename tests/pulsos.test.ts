import { describe, expect, it } from "vitest";
import { pulseDef } from "@/lib/pulse/definitions";
import { dueClientPulse, duePulse, duePulses, efficiency, enablementIndicators, enablementPerson, mindsetIndicators, nps, pairEfficiency, validateAnswers, verifiedProgress } from "@/lib/pulse/rules";
import { aicertAlert, overallProgress, progressLabel, type AiCertProgress } from "@/lib/aicert/progress";

const NOW = new Date("2026-10-12T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

describe("pulsos: cuándo aparecen", () => {
  it("al inicio pide el pulso de inicio", () => {
    expect(duePulse({ layer: "AI_MINDSET", layerSince: daysAgo(2), labStatus: null, answered: [], now: NOW })).toBe("INICIO");
  });
  it("el pulso de cierre de Mindset se habilita solo con los requisitos cumplidos", () => {
    expect(duePulses({ layer: "AI_MINDSET", layerSince: daysAgo(2), labStatus: null, answered: ["INICIO"], now: NOW })).toEqual([]);
    expect(duePulses({ layer: "AI_MINDSET", layerSince: daysAgo(2), labStatus: null, answered: ["INICIO"], requirementsMet: true, now: NOW })).toEqual(["MINDSET"]);
  });
  it("Role Enablement: el cierre se habilita con la AI CERT verificada; el intermedio no compite con él", () => {
    expect(duePulses({ layer: "ROLE_ENABLEMENT", layerSince: daysAgo(20), labStatus: null, answered: ["INICIO", "MINDSET"], requirementsMet: true, now: NOW })).toEqual(["HAB_CIERRE"]);
  });
  it("quien pasó de etapa antes de esta regla aún puede responder el pulso pendiente (sin bloquear)", () => {
    expect(duePulses({ layer: "ROLE_ENABLEMENT", layerSince: daysAgo(3), labStatus: null, answered: ["INICIO"], now: NOW })).toEqual(["MINDSET"]);
    expect(duePulses({ layer: "ROLE_ENABLEMENT", layerSince: daysAgo(15), labStatus: null, answered: ["INICIO", "MINDSET"], now: NOW })).toEqual(["HAB_INTERMEDIO"]);
  });
  it("en AI Lab pide el cierre de habilitación y, tras el Showcase, el del Lab", () => {
    expect(duePulses({ layer: "AI_LAB_SHOWCASE", layerSince: daysAgo(1), labStatus: "BUILDING", answered: ["INICIO", "MINDSET"], now: NOW })).toEqual(["HAB_CIERRE"]);
    expect(duePulse({ layer: "AI_LAB_SHOWCASE", layerSince: daysAgo(1), labStatus: "PRESENTED", answered: ["MINDSET", "HAB_CIERRE"], now: NOW })).toBeNull();
    expect(duePulse({ layer: "AI_LAB_SHOWCASE", layerSince: daysAgo(1), labStatus: "PRESENTED", answered: ["MINDSET", "HAB_CIERRE"], requirementsMet: true, now: NOW })).toBe("LAB");
  });
  it("en Cierre pide el final; el de inicio ya no se ofrece", () => {
    expect(duePulses({ layer: "CLOSURE", layerSince: daysAgo(1), labStatus: "PRESENTED", answered: ["MINDSET", "HAB_CIERRE", "LAB"], now: NOW })).toEqual(["FINAL"]);
  });
  it("cliente: inicio cuando hay gente en el journey; final cuando alguien llega al cierre", () => {
    expect(dueClientPulse([], [])).toBeNull();
    expect(dueClientPulse(["AI_MINDSET"], [])).toBe("CLIENTE_INICIO");
    expect(dueClientPulse(["AI_MINDSET"], ["CLIENTE_INICIO"])).toBeNull();
    expect(dueClientPulse(["CLOSURE", "AI_LAB_SHOWCASE"], ["CLIENTE_INICIO"])).toBe("CLIENTE_FINAL");
  });
});

describe("pulsos: validación", () => {
  const def = pulseDef("INICIO")!;
  it("exige las obligatorias y normaliza", () => {
    expect(() => validateAnswers(def, { ai_freq: "Todos los días" })).toThrow(/Falta responder/);
    expect(validateAnswers(def, { ai_freq: "Todos los días", hours: "6.3", tasks: "  reportes " })).toEqual({ ai_freq: "Todos los días", hours: 6.5, tasks: "reportes" });
  });
  it("rechaza valores fuera de rango u opciones inventadas", () => {
    expect(() => validateAnswers(def, { ai_freq: "Siempre", hours: 4 })).toThrow();
    expect(() => validateAnswers(def, { ai_freq: "Todos los días", hours: 200 })).toThrow(/80/);
    expect(() => validateAnswers(pulseDef("MINDSET")!, { m_expectativas: 6 })).toThrow();
  });
  it("pulsos de cierre: las cinco preguntas base son obligatorias; textos vacíos o con espacios no cuentan", () => {
    const fin = pulseDef("FINAL")!;
    const ok = { satisfaccion: 5, aprendizaje: "A usar agentes", valioso: "El Lab", mejorar: "Nada por ahora", aplicacion: "Automatizar reportes", ai_freq: "Todos los días", hours: 3, nps: 10 };
    expect(validateAnswers(fin, ok)).toMatchObject({ satisfaccion: 5, mejorar: "Nada por ahora" });
    expect(() => validateAnswers(fin, { ...ok, aprendizaje: "   " })).toThrow(/Falta responder/);
    expect(() => validateAnswers(fin, { ...ok, valioso: "ok" })).toThrow(/un poco más/);
    expect(() => validateAnswers(fin, { ...ok, satisfaccion: 0 })).toThrow();
    const { mejorar: _m, ...sinMejorar } = ok;
    expect(() => validateAnswers(fin, sinMejorar)).toThrow(/mejorar/);
  });
});

describe("indicadores", () => {
  it("NPS como en el informe W2: 11 promotores y 2 pasivos de 13 = 85", () => {
    expect(nps([...Array(11).fill(10), 8, 7])!.nps).toBe(85);
  });
  const base = { cap_comprender: 4, cap_aplicar: 4, cap_corregir: 3, cap_refuerzo: 4, cap_estrategia: 4, gpc_before: 3, gpc_now: 4, progress: true, evidence: "Terminé el módulo 3 y automaticé el reporte semanal de ventas con un agente.", icp: 8, barrier: "Ninguna", auto_org: 4, auto_strategy: 4 };
  it("lectura individual: ICAA, GPC, TAE, TAI y TIIC", () => {
    const p = enablementPerson(base, true);
    expect(p).toMatchObject({ icaa: 70, gpc: 1, tae: true, tai: true, tri: false, tiic: true });
    expect(enablementPerson({ ...base, evidence: "avancé harto" }, true).tae).toBe(false);
    expect(enablementPerson(base, false).tiic).toBe(false);
  });
  it("TRB y TRI con barreras", () => {
    const ind = enablementIndicators([
      { a: base, tpv: true },
      { a: { ...base, barrier: "Falta de tiempo", barrier_sev: 4, barrier_change: "Disminuyó un poco" }, tpv: false },
      { a: { ...base, barrier: "Idioma", barrier_sev: 2, barrier_change: "Se resolvió", gpc_now: 2 }, tpv: true },
    ]);
    expect(ind.TRB).toBe(50);
    expect(ind.TRI).toBe(33.3);
    expect(ind.TPV).toBe(66.7);
    expect(ind.GPC).toBe(0.33);
  });
  it("TPV: avance entre T0 y el pulso, o certificación", () => {
    const pts = [{ candidate_id: "a", overall: 20, at: daysAgo(10) }, { candidate_id: "a", overall: 40, at: daysAgo(2) }, { candidate_id: "b", overall: 30, at: daysAgo(5) }];
    expect(verifiedProgress(pts, "a", daysAgo(1), false)).toBe(true);
    expect(verifiedProgress(pts, "a", daysAgo(5), false)).toBe(false);
    expect(verifiedProgress(pts, "b", daysAgo(1), false)).toBe(false);
    expect(verifiedProgress(pts, "b", daysAgo(1), true)).toBe(true);
  });
  it("Mindset: calidad promedio de los ítems", () => {
    const m = mindsetIndicators([{ m_expectativas: 5, m_ritmo: 4, nps: 10 }, { m_expectativas: 4, m_ritmo: 4, nps: 9 }]);
    expect(m.items[0].avg).toBe(4.5);
    expect(m.quality).toBe(4.25);
    expect(m.nps!.nps).toBe(100);
  });
  it("eficiencia pre/post solo con pares completos", () => {
    expect(efficiency([{ before: 10, after: 6 }, { before: 10, after: 8 }])).toEqual({ n: 2, before: 20, after: 14, savedHours: 6, savedPct: 30 });
    const rows = [
      { pulse: "INICIO", candidate_id: "a", client_name: null, created_at: daysAgo(30), answers: { hours: 10 } },
      { pulse: "FINAL", candidate_id: "a", client_name: null, created_at: daysAgo(1), answers: { hours: 7 } },
      { pulse: "INICIO", candidate_id: "b", client_name: null, created_at: daysAgo(30), answers: { hours: 8 } },
    ];
    expect(pairEfficiency(rows, (r) => r.candidate_id, "INICIO", "FINAL")).toMatchObject({ n: 1, savedPct: 30 });
  });
});

describe("avance AI CERT por tramos", () => {
  const prog = (p: Partial<AiCertProgress>): AiCertProgress => ({ course: "INTRO", tramo: 0, percent: 0, intro_course: null, specialist_course: null, exam_date: null, note: null, updated_at: daysAgo(1), ...p });
  it("el introductorio es la primera mitad de la ruta", () => {
    expect(overallProgress(prog({ course: "INTRO", percent: 80 }))).toBe(40);
    expect(overallProgress(prog({ course: "SPECIALIST", percent: 60 }))).toBe(80);
    expect(progressLabel(prog({ course: "SPECIALIST", tramo: 4, percent: 80 }))).toBe("Especialista · Tramo 4 · 80%");
  });
  it("alertas con nivel y acción recomendada", () => {
    expect(aicertAlert({ progress: null, daysInStage: 10, now: NOW })?.level).toBe("Alta");
    expect(aicertAlert({ progress: prog({ course: "INTRO", tramo: 1, percent: 10 }), daysInStage: 21, now: NOW })).toMatchObject({ level: "Alta", action: expect.stringMatching(/Microplan/) });
    expect(aicertAlert({ progress: prog({ course: "SPECIALIST", tramo: 2, percent: 30 }), daysInStage: 14, attendance: 0.5, now: NOW })?.level).toBe("Media");
    expect(aicertAlert({ progress: prog({ course: "SPECIALIST", tramo: 5, percent: 90 }), daysInStage: 20, now: NOW })).toMatchObject({ level: "Preventiva", action: expect.stringMatching(/examen/) });
    expect(aicertAlert({ progress: prog({ course: "SPECIALIST", tramo: 3, percent: 50 }), daysInStage: 14, now: NOW })).toBeNull();
    expect(aicertAlert({ progress: prog({ course: "SPECIALIST", tramo: 3, percent: 50 }), daysInStage: 14, pulse: { icaa: 70, gpc: 0, tri: true, tai: false, barrier: "No tengo claro el siguiente paso", severity: 4 }, now: NOW })?.level).toBe("Alta");
  });
});
