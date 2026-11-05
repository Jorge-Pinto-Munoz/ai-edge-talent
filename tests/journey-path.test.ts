import { describe, expect, it } from "vitest";
import { buildJourneyPath, type PathInput } from "@/lib/journey/path";

const caps: PathInput["capsules"] = [
  { id: "m1", layer: "AI_MINDSET", position: 1, title: "Qué es AI First", task_prompt: null, task_required: false, duration_min: 12 },
  { id: "m2", layer: "AI_MINDSET", position: 2, title: "Rediseña una actividad", task_prompt: "Entrega…", task_required: true, duration_min: 20 },
  { id: "r1", layer: "ROLE_ENABLEMENT", position: 1, title: "Ruta AI+ Developer", task_prompt: null, task_required: false, duration_min: null },
];
const base: PathInput = { layer: "AI_MINDSET", capsules: caps, completed: new Set(), submissions: [], certifications: [], lab: null };

describe("camino del profesional", () => {
  it("las etapas anteriores quedan logradas y las siguientes bloqueadas", () => {
    const p = buildJourneyPath(base);
    expect(p.stages.map((s) => s.state)).toEqual(["done", "current", "locked", "locked", "locked", "locked"]);
    expect(p.stages.map((s) => s.layer)).toEqual(["ASSESSMENT", "AI_MINDSET", "ROLE_ENABLEMENT", "AI_LAB_SHOWCASE", "SHOWCASE", "CLOSURE"]);
    expect(p.stages[0].nodes.every((n) => n.state === "done")).toBe(true);
    expect(p.stages[2].nodes.every((n) => n.state === "locked" && !n.cta)).toBe(true);
  });

  it("el siguiente paso es el primer hito accionable de la etapa actual", () => {
    const p = buildJourneyPath(base);
    expect(p.next).toMatchObject({ id: "cap-m1", state: "current", cta: "Ver la cápsula", stage: "AI_MINDSET" });
  });

  it("una tarea obligatoria entregada queda en revisión y el siguiente paso avanza", () => {
    const p = buildJourneyPath({ ...base, completed: new Set(["m1", "m2"]), submissions: [{ capsule_id: "m2", status: "SUBMITTED", attempt: 1 }] });
    expect(p.stages[1].nodes.map((n) => n.state)).toEqual(["done", "review"]);
    expect(p.next).toBeNull();
  });

  it("vista sin tarea entregada pide entregar", () => {
    const p = buildJourneyPath({ ...base, completed: new Set(["m1", "m2"]) });
    expect(p.next).toMatchObject({ id: "cap-m2", cta: "Entregar la tarea" });
  });

  it("no aprobada invita a volver a entregar", () => {
    const p = buildJourneyPath({ ...base, completed: new Set(["m1", "m2"]), submissions: [{ capsule_id: "m2", status: "NOT_APPROVED", attempt: 1 }] });
    expect(p.next?.cta).toBe("Volver a entregar");
  });

  it("Role Enablement: la certificación verificada cierra la etapa", () => {
    const p = buildJourneyPath({ ...base, layer: "ROLE_ENABLEMENT", completed: new Set(["r1"]), certifications: [{ result: "PASSED", status: "VERIFIED" }] });
    expect(p.stages[2].nodes.at(-1)?.state).toBe("done");
    const pending = buildJourneyPath({ ...base, layer: "ROLE_ENABLEMENT", completed: new Set(["r1"]), certifications: [{ result: "PASSED", status: "PENDING_REVIEW" }] });
    expect(pending.stages[2].nodes.at(-1)?.state).toBe("review");
  });

  it("Role Enablement: 4 sesiones semanales con check-in", () => {
    const p = buildJourneyPath({ ...base, layer: "ROLE_ENABLEMENT", sessions: [{ n: 1, held: true, checkedIn: true }, { n: 2, held: true, checkedIn: false }] });
    const ses = p.stages[2].nodes.filter((n) => n.kind === "session");
    expect(ses.map((n) => n.session)).toEqual([1, 2, 3, 4]);
    expect(ses.map((n) => n.state)).toEqual(["done", "current", "available", "available"]);
    expect(ses[1].hint).toMatch(/check-in/);
  });

  it("AI Lab: clase 1, proyecto descrito y clase 2 (sin Showcase)", () => {
    const p = buildJourneyPath({ ...base, layer: "AI_LAB_SHOWCASE", lab: { status: "BUILDING", files: 0 } });
    expect(p.stages[3].nodes.map((n) => n.kind)).toEqual(["lab-class", "project", "lab-class"]);
    expect(p.stages[3].nodes.map((n) => n.state)).toEqual(["done", "current", "available"]);
    const ready = buildJourneyPath({ ...base, layer: "AI_LAB_SHOWCASE", lab: { status: "READY", files: 2, described: true } });
    expect(ready.stages[3].nodes.every((n) => n.state === "done")).toBe(true);
  });

  it("Showcase: presentación final y presentación al cliente", () => {
    const p = buildJourneyPath({ ...base, layer: "SHOWCASE", lab: { status: "READY", files: 2, described: true, final: false } });
    expect(p.stages[3].state).toBe("done");
    expect(p.stages[4].nodes.map((n) => n.kind)).toEqual(["presentation", "showcase"]);
    expect(p.next).toMatchObject({ id: "show-ppt", stage: "SHOWCASE" });
    const done = buildJourneyPath({ ...base, layer: "SHOWCASE", lab: { status: "PRESENTED", files: 2, final: true } });
    expect(done.stages[4].nodes.every((n) => n.state === "done")).toBe(true);
  });

  it("inscrito sin etapa: AI Mindset es la etapa actual", () => {
    const p = buildJourneyPath({ ...base, layer: null });
    expect(p.notStarted).toBe(true);
    expect(p.currentLayer).toBe("AI_MINDSET");
  });

  it("calcula el avance total", () => {
    const p = buildJourneyPath(base);
    const total = p.stages.reduce((a, s) => a + s.total, 0);
    expect(p.percent).toBe(Math.round((3 / total) * 100));
  });
});

import { efficiency } from "@/lib/data/showcase";
describe("calculadora de eficiencia del Showcase", () => {
  it("reproduce el ejemplo de la guía: 8 h → 3 h, 4 veces al mes", () => {
    expect(efficiency(8, 3, 4)).toEqual({ savedPerTime: 5, savedPerMonth: 20, pct: 63 });
  });
  it("no calcula con datos imposibles", () => {
    expect(efficiency(0, 0, 4)).toBeNull();
    expect(efficiency(3, 8, 4)).toBeNull();
  });
});
