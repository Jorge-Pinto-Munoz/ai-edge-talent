"use client";

import { createBrowserClient } from "@supabase/ssr";
import { normalizeKey, normalizeSupabaseUrl } from "./normalize";

const url = normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
const key = normalizeKey(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** Solo para subir archivos con una URL firmada que entregó el servidor (no lee datos directamente). */
export function supabaseBrowser() {
  return createBrowserClient(url, key);
}
