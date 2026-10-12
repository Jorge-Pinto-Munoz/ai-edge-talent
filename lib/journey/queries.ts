import "server-only";
import { supabaseService, supabaseUser } from "@/lib/supabase/server";
import type { Layer } from "./rules";
import type { AiCertProgress } from "@/lib/aicert/progress";

export interface Capsule {
  id: string;
  wave_id: string;
  layer: Layer;
  position: number;
  title: string;
  description: string | null;
  duration_min: number | null;
  video_url: string | null;
  video_path: string | null;
  resources: { name: string; path: string; size: number }[];
  task_prompt: string | null;
  task_required: boolean;
  max_attempts: number | null;
  due_date: string | null;
  published: boolean;
}
export interface StageGuide {
  wave_id: string;
  layer: Layer;
  title: string;
  summary: string | null;
  what_happens: string | null;
  what_we_expect: string | null;
  video_url: string | null;
  video_path: string | null;
}

export interface LabProjectView {
  id: string;
  title: string;
  problem: string | null;
  client_name: string | null;
  mode: "INDIVIDUAL" | "GROUP";
  status: "IDEA" | "BUILDING" | "READY" | "PRESENTED";
  showcase_date: string | null;
  showcase_decision: string | null;
  showcase_notes: string | null;
  teammates: number;
  lab_project_files: { id: string; name: string; size_bytes: number | null; kind: string; created_at: string; uploaded_by: string | null }[];
}

const CANDIDATE_COLS = "id, wave_id, full_name, client_name, role_title, delivery_owner, status, journey_layer, journey_layer_since";
const ACTIVE = ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"];
type Db = Awaited<ReturnType<typeof supabaseUser>> | ReturnType<typeof supabaseService>;

/** Todo lo que el Kiber necesita para su portal (RLS limita a lo suyo y a lo publicado). */
export async function myJourney(userId: string) {
  const db = await supabaseUser();
  const { data: cand } = await db.from("candidates").select(CANDIDATE_COLS).eq("user_id", userId).in("status", ACTIVE).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return cand ? loadJourney(db, cand as Cand) : null;
}

/** Vista previa del admin: el journey de un participante tal como lo ve él (lectura con la llave de servicio; quien llama verifica que sea admin). */
export async function journeyForCandidate(candidateId: string) {
  const db = supabaseService();
  const { data: cand } = await db.from("candidates").select(CANDIDATE_COLS).eq("id", candidateId).in("status", ACTIVE).maybeSingle();
  return cand ? loadJourney(db, cand as Cand) : null;
}

type Cand = { id: string; wave_id: string; full_name: string; client_name: string | null; role_title: string | null; delivery_owner: string | null; status: string; journey_layer: string | null; journey_layer_since: string | null };

async function loadJourney(db: Db, cand: Cand) {
  const [wave, guides, capsules, progress, subs, certs, events, aicert, pulses] = await Promise.all([
    db.from("waves").select("id, name, start_date, estimated_close_date").eq("id", cand.wave_id).single(),
    db.from("stage_guides").select("*").eq("wave_id", cand.wave_id),
    db.from("capsules").select("*").eq("wave_id", cand.wave_id).eq("published", true).order("position"),
    db.from("capsule_progress").select("capsule_id, completed_at").eq("candidate_id", cand.id),
    db.from("submissions").select("id, capsule_id, attempt, status, score, feedback, submitted_at, reviewed_at, text_answer, files").eq("candidate_id", cand.id).order("attempt"),
    db.from("certifications").select("*").eq("candidate_id", cand.id).order("created_at"),
    db.from("journey_events").select("from_layer, to_layer, at").eq("candidate_id", cand.id).order("at"),
    db.from("aicert_progress").select("course, tramo, percent, intro_course, specialist_course, exam_date, note, updated_at").eq("candidate_id", cand.id).maybeSingle(),
    db.from("pulse_responses").select("pulse").eq("candidate_id", cand.id),
  ]);
  // Proyecto del AI Lab (RLS: el integrante ve su proyecto, sus compañeros y sus archivos).
  let lab: LabProjectView | null = null;
  if (cand.journey_layer === "AI_LAB_SHOWCASE" || cand.journey_layer === "CLOSURE") {
    const { data: m } = await db.from("lab_project_members").select("project_id").eq("candidate_id", cand.id).maybeSingle();
    if (m) {
      const { data: p } = await db
        .from("lab_projects")
        .select("id, title, problem, client_name, mode, status, showcase_date, showcase_decision, showcase_notes, lab_project_files(id, name, size_bytes, kind, created_at, uploaded_by)")
        .eq("id", m.project_id)
        .maybeSingle();
      const { data: mates } = await db.from("lab_project_members").select("candidate_id").eq("project_id", m.project_id);
      lab = p ? ({ ...p, teammates: (mates ?? []).length } as unknown as LabProjectView) : null;
    }
  }
  return {
    lab,
    candidate: cand as typeof cand & { journey_layer: Layer | null },
    wave: wave.data,
    guides: (guides.data ?? []) as StageGuide[],
    capsules: (capsules.data ?? []) as Capsule[],
    completed: new Set((progress.data ?? []).map((p) => p.capsule_id)),
    submissions: subs.data ?? [],
    certifications: certs.data ?? [],
    events: events.data ?? [],
    aicert: (aicert.data ?? null) as AiCertProgress | null,
    answeredPulses: (pulses.data ?? []).map((p) => p.pulse as string),
  };
}
