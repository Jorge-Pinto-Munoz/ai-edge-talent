import { describe, expect, it } from "vitest";
import { parseHistoricalCsv } from "@/lib/talent/rules";

const csv = [
  "﻿Nombre;Correo;Wave;Cliente;Rol;Especialidad;Resultado;Certificación AI CERT;Estado servicio;Nivel Assessment (referencia)",
  "Ana Prueba;ana@kibernum.test;Wave 2;Cliente Uno;QA;Calidad;Completó;Sí;En servicio;A — Ideal",
  "Beto Prueba;beto@kibernum.test;Wave 2;Cliente Dos;Dev;Ingeniería;Completó;No;Banca;B — Apto",
  "Caro Prueba;caro@kibernum.test;Wave 1;;Data;;No completó;;Salió;",
].join("\n");

describe("carga histórica (Waves 1 y 2)", () => {
  it("lee el archivo de Excel aunque traiga BOM", () => {
    const { rows, errors } = parseHistoricalCsv(csv);
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(3);
  });
  it("interpreta la certificación AI CERT", () => {
    const { rows } = parseHistoricalCsv(csv);
    expect(rows.map((r) => r.certified)).toEqual([true, false, null]);
  });
  it("interpreta resultado, Wave y estado de servicio", () => {
    const { rows } = parseHistoricalCsv(csv);
    expect(rows.map((r) => [r.wave_id, r.completed, r.service_status])).toEqual([
      ["wave-2", true, "IN_SERVICE"],
      ["wave-2", true, "BENCH"],
      ["wave-1", false, "LEFT"],
    ]);
  });
});

describe("carga histórica sin correo", () => {
  it("acepta filas sin correo con un marcador no entregable, y rechaza correos mal escritos", async () => {
    const { hasRealEmail, shownEmail, NO_EMAIL_DOMAIN } = await import("@/lib/talent/rules");
    const { rows, errors } = parseHistoricalCsv("Nombre;Correo;Wave;Certificación AI CERT\nAna Pérez;;Wave 2;Certificado\nLuis Soto;luis@;Wave 1;\nEva Ríos;eva@kibernum.com;Wave 1;En curso");
    expect(rows.map((r) => r.corporate_email)).toEqual([`ana.perez.wave-2@${NO_EMAIL_DOMAIN}`, "eva@kibernum.com"]);
    expect(rows[0].certified).toBe(true);
    expect(rows[1].certified).toBeNull();
    expect(errors).toEqual(["Línea 3: correo inválido."]);
    expect(hasRealEmail(rows[0].corporate_email)).toBe(false);
    expect(shownEmail(rows[0].corporate_email)).toBe("Sin correo registrado");
    expect(shownEmail("eva@kibernum.com")).toBe("eva@kibernum.com");
  });
});
