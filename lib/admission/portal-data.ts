import "server-only";
import { supabaseService } from "@/lib/supabase/server";
import { rescueOpen, rescueState } from "./rescue";
import type { PortalData } from "@/components/admission/CandidatePortal";

/** Datos del enlace personal del candidato, por token (el candidato) o por id (vista previa del admin). */
export async function loadPortalData(match: { token: string } | { candidateId: string }): Promise<PortalData | null> {
  const svc = supabaseService();
  const q = svc
    .from("candidates")
    .select("id, invite_token, full_name, client_name, role_title, status, delivery_owner, waves(id, name, application_deadline, application_deadline_hidden, commitment_version, conditions_version, acknowledgement_version)");
  const { data: c } = "token" in match ? await q.eq("invite_token", match.token).maybeSingle() : await q.eq("id", match.candidateId).maybeSingle();
  if (!c) return null;
  const { data: app } = await svc.from("applications").select("answers, questions_snapshot, submitted_at, updated_at").eq("candidate_id", c.id).maybeSingle();
  // El rescate solo existe si Administración lo ofreció formalmente (invitación con plazo).
  const { data: inv } = await svc.from("rescue_invitations").select("expires_at, started_at, explanation").eq("candidate_id", c.id).maybeSingle();
  const { data: rv } = inv ? await svc.from("rescue_videos").select("submitted_at, reviewed_at").eq("candidate_id", c.id).maybeSingle() : { data: null };
  const now = new Date();
  const rescueInput = { status: c.status, invitation: inv ?? null, video: rv ?? null };
  return {
    token: c.invite_token,
    candidate: { fullName: c.full_name, clientName: c.client_name, roleTitle: c.role_title, status: c.status, deliveryOwner: c.delivery_owner },
    // Si Administración ocultó la fecha de cierre, no se muestra (la ventana se sigue aplicando en el servidor).
    wave: (() => { const w = c.waves as unknown as PortalData["wave"] & { application_deadline_hidden?: boolean }; return { ...w, application_deadline: w.application_deadline_hidden ? null : w.application_deadline }; })(),
    questions: (app?.questions_snapshot ?? []) as PortalData["questions"],
    answers: (app?.answers ?? {}) as Record<string, string>,
    savedAt: app?.updated_at ?? null,
    submittedAt: app?.submitted_at ?? null,
    rescue: inv
      ? {
          state: rescueState(rescueInput, now),
          open: rescueOpen(rescueInput, now),
          expiresAt: inv.expires_at,
          explanation: inv.explanation ?? null,
          serverNow: now.toISOString(),
          video: rv ? { at: rv.submitted_at, reviewed: Boolean(rv.reviewed_at) } : null,
        }
      : null,
  };
}
