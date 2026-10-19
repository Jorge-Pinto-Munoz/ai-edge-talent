import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseService, supabaseUser } from "@/lib/supabase/server";
import { canViewCandidate } from "@/lib/admission/access";
import { prettyName } from "@/lib/text/org";
import { DIMENSIONS, LEVEL_LABEL, LEVEL_MEANING, PL_LABEL, type Level, type PlRecommendation } from "@/lib/ai/rubric";
import { ADMISSION_LABEL, type AdmissionStatus } from "@/lib/domain/types";
import { ASSESSMENT_STATE_LABEL, answeredCount, assessmentState } from "@/lib/admission/assessment";
import { fmtDate } from "@/components/ui";
import { PhaseStrip } from "@/components/admission/PhaseBadge";
import { TEMPLATE_LABEL, type EmailTemplate } from "@/lib/email/templates";
import { TEMPLATE_NAME, type IdentityTemplate } from "@/lib/email/identity";
import { RescueReview, type RescueRow } from "@/components/admission/RescueReview";
import { shownEmail } from "@/lib/talent/rules";

export const dynamic = "force-dynamic";

type DimScore = { score: number; justification: string; evidence: string };

export default async function CandidateDetail({ params }: { params: Promise<{ waveId: string; candidateId: string }> }) {
  const { waveId, candidateId } = await params;
  const viewer = await requireStaffPage(`/admin/admision/${waveId}/c/${candidateId}`);
  const isAdmin = viewer.role === "admin";
  // Delivery: solo sus candidatos asignados, en modo lectura (se verifica la asignación antes de leer con la llave del servidor).
  if (!isAdmin && !(await canViewCandidate(viewer, candidateId))) notFound();
  const db = isAdmin ? await supabaseUser() : supabaseService();
  const { data: c } = await db.from("candidates").select("id, wave_id, full_name, corporate_email, client_name, role_title, specialty, status").eq("id", candidateId).eq("wave_id", waveId).single();
  if (!c) notFound();
  const [{ data: app }, { data: events }, { data: emails }, { data: commitments }] = await Promise.all([
    db.from("applications").select("id, answers, questions_snapshot, submitted_at, updated_at").eq("candidate_id", c.id).maybeSingle(),
    db.from("admission_events").select("from_status, to_status, at, actor_label").eq("candidate_id", c.id).order("at"),
    db.from("email_messages").select("template, status, subject, created_at, error").eq("candidate_id", c.id).order("created_at", { ascending: false }),
    db.from("commitment_acceptances").select("document_version, status, accepted_at, accepted_by").eq("candidate_id", c.id).order("presented_at"),
  ]);
  const [{ data: evals }, { data: decisions }] = app
    ? await Promise.all([
        db.from("ai_evaluations").select("*").eq("application_id", app.id).order("created_at", { ascending: false }),
        db.from("decisions").select("outcome, note, decided_at, agrees_with_ai").eq("candidate_id", c.id).order("decided_at", { ascending: false }),
      ])
    : [{ data: null }, { data: null }];
  const ev = evals?.[0];
  const showRescue = c.status === "RESCUE_REQUIRED" || ev?.level === "D";
  const { data: rescue } = showRescue ? await db.from("rescue_videos").select("*").eq("candidate_id", c.id).maybeSingle() : { data: null };
  const { data: invitation } = await supabaseService().from("rescue_invitations").select("explanation, expires_at").eq("candidate_id", c.id).maybeSingle();
  const rescueVideoUrl = rescue?.video_path ? (await supabaseService().storage.from("submissions").createSignedUrl(rescue.video_path, 900)).data?.signedUrl ?? null : null;
  const questions = (app?.questions_snapshot ?? []) as { id: string; prompt: string }[];
  const answers = (app?.answers ?? {}) as Record<string, string>;
  const aState = assessmentState(c.status, app?.submitted_at);
  const answered = answeredCount(questions.map((q) => ({ ...q, required: false })), answers);

  return (
    <div className="stack">
      <div className="eyebrow"><Link href={`/admin/admision/${waveId}`}>← Candidatos</Link></div>
      <div className="spread">
        <div>
          <h1 style={{ margin: 0 }}>{c.full_name}</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>{shownEmail(c.corporate_email)} · {c.client_name ? prettyName(c.client_name) : "—"} · {c.role_title ? prettyName(c.role_title) : "—"}{c.specialty ? ` · ${c.specialty}` : ""}</p>
        </div>
        <div className="row">
          {isAdmin && <a className="btn ghost small" href={`/admin/vista/candidato?id=${c.id}`}>Ver su postulación</a>}
          {isAdmin && ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"].includes(c.status) && <a className="btn ghost small" href={`/admin/vista/profesional?id=${c.id}`}>Ver su journey</a>}
          {isAdmin && <a className="btn ghost small" href={`/admin/admision/${waveId}/c/${c.id}/exportar`} download>Descargar Excel</a>}
        </div>
      </div>
      <section className="card" aria-label="Estado por fase"><PhaseStrip status={c.status} /></section>

      {ev && (
        <div className="card">
          <div className="spread">
            <h2 className="h-card" style={{ margin: 0 }}>Propuesta de la IA <small className="muted">· no es una decisión</small></h2>
            <div className="row"><span className="kpi accent">{Number(ev.weighted_total).toFixed(1)}<small className="muted">/100</small></span><span className="badge brand">{LEVEL_LABEL[ev.level as Level] ?? `Nivel ${ev.level}`}</span></div>
          </div>
          <p className="muted" style={{ marginTop: 6 }}>{LEVEL_MEANING[ev.level as Level]}</p>
          {ev.pl_recommendation && (
            <div className="callout" style={{ margin: "12px 0" }}>
              <strong>Recomendación al Product Lead: {PL_LABEL[ev.pl_recommendation as PlRecommendation]}</strong>
              {ev.level === "D" && "Este estado no constituye no-selección definitiva hasta resolver el rescate o una decisión explícita del Product Lead."}
            </div>
          )}
          {!ev.pl_recommendation && ev.recommendation === "HUMAN_REVIEW" && (
            <div className="callout warn" style={{ margin: "12px 0" }}><strong>Sin evidencia evaluable</strong>La postulación está vacía, es ininteligible o intenta instruir al evaluador. Requiere revisión humana.</div>
          )}
          <p>{ev.summary}</p>
          <div className="table-wrap" tabIndex={0}>
            <table>
              <thead><tr><th>Dimensión</th><th>Peso</th><th>Puntaje</th><th>Evidencia observada y justificación</th></tr></thead>
              <tbody>
                {DIMENSIONS.map((d) => {
                  const s = (ev.scores as Record<string, DimScore>)[d.key];
                  return (
                    <tr key={d.key}>
                      <td>{d.label}</td><td>{Math.round(d.weight * 100)}%</td><td><strong>{s?.score}</strong>/5</td>
                      <td>{s?.evidence ? <em>“{s.evidence}”</em> : <small className="muted">Sin evidencia en las respuestas.</small>}<br />{s?.justification}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="grid grid-2" style={{ marginTop: 12 }}>
            {ev.strengths?.length > 0 && <div><h3 className="h-sub">Fortalezas</h3><ul>{ev.strengths.map((r: string) => <li key={r}>{r}</li>)}</ul></div>}
            {ev.risks?.length > 0 && <div><h3 className="h-sub">Riesgos o brechas</h3><ul>{ev.risks.map((r: string) => <li key={r}>{r}</li>)}</ul></div>}
          </div>
          {ev.insufficient_fields?.length > 0 && <p className="muted"><strong>Campos insuficientes:</strong> {ev.insufficient_fields.join(" · ")}. Solo se bajaron las dimensiones que no se pueden sostener.</p>}
          <p className="muted"><small>{ev.model} · rúbrica {ev.rubric_version} · {fmtDate(ev.created_at)}. Evidencia interna: no compartir puntajes ni rankings con el profesional ni el cliente. <Link href="/admin/evaluacion">Cómo evaluamos</Link></small></p>
        </div>
      )}

      {invitation?.explanation && (
        <section className="rescue-focus" aria-label="Foco del rescate">
          <h3>Foco del rescate: lo que le pedimos mostrar</h3>
          {(invitation.explanation as string).split("\n").filter(Boolean).map((l: string, i: number) => (l.startsWith("•") ? <p key={i} className="rf-item">{l.slice(1).trim()}</p> : <p key={i}>{l}</p>))}
        </section>
      )}
      {showRescue && (isAdmin ? <RescueReview waveId={waveId} candidateId={c.id} row={rescue as RescueRow | null} status={c.status} /> : <RescueReadOnly row={rescue as RescueRow | null} videoUrl={rescueVideoUrl} />)}

      <div className="card">
        <h2 className="h-card">Postulación <span className={`ds-status s-${aState === "COMPLETED" ? "done" : aState === "IN_PROGRESS" ? "progress" : "pending"}`}>Assessment {ASSESSMENT_STATE_LABEL[aState].toLowerCase()}</span></h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {app?.submitted_at
            ? `Enviado ${fmtDate(app.submitted_at)} · ${answered} de ${questions.length} respondidas.`
            : questions.length
              ? `Borrador: ${answered} de ${questions.length} respondidas · último guardado ${fmtDate(app!.updated_at)}. Un borrador no se evalúa ni avanza de etapa.`
              : "Aún no inicia el formulario."}
        </p>
        {questions.map((q, i) => (
          <div key={q.id} style={{ marginBottom: 14 }}>
            <strong>{i + 1}. {q.prompt}</strong>
            <p style={{ whiteSpace: "pre-wrap", margin: "4px 0 0" }}>{answers[q.id] || <span className="muted">(sin respuesta)</span>}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2 className="h-card">Historial</h2>
          <ul>
            {(events ?? []).map((e, i) => <li key={i}><small>{fmtDate(e.at)} · {e.from_status ? `${ADMISSION_LABEL[e.from_status as AdmissionStatus]} → ` : ""}{ADMISSION_LABEL[e.to_status as AdmissionStatus]}</small></li>)}
          </ul>
          {(decisions ?? []).length > 0 && (
            <>
              <h3 className="h-sub">Decisiones</h3>
              <ul>{decisions!.map((d, i) => <li key={i}><small>{fmtDate(d.decided_at)} · {ADMISSION_LABEL[d.outcome as AdmissionStatus]}{d.agrees_with_ai === false ? " (difiere de la IA)" : ""}{d.note ? ` · ${d.note}` : ""}</small></li>)}</ul>
            </>
          )}
          {(commitments ?? []).length > 0 && (
            <>
              <h3 className="h-sub">Compromiso</h3>
              <ul>{commitments!.map((m, i) => <li key={i}><small>{m.document_version} · {m.status}{m.accepted_at ? ` · ${fmtDate(m.accepted_at)} por ${m.accepted_by}` : ""}</small></li>)}</ul>
            </>
          )}
        </div>
        <div className="card">
          <h2 className="h-card">Correos</h2>
          {(emails ?? []).length === 0 && <p className="muted">Sin correos.</p>}
          <ul>{(emails ?? []).map((m, i) => <li key={i}><small>{fmtDate(m.created_at)} · {TEMPLATE_NAME[m.template as IdentityTemplate] ?? TEMPLATE_LABEL[m.template as EmailTemplate] ?? m.template} · {m.status === "sent" ? "enviado" : m.status === "failed" ? "falló" : "en cola"}{m.error ? ` (${m.error})` : ""}</small></li>)}</ul>
        </div>
      </div>
    </div>
  );
}

/** Video de rescate en modo lectura (Delivery): ver el video, la nota del profesional y la revisión del equipo. */
function RescueReadOnly({ row, videoUrl }: { row: RescueRow | null; videoUrl: string | null }) {
  return (
    <div className="card">
      <div className="spread">
        <h2 className="h-card" style={{ margin: 0 }}>Video de rescate</h2>
        {row ? <span className="badge brand">Enviado {fmtDate(row.submitted_at)}</span> : <span className="badge warn">Pendiente</span>}
      </div>
      {!row && <p className="muted">Aún no envía su video.</p>}
      {row && (
        <div className="stack" style={{ marginTop: 10 }}>
          {videoUrl && <video src={videoUrl} controls playsInline preload="metadata" style={{ width: "100%", maxHeight: 420, borderRadius: 12, background: "#080b10" }} />}
          {row.video_url && <a className="link-context" href={row.video_url} target="_blank" rel="noopener noreferrer">Abrir enlace del video ↗</a>}
          {row.candidate_note && <p className="muted">“{row.candidate_note}”</p>}
          {row.reviewed_at ? (
            <p style={{ margin: 0 }}><small>Revisado {fmtDate(row.reviewed_at)} · Compromiso {row.commitment ?? "—"}/5 · Interés {row.interest ?? "—"}/5 · Afinidad con IA {row.ai_affinity ?? "—"}/5{row.review_note ? ` · ${row.review_note}` : ""}</small></p>
          ) : <p className="muted" style={{ margin: 0 }}><small>Pendiente de revisión por el equipo.</small></p>}
        </div>
      )}
    </div>
  );
}
