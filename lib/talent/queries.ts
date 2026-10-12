import "server-only";
import { supabaseUser } from "@/lib/supabase/server";
import type { ServiceStatus } from "./rules";

export interface TalentRow {
  id: string;
  email: string;
  full_name: string;
  specialty: string | null;
  specialty_family: string | null;
  current_client: string | null;
  role_title: string | null;
  service_status: ServiceStatus;
  service_status_since: string | null;
  high_talent: boolean;
  participations: { wave_id: string; wave_name: string; status: string; journey_layer: string | null }[];
  nextFollowUp: { kind: string; due_date: string } | null;
}

export async function talentPool(): Promise<TalentRow[]> {
  const db = await supabaseUser();
  const [{ data: talent }, { data: cands }, { data: waves }, { data: fus }] = await Promise.all([
    db.from("talent").select("id, email, full_name, specialty, specialty_family, current_client, role_title, service_status, service_status_since, high_talent").order("full_name"),
    db.from("candidates").select("talent_id, wave_id, status, journey_layer"),
    db.from("waves").select("id, name"),
    db.from("follow_ups").select("talent_id, kind, due_date, done_at").is("done_at", null).order("due_date"),
  ]);
  const waveName = (id: string) => waves?.find((w) => w.id === id)?.name.replace("AI Edge Talent · ", "") ?? id;
  return (talent ?? []).map((t) => ({
    ...t,
    participations: (cands ?? []).filter((c) => c.talent_id === t.id).map((c) => ({ wave_id: c.wave_id, wave_name: waveName(c.wave_id), status: c.status, journey_layer: c.journey_layer })),
    nextFollowUp: (fus ?? []).find((f) => f.talent_id === t.id) ?? null,
  })) as TalentRow[];
}
