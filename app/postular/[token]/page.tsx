import { notFound } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { supabaseService } from "@/lib/supabase/server";
import { CandidatePortal, type PortalData } from "@/components/admission/CandidatePortal";
import { Callout } from "@/components/ui";

export const metadata = { title: "Tu postulación · AI Edge Talent", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PostularTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isSupabaseConfigured()) return <Callout tone="warn" title="Base de datos no configurada" />;
  if (!/^[a-f0-9]{36}$/.test(token)) notFound();
  const svc = supabaseService();
  const { data: c } = await svc
    .from("candidates")
    .select("id, full_name, client_name, role_title, status, delivery_owner, waves(id, name, application_deadline, commitment_version, conditions_version, acknowledgement_version)")
    .eq("invite_token", token)
    .single();
  if (!c) notFound();
  const { data: app } = await svc.from("applications").select("answers, questions_snapshot, submitted_at").eq("candidate_id", c.id).maybeSingle();
  const wave = c.waves as unknown as PortalData["wave"];
  const { data: rv } = c.status === "RESCUE_REQUIRED" ? await svc.from("rescue_videos").select("submitted_at, reviewed_at").eq("candidate_id", c.id).maybeSingle() : { data: null };
  const data: PortalData = {
    token,
    candidate: { fullName: c.full_name, clientName: c.client_name, roleTitle: c.role_title, status: c.status, deliveryOwner: c.delivery_owner },
    wave,
    questions: (app?.questions_snapshot ?? []) as PortalData["questions"],
    answers: (app?.answers ?? {}) as Record<string, string>,
    rescue: rv ? { at: rv.submitted_at, reviewed: Boolean(rv.reviewed_at) } : null,
  };
  return <CandidatePortal data={data} />;
}
