import { layerIndex, type Layer } from "@/lib/journey/rules";
import { MINDSET_ITEMS, pulseDef, type PulseDef } from "./definitions";

export type Answers = Record<string, string | number | boolean>;

/** Valida y normaliza una respuesta contra su pulso. Lanza un Error con mensaje para la persona. */
export function validateAnswers(def: PulseDef, raw: Record<string, unknown>): Answers {
  const out: Answers = {};
  for (const q of def.questions) {
    const v = typeof raw[q.id] === "string" ? (raw[q.id] as string).trim() : raw[q.id];
    const empty = v === undefined || v === null || v === "";
    if (empty) {
      if (!q.optional) throw new Error(`Falta responder: "${q.label}"`);
      continue;
    }
    const n = Number(v);
    switch (q.type) {
      case "scale5":
        if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error(`Respuesta inválida en "${q.label}".`);
        out[q.id] = n;
        break;
      case "nps":
      case "score10":
        if (!Number.isInteger(n) || n < 0 || n > 10) throw new Error(`Respuesta inválida en "${q.label}".`);
        out[q.id] = n;
        break;
      case "hours":
        if (!Number.isFinite(n) || n < 0 || n > 80) throw new Error("Las horas deben estar entre 0 y 80 a la semana.");
        out[q.id] = Math.round(n * 2) / 2;
        break;
      case "yesno":
        if (v !== true && v !== false && v !== "si" && v !== "no") throw new Error(`Respuesta inválida en "${q.label}".`);
        out[q.id] = v === true || v === "si";
        break;
      case "choice":
        if (!q.options?.includes(String(v))) throw new Error(`Respuesta inválida en "${q.label}".`);
        out[q.id] = String(v);
        break;
      case "text":
        if (!q.optional && q.minLength && String(v).length < q.minLength) throw new Error(`Cuéntanos un poco más en "${q.label}".`);
        out[q.id] = String(v).slice(0, 1500);
        break;
    }
  }
  return out;
}

/** Orden en que aparecen los pulsos del profesional. Se muestra uno a la vez: el primero pendiente. */
const KIBER_ORDER = ["INICIO", "MINDSET", "HAB_INTERMEDIO", "HAB_CIERRE", "LAB", "FINAL"] as const;
export const MID_DAYS = 14;

/**
 * ¿Qué pulsos le tocan al profesional ahora?
 * - El pulso de cierre de la etapa actual se habilita solo al cumplir sus requisitos académicos (`requirementsMet`).
 * - El de una etapa ya pasada sigue disponible (personas que avanzaron antes de esta regla), sin bloquear.
 * - El intermedio aparece a los 14 días de Role Enablement; el de inicio, al comenzar.
 */
export function duePulses(ctx: { layer: Layer | null; layerSince: string | null; labStatus: string | null; answered: string[]; requirementsMet?: boolean; now?: Date }): string[] {
  const i = layerIndex(ctx.layer);
  const iRE = layerIndex("ROLE_ENABLEMENT");
  const days = ctx.layerSince ? ((ctx.now ?? new Date()).getTime() - new Date(ctx.layerSince).getTime()) / 86_400_000 : 0;
  const closing = (l: Layer) => (ctx.layer === l && Boolean(ctx.requirementsMet)) || i > layerIndex(l);
  const due: Record<(typeof KIBER_ORDER)[number], boolean> = {
    INICIO: i <= iRE,
    MINDSET: closing("AI_MINDSET"),
    HAB_INTERMEDIO: ctx.layer === "ROLE_ENABLEMENT" && days >= MID_DAYS && !ctx.requirementsMet,
    HAB_CIERRE: closing("ROLE_ENABLEMENT"),
    LAB: closing("AI_LAB_SHOWCASE"),
    FINAL: ctx.layer === "CLOSURE",
  };
  return KIBER_ORDER.filter((k) => due[k] && !ctx.answered.includes(k));
}
export const duePulse = (ctx: Parameters<typeof duePulses>[0]): string | null => duePulses(ctx)[0] ?? null;

/** Pulsos del cliente para una Wave según dónde están sus profesionales. */
export function dueClientPulse(layers: (Layer | null)[], answered: string[]): string | null {
  if (!layers.length) return null;
  if (!answered.includes("CLIENTE_INICIO")) return "CLIENTE_INICIO";
  if (layers.some((l) => l === "CLOSURE") && !answered.includes("CLIENTE_FINAL")) return "CLIENTE_FINAL";
  return null;
}

// ───────────── Indicadores ─────────────
export interface PulseRow { pulse: string; candidate_id: string | null; client_name: string | null; created_at: string; answers: Answers }
export interface ProgressPoint { candidate_id: string; overall: number; at: string }

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const pct = (num: number, den: number) => (den ? Math.round((num / den) * 1000) / 10 : null);
const num = (a: Answers, k: string) => (typeof a[k] === "number" ? (a[k] as number) : null);

/** NPS: % promotores (9–10) menos % detractores (0–6). */
export function nps(scores: number[]) {
  if (!scores.length) return null;
  const pro = scores.filter((s) => s >= 9).length;
  const det = scores.filter((s) => s <= 6).length;
  return { nps: Math.round(((pro - det) / scores.length) * 100), promoters: pct(pro, scores.length)!, detractors: pct(det, scores.length)!, avg: Math.round(mean(scores)! * 100) / 100, n: scores.length };
}

/** Lectura individual del bloque de habilitación. */
export function enablementPerson(a: Answers, verifiedProgress: boolean) {
  const caps = ["cap_comprender", "cap_aplicar", "cap_corregir", "cap_refuerzo", "cap_estrategia"].map((k) => num(a, k)).filter((x): x is number => x !== null);
  const icaa = caps.length ? Math.round(((mean(caps)! - 1) / 4) * 100) : null;
  const gpc = num(a, "gpc_now") !== null && num(a, "gpc_before") !== null ? num(a, "gpc_now")! - num(a, "gpc_before")! : null;
  const evidence = typeof a.evidence === "string" ? a.evidence.trim() : "";
  const tae = a.progress === true && evidence.length >= 40;
  const icp = num(a, "icp");
  const hasBarrier = typeof a.barrier === "string" && a.barrier !== "Ninguna";
  const sev = num(a, "barrier_sev") ?? 0;
  const reduced = hasBarrier && (a.barrier_change === "Se resolvió" || a.barrier_change === "Disminuyó de manera importante");
  const tai = (num(a, "auto_org") ?? 0) >= 4 && (num(a, "auto_strategy") ?? 0) >= 4;
  const tri = (hasBarrier && sev >= 4) || a.progress === false;
  const tiic = gpc !== null && gpc >= 0.5 && tae && icp !== null && icp >= 6 && verifiedProgress;
  return { icaa, gpc, tae, icp, hasBarrier, reduced, tai, tri, tpv: verifiedProgress, tiic, barrier: hasBarrier ? String(a.barrier) : null, severity: hasBarrier ? sev : null };
}

/** TPV: avance observable en la plataforma AI CERT entre el primer registro (T0) y el pulso (T1), o certificación aprobada. */
export function verifiedProgress(points: ProgressPoint[], candidateId: string, at: string, certified: boolean): boolean {
  if (certified) return true;
  const mine = points.filter((p) => p.candidate_id === candidateId && p.at <= at).sort((a, b) => a.at.localeCompare(b.at));
  return mine.length >= 2 && mine[mine.length - 1].overall > mine[0].overall;
}

export function enablementIndicators(rows: { a: Answers; tpv: boolean }[]) {
  const people = rows.map((r) => enablementPerson(r.a, r.tpv));
  const n = people.length;
  const icaas = people.map((p) => p.icaa).filter((x): x is number => x !== null);
  const gpcs = people.map((p) => p.gpc).filter((x): x is number => x !== null);
  const icps = people.map((p) => p.icp).filter((x): x is number => x !== null);
  const withBarrier = people.filter((p) => p.hasBarrier);
  const r1 = (x: number | null) => (x === null ? null : Math.round(x * 10) / 10);
  return {
    n,
    ICAA: r1(mean(icaas)),
    GPC: mean(gpcs) === null ? null : Math.round(mean(gpcs)! * 100) / 100,
    TAE: pct(people.filter((p) => p.tae).length, n),
    ICP: r1(mean(icps)),
    ICP_high: pct(icps.filter((x) => x >= 8).length, icps.length),
    TRB: withBarrier.length ? pct(withBarrier.filter((p) => p.reduced).length, withBarrier.length) : null,
    TAI: pct(people.filter((p) => p.tai).length, n),
    TRI: pct(people.filter((p) => p.tri).length, n),
    TPV: pct(people.filter((p) => p.tpv).length, n),
    TIIC: pct(people.filter((p) => p.tiic).length, n),
  };
}

export function mindsetIndicators(rows: Answers[]) {
  const items = MINDSET_ITEMS.map((m) => {
    const xs = rows.map((a) => num(a, m.id)).filter((x): x is number => x !== null);
    return { id: m.id, label: m.label, avg: xs.length ? Math.round(mean(xs)! * 100) / 100 : null, top: pct(xs.filter((x) => x >= 4).length, xs.length) };
  });
  const all = items.map((i) => i.avg).filter((x): x is number => x !== null);
  return { n: rows.length, quality: all.length ? Math.round(mean(all)! * 100) / 100 : null, items, nps: nps(rows.map((a) => num(a, "nps")).filter((x): x is number => x !== null)) };
}

/** Eficiencia pre/post: solo personas (o clientes) con ambas mediciones. Ahorro = (antes − después) / antes. */
export function efficiency(pairs: { before: number; after: number }[]) {
  const valid = pairs.filter((p) => p.before > 0);
  if (!valid.length) return null;
  const before = valid.reduce((s, p) => s + p.before, 0);
  const after = valid.reduce((s, p) => s + p.after, 0);
  return { n: valid.length, before, after, savedHours: Math.round((before - after) * 10) / 10, savedPct: Math.round(((before - after) / before) * 1000) / 10 };
}

export function pairEfficiency(rows: PulseRow[], keyOf: (r: PulseRow) => string | null, pre: string, post: string) {
  const by = new Map<string, { before?: number; after?: number }>();
  for (const r of rows) {
    const k = keyOf(r);
    const h = num(r.answers, "hours");
    if (!k || h === null) continue;
    const e = by.get(k) ?? {};
    if (r.pulse === pre) e.before = h;
    if (r.pulse === post) e.after = h;
    by.set(k, e);
  }
  return efficiency([...by.values()].filter((e): e is { before: number; after: number } => e.before !== undefined && e.after !== undefined));
}

export const pulseTitle = (k: string) => pulseDef(k)?.title ?? k;
