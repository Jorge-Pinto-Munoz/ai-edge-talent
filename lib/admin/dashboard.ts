import "server-only";
import { supabaseUser } from "@/lib/supabase/server";
import { attendanceByPerson } from "@/lib/teacher/rules";

const PRE_SUBMIT = ["NOMINATED", "INVITED", "IDENTIFIED", "APPLICATION_STARTED"];
const EVALUATED = ["ASSESSMENT_EVALUATED", "HUMAN_REVIEW", "RESCUE_REQUIRED", "NOT_SELECTED", "SELECTED", "CONDITIONS_PENDING", "CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"];
const SELECTED = ["SELECTED", "CONDITIONS_PENDING", "CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"];
const ENROLLED = ["ENROLLED", "MINDSET_READY"];
const LAYERS = ["ASSESSMENT", "AI_MINDSET", "ROLE_ENABLEMENT", "AI_LAB_SHOWCASE", "CLOSURE"];

export interface PendingItem {
  key: string;
  label: string;
  hint: string;
  count: number;
  href: string;
  adminOnly?: boolean;
}

export interface WaveDashboard {
  wave: { id: string; name: string; status: string; application_deadline: string | null };
  total: number;
  funnel: { label: string; count: number }[];
  pending: PendingItem[];
  recent: { at: string; name: string; to: string; actor: string | null }[];
}

/** Lo que necesita atención hoy en una Wave, más su embudo de avance. Todo filtrado por RLS del usuario. */
export async function waveDashboard(waveId: string, isAdmin: boolean): Promise<WaveDashboard | null> {
  const db = await supabaseUser();
  const { data: wave } = await db.from("waves").select("id, name, status, application_deadline").eq("id", waveId).maybeSingle();
  if (!wave) return null;

  const { data: cands } = await db.from("candidates").select("id, full_name, status, journey_layer, talent_id").eq("wave_id", waveId);
  const cs = cands ?? [];
  const ids = cs.map((c) => c.id);
  const byStatus = (list: string[]) => cs.filter((c) => list.includes(c.status)).length;
  const reached = (layer: string) => cs.filter((c) => c.journey_layer && LAYERS.indexOf(c.journey_layer) >= LAYERS.indexOf(layer)).length;
  const today = new Date().toISOString().slice(0, 10);

  const [subs, certs, fus, events, reports, ready] = await Promise.all([
    ids.length ? db.from("submissions").select("id", { count: "exact", head: true }).in("candidate_id", ids).in("status", ["SUBMITTED", "HUMAN_REVIEW"]) : Promise.resolve({ count: 0 }),
    ids.length ? db.from("certifications").select("id", { count: "exact", head: true }).in("candidate_id", ids).eq("status", "PENDING_REVIEW") : Promise.resolve({ count: 0 }),
    db.from("follow_ups").select("id", { count: "exact", head: true }).eq("wave_id", waveId).is("done_at", null).lt("due_date", today),
    ids.length ? db.from("admission_events").select("candidate_id, to_status, actor_label, at").in("candidate_id", ids).order("at", { ascending: false }).limit(8) : Promise.resolve({ data: [] }),
    db.from("teacher_classes").select("id, held_on").eq("wave_id", waveId),
    db.from("lab_projects").select("id", { count: "exact", head: true }).eq("wave_id", waveId).eq("status", "READY"),
  ]);
  // Alertas de asistencia (2 clases seguidas sin asistir o bajo 75%), calculadas desde el registro del profesor.
  const classes = reports.data ?? [];
  const { data: att } = classes.length ? await db.from("teacher_class_attendance").select("class_id, candidate_id, attended").in("class_id", classes.map((c) => c.id)) : { data: [] };
  const concerns = { count: attendanceByPerson(classes, att ?? [], ids).filter((a) => a.alert && a.alert.level !== "low").length };

  const pending: PendingItem[] = [
    { key: "evaluate", label: "Postulaciones por evaluar", hint: "Enviadas y sin evaluación de IA", count: byStatus(["APPLICATION_SUBMITTED"]), href: `/admin/admision/${waveId}?estado=APPLICATION_SUBMITTED`, adminOnly: true },
    { key: "decide", label: "Decisiones pendientes", hint: "Evaluadas, en revisión humana o repechaje", count: byStatus(["ASSESSMENT_EVALUATED", "HUMAN_REVIEW", "RESCUE_REQUIRED"]), href: `/admin/admision/${waveId}?vista=columnas` },
    { key: "conditions", label: "Compromisos sin aceptar", hint: "Seleccionados que aún no firman", count: byStatus(["SELECTED", "CONDITIONS_PENDING"]), href: `/admin/admision/${waveId}?vista=columnas` },
    { key: "submissions", label: "Entregas por revisar", hint: "Tareas de Mindset enviadas", count: subs.count ?? 0, href: `/admin/journey/${waveId}/mindset?tab=entregas` },
    { key: "certs", label: "Certificaciones por verificar", hint: "AI CERT subidas por participantes", count: certs.count ?? 0, href: `/admin/journey/${waveId}/role-enablement?tab=certificaciones` },
    { key: "concerns", label: "Alertas de asistencia", hint: "Dos clases seguidas sin asistir o asistencia bajo 75%", count: concerns.count ?? 0, href: `/admin/journey/${waveId}?vista=clases#seguimiento` },
    { key: "showcase", label: "Proyectos listos para Showcase", hint: "AI Lab: presentación lista, falta presentar", count: ready.count ?? 0, href: `/admin/journey/${waveId}/ai-lab?tab=showcase` },
    { key: "followups", label: "Seguimientos vencidos", hint: "Mes 1 o Mes 3 sin registrar", count: fus.count ?? 0, href: "/admin/talento" },
  ].filter((p) => isAdmin || !p.adminOnly);

  const nameOf = (id: string) => cs.find((c) => c.id === id)?.full_name ?? "—";
  return {
    wave,
    total: cs.length,
    funnel: [
      { label: "Candidatos", count: cs.length },
      { label: "Postularon", count: cs.filter((c) => !PRE_SUBMIT.includes(c.status)).length },
      { label: "Evaluados", count: byStatus(EVALUATED) },
      { label: "Seleccionados", count: byStatus(SELECTED) },
      { label: "Inscritos", count: byStatus(ENROLLED) },
      { label: "AI First Mindset", count: reached("AI_MINDSET") },
      { label: "Role Enablement", count: reached("ROLE_ENABLEMENT") },
      { label: "AI Lab & Showcase", count: reached("AI_LAB_SHOWCASE") },
      { label: "Cierre", count: reached("CLOSURE") },
    ],
    pending,
    recent: ((events as { data: { candidate_id: string; to_status: string; actor_label: string | null; at: string }[] | null }).data ?? []).map((e) => ({ at: e.at, name: nameOf(e.candidate_id), to: e.to_status, actor: e.actor_label })),
  };
}
