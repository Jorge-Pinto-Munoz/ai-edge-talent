import { describe, expect, it } from "vitest";
import { hashPin, isPin, normalizeCLMobile, pinProblem, pinStatus, verifyPin } from "@/lib/identity/pin";
import { hashCode, isCode, sameHash } from "@/lib/staff/codes";

describe("código personal (PIN)", () => {
  it("solo 4 dígitos y no triviales", () => {
    expect(isPin("1234")).toBe(true);
    expect(isPin("12a4")).toBe(false);
    expect(isPin("12345")).toBe(false);
    expect(pinProblem("1111")).toBeTruthy();
    expect(pinProblem("1234")).toBeTruthy();
    expect(pinProblem("4321")).toBeTruthy();
    expect(pinProblem("2580")).toBeNull();
  });
  it("se guarda con hash y sal propia: nunca en claro ni igual entre usuarios", () => {
    const a = hashPin("2580");
    const b = hashPin("2580");
    expect(a).not.toContain("2580");
    expect(a).not.toBe(b);
    expect(verifyPin("2580", a)).toBe(true);
    expect(verifyPin("2581", a)).toBe(false);
    expect(verifyPin("2580", null)).toBe(false);
    expect(verifyPin("2580", "basura")).toBe(false);
  });
  it("estado visible para el admin sin revelar el código", () => {
    const now = new Date("2026-10-13T12:00:00Z");
    expect(pinStatus(null, now).key).toBe("PENDING");
    expect(pinStatus({ pin_hash: hashPin("2580"), must_change: false, locked_until: null }, now).key).toBe("SET");
    expect(pinStatus({ pin_hash: hashPin("2580"), must_change: true, locked_until: null }, now).key).toBe("RENEW");
    expect(pinStatus({ pin_hash: hashPin("2580"), must_change: false, locked_until: "2026-10-13T12:10:00Z" }, now).key).toBe("LOCKED");
    expect(pinStatus({ pin_hash: hashPin("2580"), must_change: false, locked_until: "2026-10-13T11:00:00Z" }, now).key).toBe("SET");
  });
});

describe("códigos temporales", () => {
  it("se comparan por hash", () => {
    const h = hashCode("a@b.cl", "4821", "s3cret");
    expect(h).not.toContain("4821");
    expect(sameHash(h, hashCode("a@b.cl", "4821", "s3cret"))).toBe(true);
    expect(sameHash(h, hashCode("a@b.cl", "4822", "s3cret"))).toBe(false);
    expect(sameHash(h, hashCode("otro@b.cl", "4821", "s3cret"))).toBe(false);
    expect(isCode("4821")).toBe(true);
    expect(isCode("48a1")).toBe(false);
  });
});

describe("teléfono chileno", () => {
  it("normaliza a +569 y 8 dígitos", () => {
    expect(normalizeCLMobile("12345678")).toBe("+56912345678");
    expect(normalizeCLMobile("9 1234 5678")).toBe("+56912345678");
    expect(normalizeCLMobile("+56 9 1234-5678")).toBe("+56912345678");
    expect(normalizeCLMobile("1234567")).toBeNull();
    expect(normalizeCLMobile("+56 2 2345 6789")).toBeNull();
    expect(normalizeCLMobile("")).toBeNull();
  });
});
