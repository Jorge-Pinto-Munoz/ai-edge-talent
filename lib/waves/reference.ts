import "server-only";
import { supabaseUser } from "@/lib/supabase/server";
import { DEFAULT_REFERENCE } from "@/lib/admission/phases";

/**
 * Referencia de profesionales de la Wave. Si la columna aún no existe (despliegue antes de la migración) o no hay
 * valor, usa la referencia por defecto: nunca rompe la página.
 */
export async function waveReference(waveId: string): Promise<number> {
  const db = await supabaseUser();
  const { data, error } = await db.from("waves").select("reference_capacity").eq("id", waveId).maybeSingle();
  const n = !error && data ? Number((data as { reference_capacity?: number }).reference_capacity) : NaN;
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_REFERENCE;
}
