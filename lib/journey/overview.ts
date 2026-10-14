import "server-only";
import { supabaseUser } from "@/lib/supabase/server";
import { waveReport } from "@/lib/pulse/report";
import { attendanceByPerson } from "@/lib/teacher/rules";
import { JOURNEY_STATUSES as JS } from "@/lib/admission/view-as";
import { LAYERS, type Layer } from "./rules";
import { JOURNEY_STAGES, type JourneyStage } from "./stages";

const JOURNEY_STATUSES = [...JS] as string[];
const PRE_SUBMIT = ["NOMINATED", "INVITED", "IDENTIFIED", "APPLICATION_STARTED"];
const DECIDED = ["NOT_SELECTED", "SELECTED", "CONDITIONS_PENDING", "CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"];
const TO_DECIDE = ["ASSESSMENT_EVALUATED", "HUMAN_REVIEW", "RESCUE_REQUIRED"];

export type StageState = "pending" | "idle" | "progress" | "attention" | "done";
export const STAGE_STATE_LABEL: Record<StageState, string> = { pending: "Sin iniciar", idle: "Sin personas ahora", progress: "En curso", attention: "Requiere atención", done: "Completada" };

export interface StageAction { label: string; count: number; tab: string }
export interface StageSummary {
  stage: JourneyStage;
  /** Personas que hoy están en la etapa. */
  inStage: number;
  /** Personas que ya la completaron (pasaron a una etapa siguiente o recibieron decisión). */
  completed: number | null;
  /** Con alerta de riesgo o asistencia (requieren intervención). */
  flagged: number;
  /** Base del porcentaje: quienes podían recorrerla. */
  base: number;
  pct: number | null;
  actions: StageAction[];
  state: StageState;
}

/** Layer efectiva: inscrito sin capa aún = empieza en AI First Mindset. */
const effective = (l: string | null): Layer => (l as Layer | null) ?? "AI_MINDSET";
const idx = (l: Layer) => LAYERS.findIndex((x) => x.id === l);

/** Estado de cada etapa de la Wave, desde los datos reales (RLS del usuario). */
export async function journeyOverview(waveId: string): Promise<{ stages: StageSummary[]; enrolled: number; candidates: number }> {
  const db = await supabaseUser();
  const { data: cands } = await db.from("candidates").select("id, status, journey_layer").eq("wave_id", waveId);
  const cs = cands ?? [];
  const people = cs.filter((c) => JOURNEY_STATUSES.includes(c.status));
  const ids = people.map((p) => p.id);
  const count = (list: string[]) => cs.filter((c) => list.includes(c.status)).length;

  const [report, { data: subs }, { data: certs }, { data: labs }, { data: classes }] = await Promise.all([
    waveReport(waveId),
    ids.length ? db.from("submissions").select("candidate_id, status, capsules(layer)").in("candidate_id", ids).in("status", ["SUBMITTED", "HUMAN_REVIEW"]) : Promise.resolve({ data: [] }),
    ids.length ? db.from("certifications").select("id").in("candidate_id", ids).eq("status", "PENDING_REVIEW") : Promise.resolve({ data: [] }),
    db.from("lab_projects").select("status, showcase_decision").eq("wave_id", waveId),
    db.from("teacher_classes").select("id, held_on").eq("wave_id", waveId),
  ]);
  const { data: att } = (classes ?? []).length ? await db.from("teacher_class_attendance").select("class_id, candidate_id, attended").in("class_id", (classes ?? []).map((c) => c.id)) : { data: [] };
  const attendanceFlag = new Set(attendanceByPerson(classes ?? [], att ?? [], ids).filter((a) => a.alert && a.alert.level !== "low").map((a) => a.candidateId));
  const riskFlag = new Set(report.persons.filter((p) => p.alert).map((p) => p.id));
  const subsIn = (layer: Layer) => (subs ?? []).filter((s) => (s.capsules as unknown as { layer: string } | null)?.layer === layer).length;
  const ready = (labs ?? []).filter((p) => p.status === "READY" && !p.showcase_decision).length;

  const stages = JOURNEY_STAGES.map((stage): StageSummary => {
    if (stage.layer === "ASSESSMENT") {
      const submitted = cs.filter((c) => !PRE_SUBMIT.includes(c.status)).length;
      const actions: StageAction[] = [
        { label: "Postulaciones por evaluar", count: count(["APPLICATION_SUBMITTED"]), tab: "resumen" },
        { label: "Decisiones pendientes", count: count(TO_DECIDE), tab: "resumen" },
        { label: "Compromisos sin aceptar", count: count(["SELECTED", "CONDITIONS_PENDING"]), tab: "resumen" },
      ].filter((a) => a.count > 0);
      const inStage = cs.length - count(JOURNEY_STATUSES) - count(["NOT_SELECTED"]);
      const completed = count(DECIDED);
      return summary(stage, Math.max(0, inStage), completed, 0, submitted, actions);
    }
    const k = idx(stage.layer);
    const here = people.filter((p) => effective(p.journey_layer) === stage.layer);
    const after = stage.layer === "CLOSURE" ? null : people.filter((p) => idx(effective(p.journey_layer)) > k).length;
    const flagged = here.filter((p) => riskFlag.has(p.id) || attendanceFlag.has(p.id)).length;
    const actions: StageAction[] = (
      stage.layer === "AI_MINDSET" ? [{ label: "Entregas por revisar", count: subsIn("AI_MINDSET"), tab: "entregas" }]
      : stage.layer === "ROLE_ENABLEMENT" ? [{ label: "Certificaciones por verificar", count: (certs ?? []).length, tab: "certificaciones" }, { label: "Entregas por revisar", count: subsIn("ROLE_ENABLEMENT"), tab: "entregas" }]
      : stage.layer === "AI_LAB_SHOWCASE" ? [{ label: "Proyectos listos para Showcase", count: ready, tab: "showcase" }]
      : []
    ).filter((a) => a.count > 0);
    if (flagged) actions.unshift({ label: flagged === 1 ? "Persona con alerta" : "Personas con alerta", count: flagged, tab: stage.layer === "ROLE_ENABLEMENT" ? "aicert" : stage.layer === "AI_MINDSET" ? "clases" : "participantes" });
    return summary(stage, here.length, after, flagged, people.length, actions);
  });
  return { stages, enrolled: people.length, candidates: cs.length };
}

function summary(stage: JourneyStage, inStage: number, completed: number | null, flagged: number, base: number, actions: StageAction[]): StageSummary {
  const pct = base > 0 ? Math.round(((completed ?? inStage) / base) * 100) : null;
  // Completada solo si toda la Wave la pasó; si algunos la pasaron y otros aún no llegan, no hay nadie "ahora".
  const passed = completed ?? 0;
  const state: StageState = actions.length ? "attention" : inStage > 0 ? "progress" : base > 0 && passed >= base ? "done" : passed > 0 ? "idle" : "pending";
  return { stage, inStage, completed, flagged, base, pct, actions, state };
}
