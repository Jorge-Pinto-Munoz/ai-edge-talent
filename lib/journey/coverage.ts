/**
 * Avance del grupo en una etapa: el 100 % es todo el grupo que pasó el Assessment (seleccionados en adelante).
 * Semáforo por persona: verde completó (o ya avanzó a una etapa siguiente), amarillo en proceso/revisión, rojo falta.
 * Puro, para probarlo.
 */
import type { Layer } from "./rules";

export type Light = "green" | "yellow" | "red";
export type CoveragePerson = { id: string; name: string; client: string | null; layer: Layer | null; enrolled: boolean; activated: boolean };
/** Estado propio de la etapa (entregas, certificación, proyecto…), ya traducido a semáforo con su motivo. */
export type StageSignal = { light: Light; reason: string };

const ORDER: Layer[] = ["ASSESSMENT", "AI_MINDSET", "ROLE_ENABLEMENT", "AI_LAB_SHOWCASE", "SHOWCASE", "CLOSURE"];
const NAME: Record<Layer, string> = { ASSESSMENT: "Assessment", AI_MINDSET: "AI First Mindset", ROLE_ENABLEMENT: "Role Enablement", AI_LAB_SHOWCASE: "AI Lab", SHOWCASE: "Showcase", CLOSURE: "Cierre" };

export type CoverageRow = CoveragePerson & { light: Light; reason: string; ahead: boolean };
export type Coverage = {
  total: number;
  rows: CoverageRow[];
  count: Record<Light, number>;
  pct: Record<Light, number>;
  /** Personas que ya están en una etapa posterior (cuentan como completadas). */
  ahead: { n: number; where: string[] };
};

export function stageCoverage(people: CoveragePerson[], stage: Layer, signal: (p: CoveragePerson) => StageSignal | null): Coverage {
  const at = ORDER.indexOf(stage);
  const rows: CoverageRow[] = people.map((p) => {
    // Inscrito sin capa = empieza en AI First Mindset.
    const layer = p.enrolled ? p.layer ?? "AI_MINDSET" : null;
    const idx = layer ? ORDER.indexOf(layer) : 0;
    if (idx > at) return { ...p, light: "green", reason: `Ya avanzó a ${NAME[layer!]}`, ahead: true };
    if (!p.enrolled) return { ...p, light: "red", reason: "Aún no acepta su compromiso", ahead: false };
    if (!p.activated) return { ...p, light: "red", reason: "No ha activado su cuenta", ahead: false };
    const s = idx === at ? signal(p) : null;
    return { ...p, light: s?.light ?? "red", reason: s?.reason ?? "Sin iniciar", ahead: false };
  });
  const order: Light[] = ["red", "yellow", "green"];
  rows.sort((a, b) => order.indexOf(a.light) - order.indexOf(b.light) || a.name.localeCompare(b.name, "es"));
  const count = { green: 0, yellow: 0, red: 0 } as Record<Light, number>;
  for (const r of rows) count[r.light]++;
  const total = rows.length;
  const pct = Object.fromEntries((Object.keys(count) as Light[]).map((k) => [k, total ? Math.round((count[k] / total) * 100) : 0])) as Record<Light, number>;
  const aheadRows = rows.filter((r) => r.ahead);
  return { total, rows, count, pct, ahead: { n: aheadRows.length, where: [...new Set(aheadRows.map((r) => r.reason.replace("Ya avanzó a ", "")))] } };
}
