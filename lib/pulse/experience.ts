/**
 * Avance y experiencia de una Wave, calculados solo con datos reales (sin estimar ni rellenar).
 * - Operacional: dónde está cada persona, qué cerró, qué le falta, quién está bloqueado o atrasado.
 * - Experiencia declarada: pulsos de cierre (satisfacción, aprendizaje, valor, mejoras, aplicación).
 * La experiencia declarada NO es adopción: la adopción se lee en certificaciones, avance AI CERT y casos.
 * Funciones puras: se prueban en tests/experiencia.test.ts.
 */
import { LAYERS, type Layer } from "@/lib/journey/rules";
import { CLOSING_PULSE, type StageStatus } from "@/lib/journey/closure";
import { NOTHING_YET } from "./definitions";

/** Días de referencia por etapa para marcar "retrasado" (referencia operativa, no regla académica). */
export const STAGE_REFERENCE_DAYS: Partial<Record<Layer, number>> = { AI_MINDSET: 45, ROLE_ENABLEMENT: 60, AI_LAB_SHOWCASE: 45, CLOSURE: 21 };
export const CLOSING_LAYERS: Layer[] = ["AI_MINDSET", "ROLE_ENABLEMENT", "AI_LAB_SHOWCASE", "CLOSURE"];
export const TEXT_FIELDS = [
  ["aprendizaje", "Aprendizajes"],
  ["valioso", "Lo más valorado"],
  ["mejorar", "Mejoras propuestas"],
  ["aplicacion", "Aplicaciones al trabajo"],
] as const;
export type TextField = (typeof TEXT_FIELDS)[number][0];

export interface ExpPerson {
  id: string;
  name: string;
  client: string | null;
  delivery: string | null;
  layer: Layer | null;
  layerSince: string | null;
  status: StageStatus;
  accountActive: boolean;
  signedIn: boolean;
  closures: { layer: Layer; requirements_met_at: string | null; closed_at: string | null }[];
  pulses: { pulse: string; created_at: string; answers: Record<string, unknown> }[];
}

const r2 = (x: number) => Math.round(x * 100) / 100;
const avg = (xs: number[]) => (xs.length ? r2(xs.reduce((a, b) => a + b, 0) / xs.length) : null);
const rate = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);
const days = (from: string | null, now: Date) => (from ? (now.getTime() - new Date(from).getTime()) / 86_400_000 : 0);

export const isDelayed = (p: Pick<ExpPerson, "layer" | "layerSince" | "status">, now: Date) => {
  const ref = p.layer ? STAGE_REFERENCE_DAYS[p.layer] : undefined;
  return Boolean(ref && p.status !== "CLOSED" && days(p.layerSince, now) > ref);
};

/** ¿Le corresponde a la persona responder el pulso de cierre de esa etapa? (requisitos cumplidos o etapa ya pasada). */
function expected(p: ExpPerson, layer: Layer): boolean {
  const key = CLOSING_PULSE[layer]!;
  if (p.pulses.some((x) => x.pulse === key)) return true;
  const c = p.closures.find((x) => x.layer === layer);
  if (c?.requirements_met_at || c?.closed_at) return true;
  const i = LAYERS.findIndex((l) => l.id === layer);
  const cur = LAYERS.findIndex((l) => l.id === p.layer);
  return cur > i || (layer === "CLOSURE" && p.layer === "CLOSURE");
}

export function operational(people: ExpPerson[], now = new Date()) {
  const byStage = Object.fromEntries(LAYERS.map((l) => [l.id, people.filter((p) => (p.layer ?? "ASSESSMENT") === l.id).length])) as Record<Layer, number>;
  const closedByStage = Object.fromEntries(CLOSING_LAYERS.map((l) => [l, people.filter((p) => p.closures.some((c) => c.layer === l && c.closed_at)).length])) as Record<Layer, number>;
  return {
    enrolled: people.length,
    active: people.filter((p) => p.accountActive && p.signedIn).length,
    neverSignedIn: people.filter((p) => !p.signedIn).length,
    byStage,
    closedByStage,
    completed: people.filter((p) => p.closures.some((c) => c.layer === "CLOSURE" && c.closed_at)).length,
    academicPending: people.filter((p) => ["AVAILABLE", "IN_PROGRESS", "ACADEMIC_PENDING"].includes(p.status)).length,
    pulsePending: people.filter((p) => p.status === "PULSE_PENDING" || (p.status === "ATTENTION" && p.closures.some((c) => c.layer === p.layer && c.requirements_met_at && !c.closed_at))).length,
    attention: people.filter((p) => p.status === "ATTENTION").length,
    delayed: people.filter((p) => isDelayed(p, now)).length,
  };
}

export interface StageExperience {
  layer: Layer;
  pulse: string;
  expected: number;
  completed: number;
  rate: number | null;
  satisfaction: number | null;
  distribution: number[]; // cantidad de respuestas 1..5
  nothingToImprove: number;
  texts: Record<TextField, { personId: string; name: string; client: string | null; text: string; at: string }[]>;
}

export function stageExperience(people: ExpPerson[], layer: Layer): StageExperience {
  const key = CLOSING_PULSE[layer]!;
  const answers = people.flatMap((p) => p.pulses.filter((x) => x.pulse === key).map((x) => ({ p, x })));
  const sat = answers.map(({ x }) => x.answers.satisfaccion).filter((v): v is number => typeof v === "number");
  const text = (f: TextField) =>
    answers
      .map(({ p, x }) => ({ personId: p.id, name: p.name, client: p.client, text: typeof x.answers[f] === "string" ? String(x.answers[f]).trim() : "", at: x.created_at }))
      .filter((t) => t.text && !(f === "mejorar" && t.text.toLowerCase() === NOTHING_YET.toLowerCase()));
  const exp = people.filter((p) => expected(p, layer)).length;
  return {
    layer,
    pulse: key,
    expected: exp,
    completed: answers.length,
    rate: rate(answers.length, exp),
    satisfaction: avg(sat),
    distribution: [1, 2, 3, 4, 5].map((n) => sat.filter((s) => s === n).length),
    nothingToImprove: answers.filter(({ x }) => String(x.answers.mejorar ?? "").trim().toLowerCase() === NOTHING_YET.toLowerCase()).length,
    texts: Object.fromEntries(TEXT_FIELDS.map(([f]) => [f, text(f)])) as StageExperience["texts"],
  };
}

export function experience(people: ExpPerson[]) {
  const stages = CLOSING_LAYERS.map((l) => stageExperience(people, l));
  const expectedN = stages.reduce((s, x) => s + x.expected, 0);
  const completedN = stages.reduce((s, x) => s + x.completed, 0);
  const sat = people.flatMap((p) => p.pulses.filter((x) => CLOSING_LAYERS.some((l) => CLOSING_PULSE[l] === x.pulse)).map((x) => x.answers.satisfaccion)).filter((v): v is number => typeof v === "number");
  return {
    expected: expectedN,
    completed: completedN,
    rate: rate(completedN, expectedN),
    satisfaction: avg(sat),
    satisfactionN: sat.length,
    stages,
    /** Evolución: satisfacción promedio a lo largo de las etapas (solo etapas con respuestas). */
    evolution: stages.filter((s) => s.satisfaction !== null).map((s) => ({ layer: s.layer, satisfaction: s.satisfaction!, n: s.completed })),
  };
}

/** Satisfacción de cada persona por etapa (nivel detalle). */
export function personSatisfaction(p: ExpPerson): Partial<Record<Layer, number>> {
  const out: Partial<Record<Layer, number>> = {};
  for (const l of CLOSING_LAYERS) {
    const a = p.pulses.find((x) => x.pulse === CLOSING_PULSE[l])?.answers.satisfaccion;
    if (typeof a === "number") out[l] = a;
  }
  return out;
}

export interface ExpFilters { layer?: string; client?: string; delivery?: string; status?: string }
export function applyFilters(people: ExpPerson[], f: ExpFilters): ExpPerson[] {
  return people.filter(
    (p) =>
      (!f.layer || (p.layer ?? "ASSESSMENT") === f.layer) &&
      (!f.client || p.client === f.client) &&
      (!f.delivery || (f.delivery === "none" ? !p.delivery : p.delivery === f.delivery)) &&
      (!f.status || p.status === f.status),
  );
}
