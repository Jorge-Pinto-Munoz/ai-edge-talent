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
