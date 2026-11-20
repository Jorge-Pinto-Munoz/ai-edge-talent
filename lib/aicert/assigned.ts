import "server-only";
import { supabaseService } from "@/lib/supabase/server";

/** Certificación asignada (curso especialista AI CERT) por persona. */
export async function assignedCerts(ids: string[], svc = supabaseService()): Promise<Map<string, string>> {
  if (!ids.length) return new Map();
  const { data } = await svc.from("aicert_progress").select("candidate_id, specialist_course").in("candidate_id", ids);
  return new Map((data ?? []).filter((r) => r.specialist_course).map((r) => [r.candidate_id as string, r.specialist_course as string]));
}
