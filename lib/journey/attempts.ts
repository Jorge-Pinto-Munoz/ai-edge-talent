/**
 * Intentos extra por persona (excepción del admin): se suman al máximo del módulo solo para esa persona.
 * Función pura (tests/intentos-extra.test.ts).
 */
export type Grant = { capsule_id: string; extra: number };

export function maxWithGrant(max: number | null | undefined, extra = 0): number | null {
  if (max === null || max === undefined) return null; // sin máximo: intentos ilimitados
  return max + Math.max(0, extra);
}

/** Copia de los módulos con el máximo de intentos ajustado por los intentos extra de una persona. */
export function applyGrants<C extends { id: string; max_attempts?: number | null }>(capsules: C[], grants: Grant[]): C[] {
  if (!grants.length) return capsules;
  return capsules.map((c) => {
    const g = grants.find((x) => x.capsule_id === c.id);
    return g ? { ...c, max_attempts: maxWithGrant(c.max_attempts, g.extra) } : c;
  });
}
