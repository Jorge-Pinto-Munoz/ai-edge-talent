import { describe, expect, it } from "vitest";
import { CREATABLE_ROLES, INTERNAL_ROLES, PUBLIC_REQUEST_ROLES, isInternalRole, isPublicRequestRole } from "@/lib/identity/roles";

describe("roles", () => {
  it("ningún rol interno se puede pedir desde el formulario público", () => {
    for (const r of ["admin", "delivery", "hub", "mentor", "profesor"]) {
      expect(isInternalRole(r)).toBe(true);
      expect(isPublicRequestRole(r)).toBe(false);
    }
    expect(PUBLIC_REQUEST_ROLES).toEqual(["kiber", "bp"]);
  });
  it("Administración puede crear Delivery, Hub AI, AI Coach y Líder de producto", () => {
    for (const r of ["delivery", "hub", "mentor", "admin"]) expect(CREATABLE_ROLES as readonly string[]).toContain(r);
    expect(INTERNAL_ROLES as readonly string[]).not.toContain("kiber");
  });
});
