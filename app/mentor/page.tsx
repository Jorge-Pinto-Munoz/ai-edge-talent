import { redirect } from "next/navigation";
import { SignOut } from "@/components/admission/SignOut";
import { getViewer } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { weekStart, type Layer } from "@/lib/journey/rules";
import { WeeklyFeedbackForm } from "@/components/journey/WeeklyFeedbackForm";
import { Callout } from "@/components/ui";

export const metadata = { title: "Mentor · AI Edge Talent" };
export const dynamic = "force-dynamic";

export default async function MentorPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/mentor");
  if (viewer.role !== "mentor") redirect("/inicio");
  const db = await supabaseUser();
  const week = weekStart(new Date());
  const { data: groups } = await db.from("wave_groups").select("id, name, feedback_from, waves(name), group_members(candidate_id)").order("name");
  const ids = (groups ?? []).flatMap((g) => (g.group_members as { candidate_id: string }[]).map((m) => m.candidate_id));
  const [{ data: people }, { data: fb }, { data: notes }] = await Promise.all([
    ids.length ? db.from("candidates").select("id, full_name, role_title, client_name, journey_layer").in("id", ids) : Promise.resolve({ data: [] }),
    db.from("weekly_feedback").select("*").eq("mentor_id", viewer.id).eq("week_start", week),
    db.from("group_weekly_notes").select("*").eq("mentor_id", viewer.id).eq("week_start", week),
  ]);
  return (
    <div className="stack">
      <div className="dark-band" style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: 16, right: 16 }}><SignOut /></div>
        <div className="eyebrow">Mentor · acompañamiento</div>
        <h1 style={{ color: "#fff", margin: 0 }}>Feedback semanal</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>Semana del {week}. Cuéntanos cómo va cada persona y cómo va el curso. Puedes editarlo hasta el domingo.</p>
      </div>
      {(groups ?? []).length === 0 && <Callout title="Aún no tienes grupos asignados">El equipo AI Edge Talent te asignará uno o más grupos.</Callout>}
      {(groups ?? []).map((g) => {
        const members = (people ?? []).filter((p) => (g.group_members as { candidate_id: string }[]).some((m) => m.candidate_id === p.id));
        return (
          <WeeklyFeedbackForm
            key={g.id}
            groupId={g.id}
            groupName={`${g.name} · ${(g.waves as unknown as { name: string }).name}`}
            people={members.map((p) => ({ id: p.id, name: p.full_name, role: p.role_title, layer: p.journey_layer as Layer | null }))}
            existing={(fb ?? []).filter((f) => f.group_id === g.id)}
            note={(notes ?? []).find((n) => n.group_id === g.id) ?? null}
          />
        );
      })}
    </div>
  );
}
