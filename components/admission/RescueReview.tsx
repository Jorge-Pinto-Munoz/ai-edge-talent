"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewRescue, type ActionResult } from "@/lib/admission/admin-actions";
import { closeNotSelected, confirmSelection } from "@/lib/admission/decision-actions";
import { RESCUE_CRITERIA, RESCUE_QUESTIONS, RESCUE_SCALE } from "@/lib/admission/rescue";
import { SignedLink } from "@/components/journey/SignedLink";
import { Callout, fmtDate } from "@/components/ui";

export interface RescueRow {
  video_path: string | null;
  video_url: string | null;
  candidate_note: string | null;
  submitted_at: string;
  commitment: number | null;
  interest: number | null;
  ai_affinity: number | null;
  review_note: string | null;
  reviewed_at: string | null;
}

/** Revisión del video de rescate y decisión del Product Lead. */
export function RescueReview({ waveId, candidateId, row, status }: { waveId: string; candidateId: string; row: RescueRow | null; status: string }) {
  const [v, setV] = useState({ commitment: row?.commitment ?? 3, interest: row?.interest ?? 3, ai_affinity: row?.ai_affinity ?? 3, note: row?.review_note ?? "" });
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<ActionResult>) => start(async () => { const r = await fn(); setMsg(r); if (r.ok) router.refresh(); });

  return (
    <div className="card">
      <div className="spread">
        <h2 className="h-card" style={{ margin: 0 }}>Video de rescate</h2>
        {row ? <span className="badge brand">Enviado {fmtDate(row.submitted_at)}</span> : <span className="badge warn">Pendiente</span>}
      </div>
      <details style={{ margin: "10px 0" }}>
        <summary className="muted" style={{ cursor: "pointer" }}>Preguntas que debía responder</summary>
        <ol>{RESCUE_QUESTIONS.map((q) => <li key={q.key}>{q.question}<br /><small className="muted">{q.why}</small></li>)}</ol>
      </details>
      {!row && <p className="muted" style={{ margin: 0 }}>La persona aún no envía su video. Lo ve y lo sube desde su enlace personal de postulación.</p>}
      {row && (
        <>
          <p style={{ margin: "6px 0" }}>
            {row.video_path && <SignedLink bucket="submissions" path={row.video_path} view>Ver video subido</SignedLink>}
            {row.video_url && <a className="link-context" href={row.video_url} target="_blank" rel="noopener noreferrer">Abrir enlace del video</a>}
          </p>
          {row.candidate_note && <p className="muted">“{row.candidate_note}”</p>}
          <div className="grid grid-3" style={{ marginTop: 12 }}>
            {RESCUE_CRITERIA.map((c) => (
              <div key={c.key} className="field" style={{ marginBottom: 0 }}>
                <label htmlFor={`rr-${c.key}`}>{c.label}</label>
                <select id={`rr-${c.key}`} value={v[c.key]} onChange={(e) => setV({ ...v, [c.key]: Number(e.target.value) })}>
                  {RESCUE_SCALE.map((l, i) => <option key={l} value={i + 1}>{l}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="rr-note">Nota de la reevaluación</label>
            <textarea id="rr-note" rows={3} value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} placeholder="Qué observaste en el video que el formulario no mostraba" />
          </div>
          <div className="row">
            <button className="btn small" disabled={pending} onClick={() => run(() => reviewRescue(waveId, candidateId, v))}>{row.reviewed_at ? "Actualizar revisión" : "Guardar revisión"}</button>
          </div>
          {row.reviewed_at && <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}><small>Revisado {fmtDate(row.reviewed_at)}. La decisión queda registrada con tu nombre en el historial.</small></p>}
        </>
      )}
      {status === "RESCUE_REQUIRED" && (
        <div className="rescue-decide">
          <strong>Decisión tras el rescate</strong>
          <p className="muted" style={{ margin: "4px 0 10px" }}>
            {row ? "Puedes decidir haya o no guardado la revisión." : "Si el video llegó por otro medio (correo, Teams) o venció el plazo, igual puedes decidir aquí."}
            {" "}Al pasar a la siguiente fase recibe el correo de bienvenida a AI First Mindset, con copia a su Delivery.
          </p>
          <div className="row">
            <button className="btn small adm-go" disabled={pending} onClick={() => confirm("¿Pasar a esta persona a la siguiente fase? Recibirá el correo de bienvenida con copia a su Delivery.") && run(() => confirmSelection(candidateId, `Rescate: ${v.note || (row ? "video revisado" : "video recibido por otro medio")}`))}>Pasar a la siguiente fase</button>
            <button className="btn ghost small" disabled={pending} onClick={() => confirm("¿Registrar que no continúa en esta Wave?") && run(() => closeNotSelected(candidateId, `Rescate: ${v.note || "sin video o no suficiente"}`))}>No continúa</button>
          </div>
        </div>
      )}
      {msg && <div style={{ marginTop: 10 }}><Callout tone={msg.ok ? "ok" : "bad"} title={msg.message} /></div>}
    </div>
  );
}
