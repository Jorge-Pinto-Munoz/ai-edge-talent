import { describe, expect, it } from "vitest";
import { HELP } from "@/lib/data/help";
import { bestMatch } from "@/lib/help/match";

const pro = HELP.filter((h) => h.aud.includes("profesional"));

describe("ayuda: búsqueda en respuestas preparadas", () => {
  it("encuentra la respuesta con otras palabras", () => {
    expect(bestMatch("cuanto dura el programa", pro)?.q).toBe("¿Cuánto dura el programa?");
    expect(bestMatch("Tiene costo postular?", pro)?.q).toBe("¿Tiene algún costo para mí?");
    expect(bestMatch("olvidé mi código y no puedo ingresar", pro)?.q).toBe("No puedo ingresar a la plataforma");
    expect(bestMatch("video de rescate", pro)?.q).toMatch(/rescate/);
  });
  it("no inventa coincidencias para preguntas fuera de lo preparado", () => {
    expect(bestMatch("¿puedo llevar a mi perro a la oficina?", pro)).toBeNull();
    expect(bestMatch("hola", pro)).toBeNull();
    expect(bestMatch("", pro)).toBeNull();
  });
});
