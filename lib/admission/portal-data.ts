import "server-only";
import { supabaseService } from "@/lib/supabase/server";
import type { PortalData } from "@/components/admission/CandidatePortal";

/** Datos del enlace personal del candidato, por token (el candidato) o por id (vista previa del admin). */
export async function loadPortalData(match: { token: string } | { candidateId: string }): Promise<PortalData | null> {
  const svc = supabaseService();
  const q = svc
    .from("candidates")
    .select("id, invite_token, full_name, client_name, role_title, status, delivery_owner, waves(id, name, application_deadline, commitment_version, conditions_version, acknowledgement_version)");
  const { data: c } = "token" in match ? await q.eq("invite_token", match.token).maybeSingle() : await q.eq("id", match.candidateId).maybeSingle();
  if (!c) return null;
  const { data: app } = await svc.from("applications").select("answers, questions_snapshot, submitted_at, updated_at").eq("candidate_id", c.id).maybeSingle();
  const { data: rv } = c.status === "RESCUE_REQUIRED" ? await svc.from("rescue_videos").select("submitted_at, reviewed_at").eq("candidate_id", c.id).maybeSingle() : { data: null };
  return {
    token: c.invite_token,
    candidate: { fullName: c.full_name, clientName: c.client_name, roleTitle: c.role_title, status: c.status, deliveryOwner: c.delivery_owner },
    wave: c.waves as unknown as PortalData["wave"],
    questions: (app?.questions_snapshot ?? []) as PortalData["questions"],
    answers: (app?.answers ?? {}) as Record<string, string>,
    savedAt: app?.updated_at ?? null,
    submittedAt: app?.submitted_at ?? null,
    rescue: rv ? { at: rv.submitted_at, reviewed: Boolean(rv.reviewed_at) } : null,
  };
}
