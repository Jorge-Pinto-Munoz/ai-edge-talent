import { describe, expect, it } from "vitest";
import { followUpDates, parseHistoricalCsv, retention, specialtyFamily, talentCsv, waveIdFrom } from "@/lib/talent/rules";

describe("clusters de especialidad", () => {
  it("normaliza a familias", () => {
    expect(specialtyFamily("QA Automation")).toBe("Calidad");
    expect(specialtyFamily("Scrum Master")).toBe("Agilidad");
    expect(specialtyFamily("Data Engineer")).toBe("Datos");
    expect(specialtyFamily("Backend Developer")).toBe("Ingeniería");
    expect(specialtyFamily("Diseñador UX")).toBe("Otro");
    expect(specialtyFamily("")).toBeNull();
  });
});

describe("seguimiento y retención", () => {
  it("Mes 1 y Mes 3 desde la fecha base", () => {
    expect(followUpDates("2026-11-30")).toEqual({ MONTH_1: "2026-12-30", MONTH_3: "2027-02-28" });
  });
  it("retención solo entre quienes completaron", () => {
    expect(retention([
      { completed: true, service: "IN_SERVICE" },
      { completed: true, service: "LEFT" },
      { completed: true, service: "BENCH" },
      { completed: false, service: "LEFT" },
    ])).toEqual({ completed: 3, retained: 2, pct: 67 });
    expect(retention([]).pct).toBeNull();
  });
});

describe("importación histórica", () => {
  it("lee Wave, resultado y estado de servicio", () => {
    const csv = "Nombre;Correo;Wave;Cliente;Rol;Resultado;Estado servicio\nAna;ana@k.cl;Wave 1;Alfa;QA;Completó;En servicio\nBeto;beto@k.cl;W2;Beta;Dev;No;Salió\nX;malo;Wave 1;;;;";
    const r = parseHistoricalCsv(csv);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({ wave_id: "wave-1", completed: true, service_status: "IN_SERVICE" });
    expect(r.rows[1]).toMatchObject({ wave_id: "wave-2", completed: false, service_status: "LEFT" });
    expect(r.errors).toHaveLength(1);
  });
  it("reconoce la Wave en varios formatos", () => {
    expect(waveIdFrom("Wave 2")).toBe("wave-2");
    expect(waveIdFrom("Grupo 1")).toBe("wave-1");
    expect(waveIdFrom("piloto")).toBeNull();
  });
});

describe("exportación", () => {
  it("CSV sin puntajes y con comillas cuando corresponde", () => {
    const csv = talentCsv([{ name: "Pérez, Ana", email: "a@k.cl", family: "Calidad", client: "Alfa", service: "IN_SERVICE", highTalent: true, waves: "Wave 1" }]);
    expect(csv.split("\n")[1]).toBe('"Pérez, Ana",a@k.cl,Calidad,Alfa,En servicio,Sí,Wave 1');
    expect(csv).not.toMatch(/puntaje|score/i);
  });
});
