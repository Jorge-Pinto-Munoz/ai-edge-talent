import "server-only";
import { supabaseUser } from "@/lib/supabase/server";
import type { Layer } from "./rules";

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

/** Todo lo que el Kiber necesita para su portal (RLS limita a lo suyo y a lo publicado). */
export async function myJourney(userId: string) {
  const db = await supabaseUser();
  const { data: cand } = await db
    .from("candidates")
    .select("id, wave_id, full_name, client_name, role_title, delivery_owner, status, journey_layer, journey_layer_since")
    .eq("user_id", userId)
    .in("status", ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!cand) return null;
  const [wave, guides, capsules, progress, subs, certs, events] = await Promise.all([
    db.from("waves").select("id, name, start_date, estimated_close_date").eq("id", cand.wave_id).single(),
    db.from("stage_guides").select("*").eq("wave_id", cand.wave_id),
    db.from("capsules").select("*").eq("wave_id", cand.wave_id).eq("published", true).order("position"),
    db.from("capsule_progress").select("capsule_id, completed_at").eq("candidate_id", cand.id),
    db.from("submissions").select("id, capsule_id, attempt, status, score, feedback, submitted_at, reviewed_at, text_answer, files").eq("candidate_id", cand.id).order("attempt"),
    db.from("certifications").select("*").eq("candidate_id", cand.id).order("created_at"),
    db.from("journey_events").select("from_layer, to_layer, at").eq("candidate_id", cand.id).order("at"),
  ]);
  return {
    candidate: cand as typeof cand & { journey_layer: Layer | null },
    wave: wave.data,
    guides: (guides.data ?? []) as StageGuide[],
    capsules: (capsules.data ?? []) as Capsule[],
    completed: new Set((progress.data ?? []).map((p) => p.capsule_id)),
    submissions: subs.data ?? [],
    certifications: certs.data ?? [],
    events: events.data ?? [],
  };
}
