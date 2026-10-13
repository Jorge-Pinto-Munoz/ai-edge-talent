import { describeEmail, emailConfig } from "@/lib/email/provider";
import { NextResponse } from "next/server";
import { env, serverEnv } from "@/lib/supabase/env";
import { AI_MODEL, aiConfigured, aiErrorMessage, aiWorkspace, anthropic } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

/** Muestra qué configuración tiene el hosting, sin revelar claves (solo prefijos y largos) y si Supabase las acepta. */
export async function GET(req: Request) {
  const secret = serverEnv().serviceRoleKey;
  // Solo el tipo de clave y su largo: nunca caracteres de la clave.
  const mask = (k: string) => {
    if (!k) return "FALTA";
    const tipo = k.startsWith("sb_publishable_") ? "sb_publishable_ (publicable)" : k.startsWith("sb_secret_") ? "sb_secret_ (SECRETA)" : k.startsWith("eyJ") ? "JWT legada" : "formato no reconocido";
    return `${tipo} · ${k.length} caracteres`;
  };
  const check = async (path: string, key: string) => {
    if (!env.supabaseUrl || !key) return "sin probar";
    try {
      const r = await fetch(`${env.supabaseUrl}${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
      return `HTTP ${r.status}`;
    } catch (e) {
      return `sin conexión (${e instanceof Error ? e.message : "error"})`;
    }
  };
  // ?ia=1: verifica la llave de Claude consultando el modelo (no genera texto: no consume créditos).
  const ia = new URL(req.url).searchParams.get("ia") === "1" && aiConfigured()
    ? await anthropic().models.retrieve(AI_MODEL).then((m) => `OK · modelo ${m.id} disponible`, (e) => `ERROR · ${aiErrorMessage(e)}`)
    : undefined;
  return NextResponse.json({
    supabaseUrl: env.supabaseUrl || "FALTA",
    appUrl: env.appUrl,
    publishableKey: mask(env.supabaseAnonKey),
    secretKey: mask(secret),
    authConPublishable: await check("/auth/v1/settings", env.supabaseAnonKey),
    authAdminConSecret: await check("/auth/v1/admin/users?per_page=1", secret),
    anthropic: serverEnv().anthropicConfigured ? "configurada" : "FALTA",
    anthropicWorkspace: aiWorkspace() ? "con ANTHROPIC_WORKSPACE_ID" : "sin ANTHROPIC_WORKSPACE_ID",
    ...(ia ? { claude: ia } : {}),
    correo: describeEmail(emailConfig()),
    // Solo si existen (nunca su valor), para saber si este deploy ya tomó las variables.
    variablesCorreo: { SMTP_USER: Boolean(process.env.SMTP_USER?.trim()), SMTP_PASS: Boolean(process.env.SMTP_PASS?.trim()), RESEND_API_KEY: Boolean(process.env.RESEND_API_KEY?.trim()), RESEND_TEST_TO: Boolean(process.env.RESEND_TEST_TO?.trim()), RESEND_FROM: Boolean(process.env.RESEND_FROM?.trim()) },
    entorno: process.env.VERCEL_ENV ?? "local",
    deploy: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  }, { headers: { "Content-Type": "application/json; charset=utf-8" } });
}
