import { describe, expect, it } from "vitest";
import { DEFAULT_REMINDERS, deliveryAlertDue, reminderDue } from "@/lib/reminders/rules";
import { applyFilters, experience, operational, stageExperience, type ExpPerson } from "@/lib/pulse/experience";

const NOW = new Date("2026-10-13T12:00:00Z");
const ago = (d: number) => new Date(NOW.getTime() - d * 86_400_000).toISOString();

describe("recordatorios", () => {
  const s = DEFAULT_REMINDERS; // cada 3 días, máx 3, Delivery a los 5
  it("no recuerda antes de tiempo ni después del máximo", () => {
    expect(reminderDue({ requirements_met_at: ago(2), last_reminder_at: null, reminders_sent: 0, delivery_alerted_at: null }, s, NOW)).toBe(false);
    expect(reminderDue({ requirements_met_at: ago(3), last_reminder_at: null, reminders_sent: 0, delivery_alerted_at: null }, s, NOW)).toBe(true);
    expect(reminderDue({ requirements_met_at: ago(10), last_reminder_at: ago(1), reminders_sent: 1, delivery_alerted_at: null }, s, NOW)).toBe(false);
    expect(reminderDue({ requirements_met_at: ago(30), last_reminder_at: ago(10), reminders_sent: 3, delivery_alerted_at: null }, s, NOW)).toBe(false);
  });
  it("avisa al Delivery una sola vez y solo si hay Delivery asignado", () => {
    const c = { requirements_met_at: ago(6), last_reminder_at: null, reminders_sent: 0, delivery_alerted_at: null };
    expect(deliveryAlertDue(c, s, NOW, true)).toBe(true);
    expect(deliveryAlertDue(c, s, NOW, false)).toBe(false);
    expect(deliveryAlertDue({ ...c, delivery_alerted_at: ago(1) }, s, NOW, true)).toBe(false);
    expect(deliveryAlertDue({ ...c, requirements_met_at: ago(4) }, s, NOW, true)).toBe(false);
  });
});

const person = (x: Partial<ExpPerson>): ExpPerson => ({ id: "x", name: "P", client: "A", delivery: null, layer: "AI_MINDSET", layerSince: ago(5), status: "IN_PROGRESS", accountActive: true, signedIn: true, closures: [], pulses: [], ...x });
const core = (sat: number, mejorar = "Más ejemplos") => ({ satisfaccion: sat, aprendizaje: "Prompts", valioso: "Casos", mejorar, aplicacion: "Reportes" });

describe("avance y experiencia", () => {
  const people = [
    person({ id: "a", layer: "ROLE_ENABLEMENT", closures: [{ layer: "AI_MINDSET", requirements_met_at: ago(9), closed_at: ago(8) }], pulses: [{ pulse: "MINDSET", created_at: ago(8), answers: core(5, "Nada por ahora") }], delivery: "d@k.cl" }),
    person({ id: "b", status: "PULSE_PENDING", closures: [{ layer: "AI_MINDSET", requirements_met_at: ago(2), closed_at: null }], client: "B" }),
    person({ id: "c", signedIn: false, layerSince: ago(60) }),
  ];
  it("operacional: no inventa; cuenta lo que hay", () => {
    const o = operational(people, NOW);
    expect(o).toMatchObject({ enrolled: 3, active: 2, neverSignedIn: 1, pulsePending: 1, delayed: 1, completed: 0 });
    expect(o.closedByStage.AI_MINDSET).toBe(1);
  });
  it("experiencia: esperados = requisitos cumplidos; «Nada por ahora» no cuenta como mejora", () => {
    const m = stageExperience(people, "AI_MINDSET");
    expect(m).toMatchObject({ expected: 2, completed: 1, rate: 50, satisfaction: 5, nothingToImprove: 1 });
    expect(m.texts.mejorar).toHaveLength(0);
    expect(m.texts.aprendizaje[0].text).toBe("Prompts");
    expect(experience(people).satisfaction).toBe(5);
    expect(experience([]).rate).toBeNull();
  });
  it("filtros por etapa, cliente y Delivery (incluido sin asignar)", () => {
    expect(applyFilters(people, { client: "B" }).map((p) => p.id)).toEqual(["b"]);
    expect(applyFilters(people, { delivery: "none" }).map((p) => p.id)).toEqual(["b", "c"]);
    expect(applyFilters(people, { layer: "ROLE_ENABLEMENT" }).map((p) => p.id)).toEqual(["a"]);
  });
});
