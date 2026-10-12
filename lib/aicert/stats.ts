import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export interface CertStat {
  rate: number; // 0–100
  certified: number;
  enrolled: number;
  waves: string[];
}

/** Bajo este número de ingresados no se publica un porcentaje (sería engañoso). */
export const MIN_SAMPLE = 5;

/**
 * % de ingresados que obtuvo la certificación AI CERT, en Waves cerradas. Solo agregados (sin datos personales).
 * Ingresados: inscritos en la Wave. Certificados: con certificación aprobada y verificada.
 */
export const certifiedRate = unstable_cache(
  async (): Promise<CertStat | null> => {
    if (!isSupabaseConfigured()) return null;
    const db = supabaseService();
    const { data: waves } = await db.from("waves").select("id, name").eq("status", "CLOSED");
    if (!waves?.length) return null;
    const { data: people } = await db.from("candidates").select("id").in("wave_id", waves.map((w) => w.id)).in("status", ["ENROLLED", "MINDSET_READY"]);
    const ids = (people ?? []).map((p) => p.id);
    if (ids.length < MIN_SAMPLE) return null;
    const { data: certs } = await db.from("certifications").select("candidate_id").in("candidate_id", ids).eq("status", "VERIFIED").eq("result", "PASSED");
    const certified = new Set((certs ?? []).map((c) => c.candidate_id)).size;
    return { rate: Math.round((certified / ids.length) * 100), certified, enrolled: ids.length, waves: waves.map((w) => w.name.replace("AI Edge Talent · ", "")) };
  },
  ["aicert-rate"],
  { revalidate: 600, tags: ["aicert-rate"] },
);
