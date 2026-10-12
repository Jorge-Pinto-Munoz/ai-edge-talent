import { describe, expect, it } from "vitest";
import { normalizeAppUrl, normalizeKey, normalizeSupabaseUrl } from "@/lib/supabase/normalize";

describe("configuración del hosting", () => {
  it("acepta la URL de la API REST y la deja como URL del proyecto", () => {
    for (const u of ["https://abc.supabase.co", "https://abc.supabase.co/", " https://abc.supabase.co/rest/v1/ ", "https://abc.supabase.co/rest/v1", "https://abc.supabase.co/auth/v1"])
      expect(normalizeSupabaseUrl(u)).toBe("https://abc.supabase.co");
    expect(normalizeSupabaseUrl(undefined)).toBe("");
  });
  it("quita espacios de las claves y la barra final de APP_URL", () => {
    expect(normalizeKey(" sb_publishable_x\n")).toBe("sb_publishable_x");
    expect(normalizeAppUrl("https://ai-edge-talent.vercel.app/", "x")).toBe("https://ai-edge-talent.vercel.app");
    expect(normalizeAppUrl("", "http://localhost:3000")).toBe("http://localhost:3000");
  });
});
