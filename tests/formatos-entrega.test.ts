import { describe, expect, it } from "vitest";
import { acceptAttr, dueRelative, effectiveFormats, fileAllowed, fmtDue } from "@/lib/journey/formats";
import { chileToIso } from "@/lib/time/chile";

describe("formatos y plazo de entrega", () => {
  it("por defecto: PDF + formato de la plantilla", () => {
    expect(effectiveFormats(null, [{ name: "Canvas.pptx" }, { name: "Rubrica.pdf" }])).toEqual(["pdf", "ppt"]);
    expect(effectiveFormats([], [])).toEqual(["pdf"]);
    expect(effectiveFormats(["word", "otro"], [])).toEqual(["word"]);
  });
  it("valida extensión y arma el accept", () => {
    expect(fileAllowed("Mi Entrega.PDF", ["pdf"])).toBe(true);
    expect(fileAllowed("entrega.exe", ["pdf", "ppt"])).toBe(false);
    expect(acceptAttr(["pdf", "ppt"])).toBe(".pdf,.ppt,.pptx");
  });
  it("plazo en hora de Chile y relativo", () => {
    const iso = chileToIso("2026-10-30T23:59");
    expect(fmtDue(iso)).toMatch(/30 de octubre de 2026, 23:59 h/);
    expect(dueRelative(iso, new Date("2026-10-27T12:00:00Z")).text).toBe("Quedan 3 días");
    expect(dueRelative(iso, new Date("2026-11-02T12:00:00Z")).tone).toBe("bad");
  });
});
