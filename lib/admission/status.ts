import { ADMISSION_TRANSITIONS } from "@/lib/domain/admission";
import type { AdmissionStatus } from "@/lib/domain/types";

/** Camino más corto de estados permitidos (cada paso queda registrado como evento). */
export function statusPath(from: AdmissionStatus, to: AdmissionStatus): AdmissionStatus[] {
  if (from === to) return [];
  const prev = new Map<AdmissionStatus, AdmissionStatus>();
  const queue: AdmissionStatus[] = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const nxt of ADMISSION_TRANSITIONS[cur]) {
      if (prev.has(nxt) || nxt === from) continue;
      prev.set(nxt, cur);
      if (nxt === to) {
        const path: AdmissionStatus[] = [to];
        let p = cur;
        while (p !== from) {
          path.unshift(p);
          p = prev.get(p)!;
        }
        return path;
      }
      queue.push(nxt);
    }
  }
  throw new Error(`No existe una transición válida de ${from} a ${to}.`);
}
