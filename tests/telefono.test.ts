import { describe, expect, it } from "vitest";
import { normalizePhone, splitPhone } from "@/lib/identity/phone";

describe("normalizePhone", () => {
  it("Chile: acepta 9 dígitos, 8 dígitos (agrega el 9) y con +56", () => {
    expect(normalizePhone("9 1234 5678")).toBe("+56912345678");
    expect(normalizePhone("1234 5678")).toBe("+56912345678");
    expect(normalizePhone("+56 9 1234 5678")).toBe("+56912345678");
    expect(normalizePhone("56912345678")).toBe("+56912345678");
  });
  it("internacional con prefijo elegido o escrito", () => {
    expect(normalizePhone("11 2345 6789", "+54")).toBe("+541123456789");
    expect(normalizePhone("+1 415 555 0100")).toBe("+14155550100");
  });
  it("rechaza números inválidos", () => {
    expect(normalizePhone("123")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("0 1234 5678")).toBeNull();
  });
  it("separa un E.164 para mostrarlo", () => {
    expect(splitPhone("+56912345678")).toEqual({ prefix: "+56", number: "912345678" });
    expect(splitPhone("+541123456789")).toEqual({ prefix: "+54", number: "1123456789" });
  });
});
