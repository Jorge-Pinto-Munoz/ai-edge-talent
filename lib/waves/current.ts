import "server-only";
import { supabaseUser } from "@/lib/supabase/server";
import { sortWaves } from "./order";

/** Wave por defecto del portal: la más reciente en curso (o la más reciente si todas cerraron). */
export async function currentWaveId(): Promise<string> {
  const db = await supabaseUser();
  const { data } = await db.from("waves").select("id, status");
  return sortWaves(data ?? [])[0]?.id ?? "wave-3";
}
