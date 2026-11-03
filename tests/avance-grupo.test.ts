import { describe, expect, it } from "vitest";
import { stageCoverage, type CoveragePerson } from "@/lib/journey/coverage";

const p = (id: string, o: Partial<CoveragePerson> = {}): CoveragePerson => ({ id, name: id, client: null, layer: "AI_MINDSET", enrolled: true, activated: true, ...o });

describe("avance del grupo por etapa", () => {
  it("el 100 % es todo el grupo; quien ya avanzó cuenta en verde y se avisa", () => {
    const people = [p("a"), p("b"), p("c"), p("d", { layer: "ROLE_ENABLEMENT" }), p("e", { activated: false }), p("f", { enrolled: false, layer: null })];
    const sig: Record<string, { light: "green" | "yellow" | "red"; reason: string }> = { a: { light: "green", reason: "Aprobado" }, b: { light: "yellow", reason: "Por revisar" }, c: { light: "red", reason: "No ha entregado" } };
    const cov = stageCoverage(people, "AI_MINDSET", (x) => sig[x.id] ?? null);
    expect(cov.total).toBe(6);
    expect(cov.count).toEqual({ green: 2, yellow: 1, red: 3 });
    expect(cov.pct.green).toBe(33);
    expect(cov.ahead).toEqual({ n: 1, where: ["Role Enablement"] });
    expect(cov.rows.find((r) => r.id === "e")?.reason).toBe("No ha activado su cuenta");
    expect(cov.rows.find((r) => r.id === "f")?.reason).toBe("Aún no acepta su compromiso");
    expect(cov.rows[0].light).toBe("red");
  });
  it("en una etapa posterior, quien sigue atrás queda en rojo «Sin iniciar»", () => {
    const cov = stageCoverage([p("a"), p("b", { layer: "ROLE_ENABLEMENT" })], "ROLE_ENABLEMENT", () => ({ light: "yellow", reason: "Certificado en verificación" }));
    expect(cov.rows.find((r) => r.id === "a")?.reason).toBe("Sin iniciar");
    expect(cov.rows.find((r) => r.id === "b")?.light).toBe("yellow");
  });
});
