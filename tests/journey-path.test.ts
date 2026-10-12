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
    expect(p.stages.map((s) => s.state)).toEqual(["done", "current", "locked", "locked", "locked"]);
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
    expect(p.stages[2].nodes.every((n) => n.state === "done")).toBe(true);
    const pending = buildJourneyPath({ ...base, layer: "ROLE_ENABLEMENT", completed: new Set(["r1"]), certifications: [{ result: "PASSED", status: "PENDING_REVIEW" }] });
    expect(pending.stages[2].nodes.at(-1)?.state).toBe("review");
  });

  it("AI Lab: proyecto, clase 2, presentación y Showcase", () => {
    const p = buildJourneyPath({ ...base, layer: "AI_LAB_SHOWCASE", lab: { status: "BUILDING", files: 0 } });
    expect(p.stages[3].nodes.map((n) => n.state)).toEqual(["done", "current", "available", "available"]);
    const done = buildJourneyPath({ ...base, layer: "AI_LAB_SHOWCASE", lab: { status: "PRESENTED", files: 1 } });
    expect(done.stages[3].nodes.every((n) => n.state === "done")).toBe(true);
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
