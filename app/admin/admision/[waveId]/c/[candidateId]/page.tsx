import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { DIMENSIONS } from "@/lib/ai/rubric";
import { ADMISSION_LABEL, type AdmissionStatus } from "@/lib/domain/types";
import { Badge, admissionTone, fmtDate } from "@/components/ui";
import { TEMPLATE_LABEL, type EmailTemplate } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

type DimScore = { score: number; justification: string; evidence: string };

export default async function CandidateDetail({ params }: { params: Promise<{ waveId: string; candidateId: string }> }) {
  const { waveId, candidateId } = await params;
  const viewer = await requireStaffPage(`/admin/admision/${waveId}/c/${candidateId}`);
  const db = await supabaseUser();
  const { data: c } = await db.from("candidates").select("id, wave_id, full_name, corporate_email, client_name, role_title, specialty, status").eq("id", candidateId).eq("wave_id", waveId).single();
  if (!c) notFound();
  const [{ data: app }, { data: events }, { data: emails }, { data: commitments }] = await Promise.all([
    db.from("applications").select("id, answers, questions_snapshot, submitted_at").eq("candidate_id", c.id).maybeSingle(),
    db.from("admission_events").select("from_status, to_status, at, actor_label").eq("candidate_id", c.id).order("at"),
    db.from("email_messages").select("template, status, subject, created_at, error").eq("candidate_id", c.id).order("created_at", { ascending: false }),
    db.from("commitment_acceptances").select("document_version, status, accepted_at, accepted_by").eq("candidate_id", c.id).order("presented_at"),
  ]);
  const isAdmin = viewer.role === "admin";
  const [{ data: evals }, { data: decisions }] = isAdmin && app
    ? await Promise.all([
        db.from("ai_evaluations").select("*").eq("application_id", app.id).order("created_at", { ascending: false }),
        db.from("decisions").select("outcome, note, decided_at, agrees_with_ai").eq("candidate_id", c.id).order("decided_at", { ascending: false }),
      ])
    : [{ data: null }, { data: null }];
  const ev = evals?.[0];
  const questions = (app?.questions_snapshot ?? []) as { id: string; prompt: string }[];
  const answers = (app?.answers ?? {}) as Record<string, string>;

  return (
    <div className="stack">
      <div className="eyebrow"><Link href={`/admin/admision/${waveId}`}>← Candidatos</Link></div>
      <div className="spread">
        <div>
          <h1 style={{ margin: 0 }}>{c.full_name}</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>{c.corporate_email} · {c.client_name ?? "—"} · {c.role_title ?? "—"}{c.specialty ? ` · ${c.specialty}` : ""}</p>
        </div>
        <Badge tone={admissionTone(c.status)}>{ADMISSION_LABEL[c.status as AdmissionStatus]}</Badge>
      </div>

      {isAdmin && ev && (
        <div className="card">
          <div className="spread">
            <h3 style={{ margin: 0 }}>Propuesta de la IA <small className="muted">· no es una decisión</small></h3>
            <div className="row"><span className="kpi accent">{Number(ev.weighted_total).toFixed(1)}</span><span className="badge brand">Nivel {ev.level}</span></div>
          </div>
          <p>{ev.summary}</p>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Dimensión</th><th>Peso</th><th>Puntaje</th><th>Justificación y evidencia</th></tr></thead>
              <tbody>
                {DIMENSIONS.map((d) => {
                  const s = (ev.scores as Record<string, DimScore>)[d.key];
                  return (
                    <tr key={d.key}>
                      <td>{d.label}</td><td>{Math.round(d.weight * 100)}%</td><td><strong>{s?.score}</strong>/5</td>
                      <td>{s?.justification}{s?.evidence && <><br /><small className="muted">“{s.evidence}”</small></>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {ev.risks?.length > 0 && <><h4>Riesgos / brechas</h4><ul>{ev.risks.map((r: string) => <li key={r}>{r}</li>)}</ul></>}
          <p className="muted"><small>{ev.model} · rúbrica {ev.rubric_version} · {fmtDate(ev.created_at)}. Uso interno: no compartir puntajes con el profesional, el cliente ni Delivery.</small></p>
        </div>
      )}

      <div className="card">
        <h3>Postulación {app?.submitted_at ? <small className="muted">· enviada {fmtDate(app.submitted_at)}</small> : <small className="muted">· no enviada</small>}</h3>
        {questions.length === 0 && <p className="muted">Aún no inicia el formulario.</p>}
        {questions.map((q, i) => (
          <div key={q.id} style={{ marginBottom: 14 }}>
            <strong>{i + 1}. {q.prompt}</strong>
            <p style={{ whiteSpace: "pre-wrap", margin: "4px 0 0" }}>{answers[q.id] || <span className="muted">(sin respuesta)</span>}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3>Historial</h3>
          <ul>
            {(events ?? []).map((e, i) => <li key={i}><small>{fmtDate(e.at)} · {e.from_status ? `${ADMISSION_LABEL[e.from_status as AdmissionStatus]} → ` : ""}{ADMISSION_LABEL[e.to_status as AdmissionStatus]}</small></li>)}
          </ul>
          {isAdmin && (decisions ?? []).length > 0 && (
            <>
              <h4>Decisiones</h4>
              <ul>{decisions!.map((d, i) => <li key={i}><small>{fmtDate(d.decided_at)} · {ADMISSION_LABEL[d.outcome as AdmissionStatus]}{d.agrees_with_ai === false ? " (difiere de la IA)" : ""}{d.note ? ` · ${d.note}` : ""}</small></li>)}</ul>
            </>
          )}
          {(commitments ?? []).length > 0 && (
            <>
              <h4>Compromiso</h4>
              <ul>{commitments!.map((m, i) => <li key={i}><small>{m.document_version} · {m.status}{m.accepted_at ? ` · ${fmtDate(m.accepted_at)} por ${m.accepted_by}` : ""}</small></li>)}</ul>
            </>
          )}
        </div>
        <div className="card">
          <h3>Correos</h3>
          {(emails ?? []).length === 0 && <p className="muted">Sin correos.</p>}
          <ul>{(emails ?? []).map((m, i) => <li key={i}><small>{fmtDate(m.created_at)} · {TEMPLATE_LABEL[m.template as EmailTemplate]} · {m.status}{m.error ? ` (${m.error})` : ""}</small></li>)}</ul>
        </div>
      </div>
    </div>
  );
}
