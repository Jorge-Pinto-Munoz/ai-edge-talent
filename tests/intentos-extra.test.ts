import { describe, expect, it } from "vitest";
import { applyGrants, maxWithGrant } from "@/lib/journey/attempts";
import { submissionGate } from "@/lib/journey/rules";

describe("intentos extra por persona", () => {
  it("suman al máximo del módulo; sin máximo sigue ilimitado", () => {
    expect(maxWithGrant(3, 1)).toBe(4);
    expect(maxWithGrant(3, 0)).toBe(3);
    expect(maxWithGrant(null, 2)).toBeNull();
  });
  it("con 3 intentos no aprobados queda bloqueada; con uno extra puede volver a entregar", () => {
    const prev = ["NOT_APPROVED", "NOT_APPROVED", "NOT_APPROVED"] as const;
    expect(submissionGate([...prev], 3).allowed).toBe(false);
    expect(submissionGate([...prev], maxWithGrant(3, 1))).toMatchObject({ allowed: true, nextAttempt: 4 });
  });
  it("con 2 no aprobados y el máximo nuevo de 3, aún puede reintentar", () => {
    expect(submissionGate(["NOT_APPROVED", "NOT_APPROVED"], 3)).toMatchObject({ allowed: true, nextAttempt: 3 });
  });
  it("aplica el extra solo al módulo concedido", () => {
    const caps = [{ id: "a", max_attempts: 3 }, { id: "b", max_attempts: 3 }];
    expect(applyGrants(caps, [{ capsule_id: "a", extra: 1 }]).map((c) => c.max_attempts)).toEqual([4, 3]);
  });
});
