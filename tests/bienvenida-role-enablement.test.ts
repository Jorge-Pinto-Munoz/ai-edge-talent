import { describe, expect, it } from "vitest";
import { renderIdentity } from "@/lib/email/identity";
import { CREATABLE_ROLES } from "@/lib/identity/roles";

describe("bienvenida a Role Enablement", () => {
  const r = renderIdentity("RE_WELCOME", { name: "Carolina Tapia", link: "https://x.test/mi-journey" });
  it("explica lo que hace en la plataforma", () => {
    expect(r.subject).toMatch(/Role Enablement/);
    expect(r.text).toMatch(/Hola Carolina/);
    expect(r.text).toMatch(/4, una por semana/);
    expect(r.text).toMatch(/Fui a la sesión/);
    expect(r.text).toMatch(/tramo y el porcentaje/);
    expect(r.text).toMatch(/sube tu certificado/);
    expect(r.text).toMatch(/pulso de cierre/);
    expect(r.text).not.toMatch(/40 h/);
  });
  it("el AI Coach dicta Role Enablement: Profesor ya no se crea", () => {
    expect(CREATABLE_ROLES).toContain("mentor");
    expect(CREATABLE_ROLES).not.toContain("profesor");
  });
});
