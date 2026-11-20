import { describe, expect, it } from "vitest";
import { openingStatus } from "@/lib/journey/opening-labels";
import { renderIdentity } from "@/lib/email/identity";

const past = new Date(Date.now() - 3600_000).toISOString();
describe("habilitar etapa", () => {
  it("cerrada, programada, abierta y finalizada", () => {
    expect(openingStatus(null, 3, 5)).toBe("closed");
    expect(openingStatus(new Date(Date.now() + 86_400_000).toISOString(), 3, 5)).toBe("scheduled");
    // habilitada antes de que llegue alguien (todos aún en etapas anteriores): abierta, no finalizada
    expect(openingStatus(past, 0 + 4, 0 + 4 + 0)).toBe("open");
    // todos ya pasaron a etapas siguientes
    expect(openingStatus(past, 0, 6)).toBe("finished");
  });
  it("el aviso dice la etapa habilitada (Mindset mantiene el «primer reto»)", () => {
    expect(renderIdentity("STAGE_OPEN", { name: "Ana", stage: "AI Lab", link: "x" }).subject).toMatch(/AI Lab ya está habilitada/);
    expect(renderIdentity("STAGE_OPEN", { name: "Ana", stage: "AI First Mindset", link: "x" }).subject).toMatch(/primer reto/);
  });
});
