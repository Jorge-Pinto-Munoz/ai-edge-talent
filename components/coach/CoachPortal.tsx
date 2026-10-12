import { SignOut } from "@/components/admission/SignOut";
import { supabaseService, supabaseUser } from "@/lib/supabase/server";
import { weekStart, type Layer } from "@/lib/journey/rules";
import { WeeklyFeedbackForm } from "@/components/journey/WeeklyFeedbackForm";
import { Callout } from "@/components/ui";

/**
 * Portal del AI Coach: feedback semanal de sus grupos.
 * `preview` (admin): muestra exactamente lo de ese coach, sin poder enviar (formulario bloqueado).
 */
export async function CoachPortal({ coachId, preview }: { coachId: string; preview?: { label: string } }) {
  const db = preview ? supabaseService() : await supabaseUser();
  const week = weekStart(new Date());
  const { data: links } = await db.from("group_mentors").select("group_id").eq("mentor_id", coachId);
  const groupIds = (links ?? []).map((l) => l.group_id);
  const { data: groups } = groupIds.length
    ? await db.from("wave_groups").select("id, name, waves(name), group_members(candidate_id)").in("id", groupIds).order("name")
    : { data: [] };
  const ids = (groups ?? []).flatMap((g) => (g.group_members as { candidate_id: string }[]).map((m) => m.candidate_id));
  const [{ data: people }, { data: fb }, { data: notes }] = await Promise.all([
    ids.length ? db.from("candidates").select("id, full_name, role_title, client_name, journey_layer").in("id", ids) : Promise.resolve({ data: [] as { id: string; full_name: string; role_title: string | null; client_name: string | null; journey_layer: string | null }[] }),
    db.from("weekly_feedback").select("*").eq("mentor_id", coachId).eq("week_start", week),
    db.from("group_weekly_notes").select("*").eq("mentor_id", coachId).eq("week_start", week),
  ]);
  return (
    <div className="stack">
      {preview && <div className="jr-preview" role="note"><span><strong>Vista de admin</strong> · así ve su portal {preview.label}. Los envíos están desactivados.</span></div>}
      <div className="dark-band" style={{ position: "relative" }}>
        {!preview && <div style={{ position: "absolute", top: 16, right: 16 }}><SignOut /></div>}
        <div className="eyebrow">AI Coach · acompañamiento</div>
        <h1 style={{ color: "#fff", margin: 0 }}>Feedback semanal</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>Semana del {week}. Cuéntanos cómo va cada persona y cómo va el curso. Puedes editarlo hasta el domingo.</p>
      </div>
      {(groups ?? []).length === 0 && <Callout title="Aún no tienes grupos asignados">El equipo AI Edge Talent te asignará uno o más grupos.</Callout>}
      <fieldset className="preview-lock" disabled={Boolean(preview)}>
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
      </fieldset>
    </div>
  );
}
