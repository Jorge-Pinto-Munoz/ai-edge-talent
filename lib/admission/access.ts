import "server-only";
import { supabaseService } from "@/lib/supabase/server";
import type { Viewer } from "./auth";

/**
 * Qué candidatos puede ver cada rol de equipo. Admin: todos. Delivery: solo los que tiene asignados
 * (delivery_assignments). Solo lectura: las acciones exigen rol admin en el servidor.
 */
export async function assignedCandidateIds(email: string): Promise<string[]> {
  const { data } = await supabaseService().from("delivery_assignments").select("candidate_id").eq("delivery_email", email.toLowerCase());
  return (data ?? []).map((r) => r.candidate_id);
}

export async function canViewCandidate(viewer: Viewer, candidateId: string): Promise<boolean> {
  if (viewer.role === "admin") return true;
  return (await assignedCandidateIds(viewer.email)).includes(candidateId);
}
