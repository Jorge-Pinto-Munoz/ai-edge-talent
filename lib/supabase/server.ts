import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { env, serverEnv } from "./env";

/** Cliente con la sesión del usuario: todas las lecturas/escrituras pasan por RLS. */
export async function supabaseUser() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* llamado desde un Server Component: el middleware refresca la sesión */
        }
      },
    },
  });
}

/**
 * Cliente con service role: SOLO para operaciones de servidor que no tienen sesión
 * (postulación por token, registro de evaluación IA y correos). Nunca llega al navegador.
 */
export function supabaseService() {
  const key = serverEnv().serviceRoleKey;
  if (!key) throw new Error("Falta SUPABASE_SECRET_KEY en el servidor.");
  return createClient(env.supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
