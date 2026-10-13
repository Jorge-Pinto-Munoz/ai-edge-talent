import { describe, expect, it } from "vitest";
import { domainAllowed, hashCode, isCode, newCode, sameHash } from "@/lib/staff/codes";
import { DELIVERY_STAGES, HANDOFFS } from "@/lib/data/delivery-guide";
import { CATALOG, ROLE_FAMILIES } from "@/lib/data/aicert-catalog";

describe("código de acceso del equipo", () => {
  it("son exactamente 4 números", () => {
    for (let i = 0; i < 200; i++) expect(isCode(newCode())).toBe(true);
    expect(isCode("12a4")).toBe(false);
    expect(isCode("12345")).toBe(false);
  });
  it("se guarda solo el hash, ligado al correo y al secreto", () => {
    const h = hashCode("ana@kibernum.com", "0420", "s1");
    expect(h).not.toContain("0420");
    expect(sameHash(h, hashCode("ANA@kibernum.com", "0420", "s1"))).toBe(true);
    expect(sameHash(h, hashCode("ana@kibernum.com", "0421", "s1"))).toBe(false);
    expect(sameHash(h, hashCode("ana@kibernum.com", "0420", "s2"))).toBe(false);
    expect(sameHash(h, hashCode("otro@kibernum.com", "0420", "s1"))).toBe(false);
  });
  it("el dominio filtra pero nunca basta solo (sin lista, no filtra)", () => {
    expect(domainAllowed("a@kibernum.com", "kibernum.com,kibernum.cl")).toBe(true);
    expect(domainAllowed("a@mail.kibernum.cl", "kibernum.com,kibernum.cl")).toBe(true);
    expect(domainAllowed("a@kibernum.com.evil.io", "kibernum.com")).toBe(false);
    expect(domainAllowed("a@gmail.com", "kibernum.com")).toBe(false);
    expect(domainAllowed("a@gmail.com", "")).toBe(true);
  });
});

describe("guía de Delivery", () => {
  it("cubre las etapas del programa en orden, con gestión, hitos y escalamiento", () => {
    expect(DELIVERY_STAGES.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6]);
    for (const s of DELIVERY_STAGES) {
      expect(s.actions.length).toBeGreaterThan(2);
      expect(s.milestones.length).toBeGreaterThan(0);
      expect(s.escalate.length).toBeGreaterThan(0);
      expect(HANDOFFS[s.id]?.length).toBeGreaterThan(0);
    }
  });
  it("está escrita para quien supervisa, sin plazos inventados", () => {
    const text = JSON.stringify(DELIVERY_STAGES);
    expect(text).not.toMatch(/48 horas|si eres seleccionado|tu compromiso y quedas inscrito/i);
  });
});

describe("familias de rol del catálogo", () => {
  it("solo apuntan a certificaciones existentes y cubren todo el catálogo", () => {
    const slugs = new Set(CATALOG.map((c) => c.slug));
    const used = new Set(ROLE_FAMILIES.flatMap((f) => f.certs));
    for (const s of used) expect(slugs.has(s)).toBe(true);
    for (const s of slugs) expect(used.has(s)).toBe(true);
  });
});
