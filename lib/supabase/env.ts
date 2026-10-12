/**
 * Configuración de servicios externos. Ningún secreto se expone al navegador salvo
 * NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY (públicos por diseño; RLS protege los datos).
 */
export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  // Clave publicable (sb_publishable_…) o la anon key legada: públicas por diseño, RLS protege los datos.
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
};

export function isSupabaseConfigured() {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

/** Solo servidor. */
export function serverEnv() {
  return {
    // Clave secreta (sb_secret_…) o service_role legada. SOLO servidor.
    serviceRoleKey: process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    resendFrom: process.env.RESEND_FROM ?? "",
  };
}
