import "server-only";
import { myStaffWaves, type Viewer } from "@/lib/admission/auth";
import { supabaseService } from "@/lib/supabase/server";
import { waveSessions } from "@/lib/teacher/sessions";
import { MATCH_LABEL, attendanceMatch, type Focus } from "@/lib/teacher/sessions-rules";
import { todayChile } from "@/lib/teacher/rules";
import { ReSessionForm } from "./ReSessionForm";
import { DownloadButton } from "@/components/journey/SignedLink";
import { Icon } from "@/components/site/Icon";
import { fmtYmd } from "@/components/ui";
import { prettyName } from "@/lib/text/org";

/**
 * Role Enablement: las 4 sesiones semanales de la Wave. El profesor (o el admin) registra cada una;
 * Delivery ve lo público y los check-in; los comentarios de clase y la concentración por persona son solo del admin.
 */
export async function ReSessions({ waveId, viewer, open }: { waveId: string; viewer: Viewer; open?: number }) {
  const canEdit = viewer.role === "admin" || (viewer.role === "profesor" && (await myStaffWaves(viewer)).includes(waveId));
  const svc = supabaseService();
  const [sessions, { data: people }] = await Promise.all([
    waveSessions(waveId, { private: canEdit }),
    svc.from("candidates").select("id, full_name, client_name").eq("wave_id", waveId).eq("journey_layer", "ROLE_ENABLEMENT").order("full_name"),
  ]);
  const today = todayChile();
  const group = people ?? [];
  const held = sessions.filter((s) => s.heldOn && s.heldOn <= today);
  const marks = sessions.flatMap((s) => s.attendance.filter((a) => group.some((p) => p.id === a.candidateId)));
  const rate = marks.length ? Math.round((marks.filter((a) => a.attended).length / marks.length) * 100) : null;
  const low = new Set(marks.filter((a) => a.focus === "LOW").map((a) => a.candidateId));
  const checkins = sessions.reduce((n, s) => n + s.checkins.filter((c) => group.some((p) => p.id === c.candidateId)).length, 0);
  const current = open ?? (sessions.find((s) => !s.heldOn || s.heldOn > today)?.n ?? 4);

  return (
    <div className="stack">
      <section className="adm-kpis" aria-label="Resumen de sesiones">
        <div className="adm-kpi"><span className="ico"><Icon name="calendar" size={20} /></span><strong>{held.length}/4</strong><small>Sesiones realizadas</small></div>
        <div className="adm-kpi"><span className="ico"><Icon name="users" size={20} /></span><strong>{rate === null ? "—" : `${rate}%`}</strong><small>Asistencia {canEdit ? "registrada" : "(la ve el admin)"}</small></div>
        <div className="adm-kpi"><span className="ico"><Icon name="check" size={20} /></span><strong>{checkins}</strong><small>Check-in de profesionales</small></div>
        {canEdit && <div className="adm-kpi"><span className="ico"><Icon name="alert" size={20} /></span><strong>{low.size}</strong><small>Con baja concentración</small></div>}
      </section>

      {canEdit && group.length > 0 && (
        <section className="adm-card">
          <div className="adm-card-head"><h2>Asistencia por persona</h2><span className="muted">Profesor + check-in del profesional · solo admin</span></div>
          <div className="table-wrap" tabIndex={0}>
            <table className="rtable res-matrix">
              <thead><tr><th>Profesional</th>{sessions.map((s) => <th key={s.n}>Semana {s.n}</th>)}</tr></thead>
              <tbody>
                {group.map((p) => (
                  <tr key={p.id}>
                    <td className="rt-title"><strong>{p.full_name}</strong><small className="muted">{p.client_name ? prettyName(p.client_name) : "—"}</small></td>
                    {sessions.map((s) => {
                      const a = s.attendance.find((x) => x.candidateId === p.id);
                      const m = attendanceMatch(a ? a.attended : null, s.checkins.some((c) => c.candidateId === p.id));
                      const t = MATCH_LABEL[m];
                      return (
                        <td key={s.n} data-label={`Semana ${s.n}`}>
                          <span className={`res-dot ${t.tone}`} title={t.label} aria-label={t.label} />
                          {a?.focus === "LOW" && <span className="badge warn" title={a.note ?? undefined}>Baja concentración</span>}
                          {a?.focus === "HIGH" && <span className="badge ok">Destacado/a</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted res-legend"><small><span className="res-dot ok" /> Asistió · <span className="res-dot warn" /> Check-in pero ausente · <span className="res-dot bad" /> No asistió · <span className="res-dot" /> Sin registro</small></p>
        </section>
      )}

      <div className="res-list">
        {sessions.map((s) => {
          const done = Boolean(s.heldOn && s.heldOn <= today);
          const state = s.attendance.length ? "Registrada" : done ? "Realizada · falta registrar" : s.heldOn ? `Programada · ${fmtYmd(s.heldOn)}` : "Por programar";
          return (
            <details key={s.n} className={`res-card adm-card${s.attendance.length ? " done" : ""}`} open={s.n === current}>
              <summary>
                <span className="res-n" aria-hidden="true">{s.attendance.length ? <Icon name="check" size={18} /> : s.n}</span>
                <span className="res-t"><small>Semana {s.n}{s.heldOn ? ` · ${fmtYmd(s.heldOn)}` : ""}</small><strong>{s.title ?? `Sesión ${s.n}`}</strong></span>
                <span className={`res-state${s.attendance.length ? " ok" : done ? " warn" : ""}`}>{state}</span>
                <span className="res-meta"><Icon name="check" size={14} /> {s.checkins.length} check-in · <Icon name="download" size={14} /> {s.materials.length}</span>
              </summary>
              {canEdit ? (
                <ReSessionForm
                  waveId={waveId}
                  n={s.n}
                  today={today}
                  init={{ heldOn: s.heldOn ?? "", title: s.title ?? "", studentNotes: s.studentNotes ?? "", adminComments: s.adminComments ?? "", materials: s.materials }}
                  people={group.map((p) => {
                    const a = s.attendance.find((x) => x.candidateId === p.id);
                    return { id: p.id, name: p.full_name, client: p.client_name ? prettyName(p.client_name) : null, attended: a ? a.attended : null, focus: (a?.focus ?? "OK") as Focus, note: a?.note ?? "", checkedIn: s.checkins.some((c) => c.candidateId === p.id) };
                  })}
                />
              ) : (
                <div className="stack" style={{ gap: 10 }}>
                  {s.studentNotes ? <p style={{ whiteSpace: "pre-line", margin: 0 }}>{s.studentNotes}</p> : <p className="muted" style={{ margin: 0 }}>El profesor aún no deja notas.</p>}
                  {s.materials.length > 0 && <div className="dl-list">{s.materials.map((m) => <DownloadButton key={m.path} bucket="content" path={m.path} name={m.name} size={m.size} />)}</div>}
                  <small className="muted">Check-in: {s.checkins.length ? s.checkins.map((c) => group.find((p) => p.id === c.candidateId)?.full_name ?? "—").join(", ") : "nadie aún"}.</small>
                </div>
              )}
            </details>
          );
        })}
      </div>
    </div>
  );
}
