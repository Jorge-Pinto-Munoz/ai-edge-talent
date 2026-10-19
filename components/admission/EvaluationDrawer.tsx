"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { closeNotSelected, confirmSelection, extendRescue, getReviewData, offerRescue, previewDecisionEmail, type DecisionResult, type ReviewData } from "@/lib/admission/decision-actions";
import { reviewRescue } from "@/lib/admission/admin-actions";
import { RESCUE_CRITERIA, RESCUE_QUESTIONS, RESCUE_SCALE, RESCUE_STATE_LABEL, RESCUE_WINDOW_HOURS } from "@/lib/admission/rescue";
import { ADMISSION_LABEL, type AdmissionStatus } from "@/lib/domain/types";
import { Callout } from "@/components/ui";

type Step = "view" | "select" | "reject";
type Preview = { to: string; subject: string; text: string };

const fmt = (iso: string) => new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
const DECIDABLE = ["ASSESSMENT_EVALUATED", "HUMAN_REVIEW", "RESCUE_REQUIRED"];

/**
 * Panel lateral de evaluación: todo lo que existe del candidato (puntaje, rúbrica, fortalezas, brechas,
 * recomendación, rescate e historial) y la decisión humana con confirmación. La recomendación nunca decide.
 */
export function EvaluationDrawer({ candidateId, waveId, onClose, initialStep = "view" }: { candidateId: string; waveId: string; onClose: () => void; initialStep?: "view" | "select" }) {
  const [data, setData] = useState<ReviewData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(initialStep);
  const [result, setResult] = useState<DecisionResult | null>(null);
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const load = useCallback(async () => {
    try {
      setData(await getReviewData(candidateId));
      setLoadError(null);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "No se pudo cargar la evaluación.");
    }
  }, [candidateId]);

  useEffect(() => {
    opener.current = document.activeElement;
    void load();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [load]);
  useEffect(() => { panel.current?.focus(); }, [step, data === null]);

  const done = async (r: DecisionResult) => {
    setResult(r);
    if (r.ok) {
      setStep("view");
      await load();
      router.refresh();
    }
  };

  const c = data?.candidate;
  const canDecide = c ? DECIDABLE.includes(c.status) : false;

  return (
    <div className="drawer-wrap" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="drawer" role="dialog" aria-modal="true" aria-labelledby="ev-title" ref={panel} tabIndex={-1}>
        <header className="drawer-head">
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>{step === "select" ? "Confirmar selección" : step === "reject" ? "No seleccionar" : "Evaluación"}</p>
            <h2 id="ev-title">{c?.name ?? "Cargando…"}</h2>
            {c && <p className="muted">{c.email} · {c.delivery ? `Delivery: ${c.delivery}` : "Sin Delivery"} · {c.wave}</p>}
          </div>
          <button type="button" className="drawer-x" onClick={onClose} aria-label="Cerrar panel">×</button>
        </header>

        <div className="drawer-body">
          {loadError && <Callout tone="bad" title={loadError} />}
          {!data && !loadError && <p className="muted" role="status">Cargando evaluación…</p>}
          {result && <Callout tone={result.ok ? (result.email === "failed" ? "warn" : "ok") : "bad"} title={result.message} />}

          {data && step === "view" && <Overview data={data} onChanged={load} waveId={waveId} setResult={setResult} />}
          {data && step === "select" && <SelectConfirm data={data} onCancel={() => setStep("view")} onDone={done} />}
          {data && step === "reject" && <RejectPanel data={data} onCancel={() => setStep("view")} onDone={done} />}
        </div>

        {data && step === "view" && (
          <footer className="drawer-foot">
            {canDecide ? (
              <>
                <span className="muted">La recomendación orienta; la decisión es tuya y queda registrada a tu nombre.</span>
                <div className="row">
                  <button type="button" className="btn ghost" onClick={() => { setResult(null); setStep("reject"); }}>No seleccionar</button>
                  <button type="button" className="btn" onClick={() => { setResult(null); setStep("select"); }}>Seleccionar</button>
                </div>
              </>
            ) : (
              <>
                <span className="muted">Estado actual: {ADMISSION_LABEL[c!.status as AdmissionStatus] ?? c!.status}. {c!.status === "APPLICATION_SUBMITTED" ? "Primero evalúa el Assessment." : "No hay una decisión pendiente."}</span>
                <Link className="btn ghost" href={`/admin/admision/${waveId}/c/${c!.id}`}>Ver ficha completa</Link>
              </>
            )}
          </footer>
        )}
      </div>
    </div>
  );
}

/* ───────── Vista: puntaje, rúbrica, rescate e historial ───────── */

function Overview({ data, waveId, onChanged, setResult }: { data: ReviewData; waveId: string; onChanged: () => Promise<void>; setResult: (r: DecisionResult) => void }) {
  const ev = data.evaluation;
  return (
    <div className="stack">
      {ev ? (
        <section className="ev-score" aria-label="Resultado del Assessment">
          <div className="ev-total"><strong>{Math.round(ev.total)}</strong><span>/100</span></div>
          <div>
            <p style={{ margin: 0 }}><strong>Nivel {ev.levelLabel}</strong></p>
            {ev.recommendation && <p style={{ margin: "4px 0 0" }}>Recomendación: <strong>{ev.recommendation}</strong> <small className="muted">(orienta, no decide)</small></p>}
            <p className="muted" style={{ margin: "4px 0 0" }}><small>Evaluado el {fmt(ev.at)}</small></p>
          </div>
        </section>
      ) : (
        <Callout tone="warn" title="Aún no hay resultado del Assessment">Evalúa la postulación antes de decidir.</Callout>
      )}

      {data.rescue && <RescueBlock data={data} waveId={waveId} onChanged={onChanged} setResult={setResult} />}

      {ev && (
        <>
          {ev.summary && <p style={{ margin: 0 }}>{ev.summary}</p>}
          <section aria-labelledby="ev-rub">
            <h3 id="ev-rub" className="h-card">Rúbrica por dimensión</h3>
            <ul className="ev-dims">
              {ev.dimensions.map((d) => (
                <li key={d.key}>
                  <div className="spread">
                    <span>{d.label} <small className="muted">· {Math.round(d.weight * 100)}%</small></span>
                    <strong>{d.score ?? "—"}<small className="muted">/5</small></strong>
                  </div>
                  <span className="ev-bar" aria-hidden><span style={{ width: `${((d.score ?? 0) / 5) * 100}%` }} /></span>
                  {d.justification && <small className="muted">{d.justification}</small>}
                </li>
              ))}
            </ul>
          </section>
          <div className="grid grid-2">
            <section>
              <h3 className="h-card">Fortalezas</h3>
              {ev.strengths.length ? <ul>{ev.strengths.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="muted">Sin fortalezas registradas.</p>}
            </section>
            <section>
              <h3 className="h-card">Brechas</h3>
              {ev.risks.length ? <ul>{ev.risks.map((x) => <li key={x}>{x}</li>)}</ul> : <p className="muted">Sin brechas registradas.</p>}
              {ev.insufficient.length > 0 && <p className="muted"><small>Información insuficiente en: {ev.insufficient.join(", ")}</small></p>}
            </section>
          </div>
        </>
      )}

      <section aria-labelledby="ev-hist">
        <h3 id="ev-hist" className="h-card">Historial</h3>
        {data.history.length ? (
          <ol className="ev-hist">
            {data.history.map((h, i) => (
              <li key={i}>
                <small className="muted">{fmt(h.at)}{h.actor_label ? ` · ${h.actor_label}` : ""}</small>
                <span>{h.from_status !== h.to_status ? `${ADMISSION_LABEL[h.from_status as AdmissionStatus] ?? h.from_status ?? "—"} → ${ADMISSION_LABEL[h.to_status as AdmissionStatus] ?? h.to_status}` : ""}{h.note ? `${h.from_status !== h.to_status ? " · " : ""}${h.note}` : ""}</span>
              </li>
            ))}
          </ol>
        ) : <p className="muted">Sin movimientos registrados.</p>}
      </section>
    </div>
  );
}

function RescueBlock({ data, waveId, onChanged, setResult }: { data: ReviewData; waveId: string; onChanged: () => Promise<void>; setResult: (r: DecisionResult) => void }) {
  const r = data.rescue!;
  const v = r.video;
  const [form, setForm] = useState({ commitment: v?.commitment ?? 3, interest: v?.interest ?? 3, ai_affinity: v?.ai_affinity ?? 3, note: v?.review_note ?? "" });
  const [pending, start] = useTransition();
  const open = data.candidate.status === "RESCUE_REQUIRED";
  return (
    <section className="ev-rescue" aria-labelledby="ev-resc">
      <div className="spread">
        <h3 id="ev-resc" className="h-card" style={{ margin: 0 }}>Video de rescate</h3>
        <span className="badge">{RESCUE_STATE_LABEL[r.state]}</span>
      </div>
      <p className="muted" style={{ margin: "6px 0" }}>
        <small>Ofrecido el {fmt(r.offered_at)}{r.expires_at ? ` · plazo hasta el ${fmt(r.expires_at)}` : " · sin plazo"}{r.extended_at ? " · plazo extendido" : ""}</small>
      </p>
      {r.explanation && <p style={{ margin: "6px 0" }}><small>Explicación enviada: “{r.explanation}”</small></p>}
      {!v && open && r.state === "expired" && (
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <span>No envió el video dentro del plazo.</span>
          <button type="button" className="btn small ghost" disabled={pending} onClick={() => start(async () => { const x = await extendRescue(data.candidate.id); setResult(x); await onChanged(); })}>Extender {RESCUE_WINDOW_HOURS} h (excepción)</button>
        </div>
      )}
      {!v && open && r.state !== "expired" && <p className="muted" style={{ margin: 0 }}>Aún no envía el video.</p>}
      {v && (
        <>
          {v.signedUrl && <video className="ev-video" src={v.signedUrl} controls playsInline preload="metadata" aria-label="Video de rescate" />}
          {v.video_url && <p><a className="link-context" href={v.video_url} target="_blank" rel="noopener noreferrer">Abrir enlace del video ↗</a></p>}
          <p className="muted" style={{ margin: "4px 0" }}><small>Enviado el {fmt(v.submitted_at)}</small></p>
          {v.candidate_note && <p className="muted">“{v.candidate_note}”</p>}
          <details>
            <summary className="muted">Preguntas que respondió</summary>
            <ol>{RESCUE_QUESTIONS.map((q) => <li key={q.key}>{q.question}</li>)}</ol>
          </details>
          {open && (
            <>
              <div className="grid grid-3" style={{ marginTop: 10 }}>
                {RESCUE_CRITERIA.map((k) => (
                  <div key={k.key} className="field" style={{ marginBottom: 0 }}>
                    <label htmlFor={`ev-${k.key}`}>{k.label}</label>
                    <select id={`ev-${k.key}`} value={form[k.key]} onChange={(e) => setForm({ ...form, [k.key]: Number(e.target.value) })}>
                      {RESCUE_SCALE.map((l, i) => <option key={l} value={i + 1}>{l}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="field" style={{ marginTop: 10 }}>
                <label htmlFor="ev-rnote">Notas de la revisión</label>
                <textarea id="ev-rnote" rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Qué observaste en el video que el formulario no mostraba" />
              </div>
              <button type="button" className="btn small ghost" disabled={pending} onClick={() => start(async () => { const x = await reviewRescue(waveId, data.candidate.id, form); setResult({ ok: x.ok, message: x.ok ? "Revisión guardada. El puntaje original del Assessment no cambia." : x.message }); await onChanged(); })}>
                {v.reviewed_at ? "Actualizar notas" : "Guardar revisión"}
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
}

/* ───────── Confirmación de selección ───────── */

function SelectConfirm({ data, onCancel, onDone }: { data: ReviewData; onCancel: () => void; onDone: (r: DecisionResult) => Promise<void> }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => { void previewDecisionEmail(data.candidate.id, "selected").then(setPreview); }, [data.candidate.id]);
  const opening = data.mindsetOpensAt;
  const future = opening && new Date(opening) > new Date();
  return (
    <div className="stack">
      <dl className="ev-facts">
        <div><dt>Profesional</dt><dd>{data.candidate.name}<br /><small className="muted">{data.candidate.email}</small></dd></div>
        <div><dt>Delivery</dt><dd>{data.candidate.delivery ?? "Sin asignar"}</dd></div>
        <div><dt>Wave</dt><dd>{data.candidate.wave}</dd></div>
        <div><dt>Nuevo estado</dt><dd>Seleccionado/a · debe confirmar su compromiso</dd></div>
        <div><dt>Acceso</dt><dd>Se habilita su cuenta: entra con su correo y un código de un solo uso (sin contraseñas).</dd></div>
        <div><dt>Próxima etapa</dt><dd>AI First Mindset</dd></div>
        <div><dt>Primer reto</dt><dd>{opening ? (future ? `Disponible el ${fmt(opening)}` : "Ya disponible (la etapa está abierta)") : "Aún sin fecha: el correo dirá que le avisaremos al abrir la etapa"}</dd></div>
      </dl>
      <section aria-labelledby="ev-mail">
        <h3 id="ev-mail" className="h-card">Correo que recibirá</h3>
        {preview ? (
          <div className="ev-mail">
            <p><small className="muted">Para:</small> {preview.to}<br /><small className="muted">Asunto:</small> <strong>{preview.subject}</strong></p>
            <pre>{preview.text}</pre>
          </div>
        ) : <p className="muted">Preparando vista previa…</p>}
      </section>
      <div className="field">
        <label htmlFor="ev-snote">Nota interna (opcional)</label>
        <input id="ev-snote" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motivo o contexto de la decisión" />
      </div>
      <div className="row drawer-actions">
        <button type="button" className="btn ghost" onClick={onCancel} disabled={pending}>Volver</button>
        <button type="button" className="btn" disabled={pending} onClick={() => start(async () => { await onDone(await confirmSelection(data.candidate.id, note)); })}>
          {pending ? "Registrando y enviando…" : "Confirmar selección y enviar notificación"}
        </button>
      </div>
    </div>
  );
}

/* ───────── No seleccionar: cierre definitivo u ofrecer rescate ───────── */

function RejectPanel({ data, onCancel, onDone }: { data: ReviewData; onCancel: () => void; onDone: (r: DecisionResult) => Promise<void> }) {
  const inRescue = data.candidate.status === "RESCUE_REQUIRED";
  const canRescue = !inRescue && data.eligibility.ok;
  const [mode, setMode] = useState<"close" | "rescue">("close");
  const [note, setNote] = useState("");
  const [explanation, setExplanation] = useState(data.suggestedExplanation);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    if (mode !== "rescue") return;
    const t = window.setTimeout(() => { void previewDecisionEmail(data.candidate.id, "rescue", explanation).then(setPreview); }, 350);
    return () => window.clearTimeout(t);
  }, [mode, explanation, data.candidate.id]);

  return (
    <div className="stack">
      <div className="ev-options" role="radiogroup" aria-label="Qué hacer">
        <label className={`ev-option${mode === "close" ? " on" : ""}`}>
          <input type="radio" name="ev-mode" checked={mode === "close"} onChange={() => setMode("close")} />
          <span><strong>Cierre definitivo</strong><br /><small className="muted">No continúa en esta Wave. No se envía correo automático.</small></span>
        </label>
        <label className={`ev-option${mode === "rescue" ? " on" : ""}${canRescue ? "" : " off"}`}>
          <input type="radio" name="ev-mode" checked={mode === "rescue"} disabled={!canRescue} onChange={() => setMode("rescue")} />
          <span><strong>Ofrecer rescate</strong><br /><small className="muted">{inRescue ? "Ya está en rescate: aquí solo se cierra." : canRescue ? `Video breve con plazo de ${RESCUE_WINDOW_HOURS} h desde que confirmes.` : data.eligibility.reason}</small></span>
        </label>
      </div>

      {mode === "rescue" && canRescue && (
        <>
          <div className="field">
            <label htmlFor="ev-expl">Explicación para la persona (puedes editarla)</label>
            <textarea id="ev-expl" rows={4} maxLength={1200} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
            <p className="hint">Se arma solo con la rúbrica de su Assessment. Revísala antes de enviar.</p>
          </div>
          <section aria-labelledby="ev-rmail">
            <h3 id="ev-rmail" className="h-card">Correo que recibirá</h3>
            {preview ? (
              <div className="ev-mail">
                <p><small className="muted">Para:</small> {preview.to}<br /><small className="muted">Asunto:</small> <strong>{preview.subject}</strong></p>
                <pre>{preview.text}</pre>
                <p className="hint">La fecha límite exacta se calcula al confirmar.</p>
              </div>
            ) : <p className="muted">Preparando vista previa…</p>}
          </section>
        </>
      )}

      <div className="field">
        <label htmlFor="ev-rnote2">Nota interna (opcional)</label>
        <input id="ev-rnote2" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motivo o contexto de la decisión" />
      </div>
      <div className="row drawer-actions">
        <button type="button" className="btn ghost" onClick={onCancel} disabled={pending}>Volver</button>
        {mode === "close" ? (
          <button type="button" className="btn adm-danger" disabled={pending} onClick={() => start(async () => { await onDone(await closeNotSelected(data.candidate.id, note)); })}>{pending ? "Registrando…" : "Confirmar cierre"}</button>
        ) : (
          <button type="button" className="btn" disabled={pending || !canRescue} onClick={() => start(async () => { await onDone(await offerRescue(data.candidate.id, explanation, note)); })}>{pending ? "Enviando…" : "Ofrecer rescate y enviar invitación"}</button>
        )}
      </div>
    </div>
  );
}
