import { NextResponse } from "next/server";
import { env, serverEnv } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

/** Muestra qué configuración tiene el hosting, sin revelar claves (solo prefijos y largos) y si Supabase las acepta. */
export async function GET() {
  const secret = serverEnv().serviceRoleKey;
  const mask = (k: string) => (k ? `${k.slice(0, k.startsWith("sb_") ? k.indexOf("_", 3) + 1 : 4)}… (${k.length} caracteres)` : "FALTA");
  const check = async (path: string, key: string) => {
    if (!env.supabaseUrl || !key) return "sin probar";
    try {
      const r = await fetch(`${env.supabaseUrl}${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
      return `HTTP ${r.status}`;
    } catch (e) {
      return `sin conexión (${e instanceof Error ? e.message : "error"})`;
    }
  };
  return NextResponse.json({
    supabaseUrl: env.supabaseUrl || "FALTA",
    appUrl: env.appUrl,
    publishableKey: mask(env.supabaseAnonKey),
    secretKey: mask(secret),
    authConPublishable: await check("/auth/v1/settings", env.supabaseAnonKey),
    authAdminConSecret: await check("/auth/v1/admin/users?per_page=1", secret),
    anthropic: serverEnv().anthropicConfigured ? "configurada" : "FALTA",
    resend: serverEnv().resendApiKey ? `configurada · remitente ${serverEnv().resendFrom || "FALTA RESEND_FROM"}` : "FALTA",
  });
}
