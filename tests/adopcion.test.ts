import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ unstable_cache: (f: unknown) => f }));
vi.mock("@/lib/supabase/server", () => ({ supabaseService: () => null }));
const { specialtyFamily } = await import("@/lib/aicert/adoption");

describe("especialidad agrupada como la banca de talento", () => {
  it("agrupa variantes de escritura", () => {
    expect(specialtyFamily("Data")).toBe("Datos");
    expect(specialtyFamily("Datos")).toBe("Datos");
    expect(specialtyFamily("QA Automation")).toBe("Calidad");
    expect(specialtyFamily("Scrum Master")).toBe("Agilidad");
    expect(specialtyFamily("Backend .NET")).toBe("Ingeniería");
    expect(specialtyFamily("")).toBeNull();
  });
});
