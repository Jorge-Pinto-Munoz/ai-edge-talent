import "server-only";
import { supabaseService } from "@/lib/supabase/server";
import { overallProgress, progressLabel, type AiCertProgress } from "@/lib/aicert/progress";
import { FOCUS, RE_SESSIONS, attendanceMatch, MATCH_LABEL, type Focus } from "@/lib/teacher/sessions-rules";
import { fmtDate, fmtYmd } from "@/components/ui";

/**
 * Seguimiento de Role Enablement en la ficha de una persona: participación en las 4 sesiones, check-in, avance
 * AI CERT y lo que anotó el AI Coach (estrellas, concentración y comentario; esto último solo lo ve el admin).
 */
export async function ReProgress({ waveId, candidateId, isAdmin }: { waveId: string; candidateId: string; isAdmin: boolean }) {
  const svc = supabaseService();
  const [{ data: sessions }, { data: att }, { data: chk }, { data: prog }] = await Promise.all([
    svc.from("re_sessions").select("n, held_on, starts_at, title").eq("wave_id", waveId),
    svc.from("re_session_attendance").select("n, attended, focus, rating, note").eq("wave_id", waveId).eq("candidate_id", candidateId),
    svc.from("re_session_checkins").select("n, created_at").eq("wave_id", waveId).eq("candidate_id", candidateId),
    svc.from("aicert_progress").select("course, tramo, percent, updated_at, self_reported_at").eq("candidate_id", candidateId).maybeSingle(),
  ]);
  if (!(sessions ?? []).length && !(att ?? []).length && !(chk ?? []).length && !prog) return null;
  const recorded = (att ?? []).length;
  const attended = (att ?? []).filter((a) => a.attended).length;
  const pct = recorded ? Math.round((attended / recorded) * 100) : null;
  const p = prog as (AiCertProgress & { updated_at: string; self_reported_at: string | null }) | null;
  return (
    <section className="card re-progress" aria-labelledby="re-prog-t">
      <h2 id="re-prog-t" className="h-card" style={{ marginTop: 0 }}>Role Enablement · seguimiento</h2>
      <div className="rp-kpis">
        <div><strong>{recorded ? `${attended} de ${recorded}` : "—"}</strong><small>Sesiones asistidas{pct !== null ? ` · ${pct}%` : ""}</small></div>
        <div><strong>{(chk ?? []).length} de 4</strong><small>Check-in hechos</small></div>
        <div><strong>{p ? `${overallProgress(p)}%` : "—"}</strong><small>{p ? `AI CERT · ${progressLabel(p)}${p.self_reported_at ? ` · reportado ${fmtDate(p.self_reported_at)}` : ""}` : "AI CERT sin reporte"}</small></div>
      </div>
      <div className="table-wrap" tabIndex={0}>
        <table className="rtable">
          <thead><tr><th>Sesión</th><th>Asistencia</th>{isAdmin && <><th>Evaluación</th><th>Comentario del AI Coach</th></>}</tr></thead>
          <tbody>
            {RE_SESSIONS.map((n) => {
              const s = (sessions ?? []).find((x) => x.n === n);
              const a = (att ?? []).find((x) => x.n === n);
              const m = MATCH_LABEL[attendanceMatch(a ? a.attended : null, (chk ?? []).some((x) => x.n === n))];
              const focus = a ? FOCUS.find((f) => f.id === (a.focus as Focus)) : null;
              return (
                <tr key={n}>
                  <td className="rt-title"><strong>Semana {n}{s?.title ? ` · ${s.title}` : ""}</strong><small className="muted">{s?.held_on ? fmtYmd(s.held_on) : "Por programar"}{s?.starts_at ? ` · ${String(s.starts_at).slice(0, 5)}` : ""}</small></td>
                  <td data-label="Asistencia"><span className={`badge ${m.tone === "muted" ? "" : m.tone}`}>{m.label}</span></td>
                  {isAdmin && <td data-label="Evaluación">{a?.rating ? <span className="res-stars" aria-label={`${a.rating} de 3 estrellas`}>{"★".repeat(a.rating)}<span className="muted">{"★".repeat(3 - a.rating)}</span></span> : <span className="muted">—</span>}{focus && focus.id !== "OK" ? <><br /><small className={focus.id === "LOW" ? "warn-text" : ""}>{focus.label}</small></> : null}</td>}
                  {isAdmin && <td data-label="Comentario">{a?.note ? <small>{a.note}</small> : <span className="muted">—</span>}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!isAdmin && <p className="muted" style={{ margin: 0 }}><small>La evaluación y los comentarios del AI Coach solo los ve Administración.</small></p>}
    </section>
  );
}
