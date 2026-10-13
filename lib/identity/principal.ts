import type { SupabaseClient } from "@supabase/supabase-js";
import { hashPin, isPin } from "./pin";

/**
 * Cuenta de administración principal (Líder de producto). La cuenta, su rol y la marca de principal se crean
 * en la inicialización de la base (supabase/seed.sql, idempotente). Su código inicial NO está en el repositorio:
 * viene del secreto ADMIN_INITIAL_CODE del servidor y se guarda solo como hash scrypt, con cambio obligatorio
 * en el primer ingreso. Se aplica una sola vez en la vida de la base (app_settings.principal_initialized):
 * después, quitar o cambiar el secreto no afecta la cuenta.
 */
export const PRINCIPAL_EMAIL = (process.env.PRINCIPAL_ADMIN_EMAIL || "jorge.pintom@kibernum.com").trim().toLowerCase();

export async function ensurePrincipalCredential(email: string, svc: SupabaseClient): Promise<void> {
  if (email !== PRINCIPAL_EMAIL) return;
  const code = process.env.ADMIN_INITIAL_CODE?.trim() ?? "";
  if (!isPin(code)) return;
  const { data: p } = await svc.from("profiles").select("id, role, principal").eq("email", email).maybeSingle();
  if (!p || !p.principal || p.role !== "admin") return;
  const { data: cred } = await svc.from("user_credentials").select("pin_hash").eq("user_id", p.id).maybeSingle();
  if (cred?.pin_hash) return;
  // Reclama la inicialización (una sola vez, también entre instancias concurrentes).
  const { data: claimed } = await svc.from("app_settings").upsert({ key: "principal_initialized", value: { at: new Date().toISOString() } }, { onConflict: "key", ignoreDuplicates: true }).select("key");
  if (!claimed?.length) return;
  await svc.from("user_credentials").upsert({ user_id: p.id, pin_hash: hashPin(code), pin_set_at: new Date().toISOString(), must_change: true, failed_count: 0, locked_until: null, updated_at: new Date().toISOString() });
  await svc.from("audit_log").insert({ action: "admin.principal.initialized", target_user: p.id, target_email: email, details: { must_change: true } });
}
