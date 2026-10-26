import { describe, expect, it } from "vitest";
import { homologate, orgKey, prettyName } from "@/lib/text/org";
import { errorText, normalizeYmd } from "@/lib/text/errors";

describe("homologar clientes", () => {
  it("misma clave aunque se escriban distinto", () => {
    expect(orgKey("Banco BCI S.A.")).toBe(orgKey("banco  bci"));
    expect(orgKey("Clínica Alemana")).toBe(orgKey("clinica alemana spa"));
    expect(orgKey("Entel Chile")).toBe(orgKey("ENTEL"));
  });
  it("muestra la forma más frecuente y bien escrita", () => {
    const show = homologate(["banco bci", "Banco BCI", "Banco BCI S.A.", "BANCO BCI", "caja 18", "Caja 18"]);
    expect(show("BANCO BCI")).toBe("Banco BCI");
    expect(show("caja 18")).toBe("Caja 18");
    expect(show(null)).toBeNull();
  });
  it("capitaliza textos en minúscula o mayúscula", () => {
    expect(prettyName("analista de calidad")).toBe("Analista de Calidad");
    expect(prettyName("Analista QA")).toBe("Analista QA");
  });
});

describe("fechas y errores legibles", () => {
  it("normaliza el plazo escrito de varias formas", () => {
    expect(normalizeYmd("2026-10.30")).toBe("2026-10-30");
    expect(normalizeYmd("2026/10/30")).toBe("2026-10-30");
    expect(normalizeYmd("30-10-2026")).toBe("2026-10-30");
    expect(normalizeYmd("2026-02-30")).toBeNull();
    expect(normalizeYmd("mañana")).toBeNull();
  });
  it("muestra el mensaje de errores de Supabase (objetos, no Error)", () => {
    expect(errorText({ message: "invalid input syntax for type date" })).toBe("invalid input syntax for type date");
    expect(errorText(new Error("x"))).toBe("x");
    expect(errorText({})).toBe("Ocurrió un error inesperado.");
  });
});
