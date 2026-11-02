/** Sugerencia de la IA (no decisión): aprobar si alcanza el umbral y ningún criterio queda en «no». */
export function suggestedVerdict(r: { readable: boolean; score: number; threshold: number; criteria: { met: "si" | "parcial" | "no" }[] }): "APPROVED" | "NOT_APPROVED" | "HUMAN_REVIEW" {
  if (!r.readable) return "HUMAN_REVIEW";
  return r.score >= r.threshold && !r.criteria.some((c) => c.met === "no") ? "APPROVED" : "NOT_APPROVED";
}
