import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { LAYERS, layerName, weekStart, type Layer } from "@/lib/journey/rules";
import { ParticipantsBoard } from "@/components/journey-admin/ParticipantsBoard";
import { ReviewQueue } from "@/components/journey-admin/ReviewQueue";
import { GroupsManager } from "@/components/journey-admin/GroupsManager";
import { fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";

const TABS = [
  ["participantes", "Participantes"],
  ["entregas", "Entregas"],
  ["certificaciones", "Certificaciones"],
  ["grupos", "Grupos y mentores"],
  ["feedback", "Feedback semanal"],
] as const;

export default async function JourneyAdmin({ params, searchParams }: { params: Promise<{ waveId: string }>; searchParams: Promise<{ tab?: string; semana?: string }> }) {
  const { waveId } = await params;
  const { tab = "participantes", semana } = await searchParams;
  const viewer = await requireStaffPage(`/admin/journey/${waveId}`);
  const isAdmin = viewer.role === "admin";
  const db = await supabaseUser();
  const { data: wave } = await db.from("waves").select("id, name").eq("id", waveId).single();
  if (!wave) notFound();
  const { data: people } = await db
    .from("candidates")
    .select("id, full_name, client_name, role_title, specialty, status, journey_layer, journey_layer_since")
    .eq("wave_id", waveId)
    .in("status", ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"])
    .order("full_name");
  const ids = (people ?? []).map((p) => p.id);
  const nameOf = (id: string) => people?.find((p) => p.id === id)?.full_name ?? "—";

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <div className="eyebrow"><Link href={`/admin/admision/${waveId}`}>Admisión</Link> · {wave.name}</div>
          <h1 style={{ margin: 0 }}>Journey</h1>
        </div>
        {isAdmin && <Link className="btn secondary" href={`/admin/contenido/${waveId}`}>Contenido y videos</Link>}
      </div>
      <nav className="row" aria-label="Secciones">
        {TABS.map(([k, label]) => (
          <Link key={k} href={`?tab=${k}`} className={`btn small ${tab === k ? "" : "ghost"}`}>{label}</Link>
        ))}
      </nav>

      {tab === "participantes" && <ParticipantsBoard waveId={waveId} people={(people ?? []) as never} isAdmin={isAdmin} />}

      {tab === "entregas" && (await (async () => {
        const { data: subs } = ids.length
          ? await db.from("submissions").select("id, candidate_id, attempt, status, score, feedback, text_answer, files, submitted_at, capsules(title, layer, max_attempts)").in("candidate_id", ids).order("submitted_at", { ascending: false })
          : { data: [] };
        return <ReviewQueue kind="submissions" items={(subs ?? []).map((s) => ({ ...s, person: nameOf(s.candidate_id) })) as never} />;
      })())}

      {tab === "certificaciones" && (await (async () => {
        const { data: certs } = ids.length ? await db.from("certifications").select("*").in("candidate_id", ids).order("created_at", { ascending: false }) : { data: [] };
        return <ReviewQueue kind="certifications" items={(certs ?? []).map((c) => ({ ...c, person: nameOf(c.candidate_id) })) as never} />;
      })())}

      {tab === "grupos" && (await (async () => {
        const { data: groups } = await db.from("wave_groups").select("id, name, group_members(candidate_id), group_mentors(mentor_id, profiles(email, full_name))").eq("wave_id", waveId).order("name");
        return <GroupsManager waveId={waveId} groups={(groups ?? []) as never} people={(people ?? []).map((p) => ({ id: p.id, name: p.full_name, specialty: p.specialty }))} isAdmin={isAdmin} />;
      })())}

      {tab === "feedback" && (await (async () => {
        const week = semana ?? weekStart(new Date());
        const prev = new Date(`${week}T12:00:00Z`); prev.setUTCDate(prev.getUTCDate() - 7);
        const nxt = new Date(`${week}T12:00:00Z`); nxt.setUTCDate(nxt.getUTCDate() + 7);
        const { data: groups } = await db.from("wave_groups").select("id, name, group_members(candidate_id), group_mentors(mentor_id, profiles(email, full_name))").eq("wave_id", waveId).order("name");
        const gIds = (groups ?? []).map((g) => g.id);
        const [{ data: fb }, { data: notes }] = gIds.length
          ? await Promise.all([
              db.from("weekly_feedback").select("*").in("group_id", gIds).eq("week_start", week),
              db.from("group_weekly_notes").select("*").in("group_id", gIds).eq("week_start", week),
            ])
          : [{ data: [] }, { data: [] }];
        const RISK: Record<string, string> = { LOW: "Bajo", MEDIUM: "Medio", HIGH: "Alto" };
        const ATT: Record<string, string> = { FULL: "Completa", PARTIAL: "Parcial", NONE: "Sin asistencia" };
        return (
          <div className="stack">
            <div className="row">
              <Link className="btn ghost small" href={`?tab=feedback&semana=${prev.toISOString().slice(0, 10)}`}>← Semana anterior</Link>
              <strong>Semana del {week}</strong>
              <Link className="btn ghost small" href={`?tab=feedback&semana=${nxt.toISOString().slice(0, 10)}`}>Semana siguiente →</Link>
            </div>
            {(groups ?? []).length === 0 && <p className="muted">Aún no hay grupos con mentores asignados.</p>}
            {(groups ?? []).map((g) => {
              const members = (g.group_members as { candidate_id: string }[]).map((m) => m.candidate_id);
              const mentors = (g.group_mentors as unknown as { mentor_id: string; profiles: { email: string } }[]);
              const gNotes = (notes ?? []).filter((n) => n.group_id === g.id);
              const missing = mentors.filter((m) => !gNotes.some((n) => n.mentor_id === m.mentor_id));
              return (
                <div key={g.id} className="card">
                  <div className="spread">
                    <h3 style={{ margin: 0 }}>{g.name}</h3>
                    {missing.length > 0 ? <span className="badge warn">Falta feedback de {missing.map((m) => m.profiles.email).join(", ")}</span> : <span className="badge ok">Feedback completo</span>}
                  </div>
                  {gNotes.map((n) => (
                    <div key={n.mentor_id} className="callout" style={{ marginTop: 10 }}>
                      <strong>Curso / acompañamiento · {mentors.find((m) => m.mentor_id === n.mentor_id)?.profiles.email}</strong>
                      {n.course_feedback}
                      {n.blockers && <><br /><small><strong>Bloqueos:</strong> {n.blockers}</small></>}
                    </div>
                  ))}
                  <div className="table-wrap" style={{ marginTop: 10 }}>
                    <table>
                      <thead><tr><th>Persona</th><th>Asistencia</th><th>Avance</th><th>Riesgo</th><th>Comentario</th></tr></thead>
                      <tbody>
                        {members.map((cid) => {
                          const f = (fb ?? []).filter((x) => x.candidate_id === cid);
                          if (f.length === 0) return <tr key={cid}><td>{nameOf(cid)}</td><td colSpan={4} className="muted">Sin feedback esta semana</td></tr>;
                          return f.map((x) => (
                            <tr key={x.id}>
                              <td>{nameOf(cid)}</td><td>{ATT[x.attendance]}</td><td>{x.progress}/5</td>
                              <td><span className={`badge ${x.risk === "HIGH" ? "bad" : x.risk === "MEDIUM" ? "warn" : "ok"}`}>{RISK[x.risk]}</span></td>
                              <td><small>{x.comment}</small><br /><small className="muted">{fmtDate(x.updated_at)}</small></td>
                            </tr>
                          ));
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })())}

      <p className="muted"><small>Capas: {LAYERS.map((l) => l.name).join(" → ")}. Etapa sin asignar = {layerName(null as unknown as Layer)} (inscrito, aún sin iniciar AI Mindset).</small></p>
    </div>
  );
}
