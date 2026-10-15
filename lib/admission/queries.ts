import "server-only";
import { supabaseService, supabaseUser } from "@/lib/supabase/server";

export interface CandidateListItem {
  id: string;
  full_name: string;
  corporate_email: string;
  client_name: string | null;
  role_title: string | null;
  specialty: string | null;
  delivery_owner: string | null;
  source: string;
  status: string;
  updated_at: string;
  /** Último movimiento: cambio de estado o respuesta guardada en la postulación. */
  last_activity: string;
  eval: { total: number; level: string; recommendation: string; pl: string | null; created_at: string } | null;
  decision: { outcome: string; agrees_with_ai: boolean | null } | null;
  lastEmail: { template: string; status: string; created_at: string } | null;
  /** Rescate (solo si Administración lo ofreció): plazo y fechas del video, sin el video. */
  rescue: { expires_at: string | null; started_at: string | null; submitted_at: string | null; reviewed_at: string | null } | null;
  /** El correo de bienvenida a seleccionados falló y no se ha reenviado con éxito. */
  welcomeFailed: boolean;
}

/** Lista de la Wave. Las columnas de evaluación solo llegan si el usuario es admin (RLS). */
export async function listCandidates(waveId: string): Promise<CandidateListItem[]> {
  const db = await supabaseUser();
  const { data: cands, error } = await db
    .from("candidates")
    .select("id, full_name, corporate_email, client_name, role_title, specialty, delivery_owner, source, status, updated_at, applications(id, updated_at)")
    .eq("wave_id", waveId)
    .order("full_name");
  if (error) throw error;
  // applications es 1:1 (candidate_id único): PostgREST lo devuelve como objeto o null, no como lista.
  const appOf = (a: unknown) => (Array.isArray(a) ? a[0] : a) as { id?: string; updated_at?: string } | null | undefined;
  const appIdOf = (a: unknown): string | undefined => appOf(a)?.id;
  const appIds = (cands ?? []).map((c) => appIdOf(c.applications)).filter((x): x is string => Boolean(x));
  const ids = (cands ?? []).map((c) => c.id);
  const [{ data: evals }, { data: decisions }, { data: emails }] = await Promise.all([
    appIds.length ? db.from("ai_evaluations").select("application_id, weighted_total, level, recommendation, pl_recommendation, created_at").in("application_id", appIds).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
    ids.length ? db.from("decisions").select("candidate_id, outcome, agrees_with_ai, decided_at").in("candidate_id", ids).order("decided_at", { ascending: false }) : Promise.resolve({ data: [] }),
    ids.length ? db.from("email_messages").select("candidate_id, template, status, created_at").in("candidate_id", ids).order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
  ]);
  // Fechas del rescate: la lista de personas ya viene filtrada por permisos; aquí solo se agregan fechas (no el video).
  const svc = supabaseService();
  const [{ data: invs }, { data: vids }] = ids.length
    ? await Promise.all([
        svc.from("rescue_invitations").select("candidate_id, expires_at, started_at").in("candidate_id", ids),
        svc.from("rescue_videos").select("candidate_id, submitted_at, reviewed_at").in("candidate_id", ids),
      ])
    : [{ data: [] }, { data: [] }];
  return (cands ?? []).map((c) => {
    const inv = (invs ?? []).find((i) => i.candidate_id === c.id);
    const vid = (vids ?? []).find((v) => v.candidate_id === c.id);
    const welcome = (emails ?? []).find((e) => e.candidate_id === c.id && e.template === "SELECTED_WELCOME");
    const appId = appIdOf(c.applications);
    const ev = (evals ?? []).find((e) => e.application_id === appId);
    const dec = (decisions ?? []).find((d) => d.candidate_id === c.id);
    const em = (emails ?? []).find((e) => e.candidate_id === c.id);
    return {
      id: c.id,
      full_name: c.full_name,
      corporate_email: c.corporate_email,
      client_name: c.client_name,
      role_title: c.role_title,
      specialty: c.specialty,
      delivery_owner: c.delivery_owner,
      source: c.source,
      status: c.status,
      updated_at: c.updated_at,
      last_activity: [c.updated_at, appOf(c.applications)?.updated_at].filter(Boolean).sort().at(-1) ?? c.updated_at,
      eval: ev ? { total: Number(ev.weighted_total), level: ev.level, recommendation: ev.recommendation, pl: ev.pl_recommendation ?? null, created_at: ev.created_at } : null,
      decision: dec ? { outcome: dec.outcome, agrees_with_ai: dec.agrees_with_ai } : null,
      lastEmail: em ? { template: em.template, status: em.status, created_at: em.created_at } : null,
      rescue: inv ? { expires_at: inv.expires_at, started_at: inv.started_at, submitted_at: vid?.submitted_at ?? null, reviewed_at: vid?.reviewed_at ?? null } : null,
      welcomeFailed: welcome?.status === "failed",
    };
  });
}
