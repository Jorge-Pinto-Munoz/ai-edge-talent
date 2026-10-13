import type { HelpItem } from "@/lib/data/help";

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const STOP = new Set(["como", "que", "para", "por", "una", "uno", "los", "las", "del", "con", "mis", "tengo", "puedo", "hay", "esta", "este", "sobre", "cual", "cuando", "donde", "pasa", "hacer", "quiero", "saber"]);
const words = (s: string) => norm(s).split(/[^a-z0-9ñ]+/).filter((w) => w.length > 2 && !STOP.has(w));

/** Respuesta preparada que mejor calza con lo que la persona escribió (o null si ninguna calza lo suficiente). */
export function bestMatch(text: string, items: HelpItem[]): HelpItem | null {
  const t = words(text);
  if (!t.length) return null;
  let best: { h: HelpItem; s: number } | null = null;
  for (const h of items) {
    const q = words(h.q);
    const a = new Set(words(h.a));
    const hits = t.reduce((n, w) => n + (q.some((x) => x.startsWith(w) || w.startsWith(x)) ? 2 : a.has(w) ? 1 : 0), 0);
    const s = hits / (t.length * 2);
    if (!best || s > best.s) best = { h, s };
  }
  return best && best.s >= 0.5 ? best.h : null;
}

