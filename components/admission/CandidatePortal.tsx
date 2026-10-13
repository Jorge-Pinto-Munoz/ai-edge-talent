"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { acknowledgeAndStart, acceptCommitmentByToken, saveAnswers } from "@/lib/admission/candidate-actions";
import { getDocument } from "@/lib/content";
import { ASSESSMENT_DIMENSIONS } from "@/lib/data/journey";
import { CommitmentSummaryCard, LifecycleRail } from "@/components/journey";
import { BrandHero, Callout, DocumentView, fmtDay, fmtDeadline } from "@/components/ui";
import { RescueForm } from "./RescueForm";
import { ASSESSMENT_STATE_LABEL, answeredCount, firstPending, missingRequired } from "@/lib/admission/assessment";

export interface PortalData {
  token: string;
  candidate: { fullName: string; clientName: string | null; roleTitle: string | null; status: string; deliveryOwner: string | null };
  wave: {
    id: string;
    name: string;
    application_deadline: string | null;
    commitment_version: string | null;
    conditions_version: string | null;
    acknowledgement_version: string | null;
  };
  questions: { id: string; position: number; prompt: string; help: string | null; kind: string; options: string[] | null; required: boolean }[];
  answers: Record<string, string>;
  /** Último guardado del borrador en el servidor y fecha de envío definitivo. */
  savedAt: string | null;
  submittedAt: string | null;
  rescue: { at: string; reviewed: boolean } | null;
}

/** `inPortal`: la persona ya ingresó con su cuenta (no se le recuerda revisar el correo de credenciales). */
export function CandidatePortal({ data, inPortal = false, preview = false }: { data: PortalData; inPortal?: boolean; preview?: boolean }) {
  const s = data.candidate.status;
  const first = data.candidate.fullName.split(" ")[0];
  if (["NOMINATED", "INVITED", "IDENTIFIED"].includes(s)) return <BeforeApplying data={data} first={first} />;
  if (s === "APPLICATION_STARTED") return <ApplicationForm data={data} preview={preview} />;
  if (["APPLICATION_SUBMITTED", "ASSESSMENT_EVALUATED", "HUMAN_REVIEW"].includes(s))
    return (
      <Message eyebrow={`Assessment ${ASSESSMENT_STATE_LABEL.COMPLETED.toLowerCase()}${data.submittedAt ? ` · enviado el ${fmtDay(data.submittedAt)}` : ""}`} title="Recibimos tu postulación">
        {!inPortal && <p>¡Gracias por postular! Te enviamos un correo de confirmación. Para seguir el estado, ingresa a tu portal con tu correo: te enviaremos un código de un solo uso.</p>}
        <p>El equipo AI Edge Talent revisará la evidencia y te comunicará el resultado y el próximo paso por correo y en tu portal.</p>
        <Callout tone="warn" title="Postular no significa estar seleccionado/a." />
        <Callout title="Si quedas bajo el corte, tienes una segunda oportunidad">
          Te pediremos un video breve (máximo 3 minutos) respondiendo cuatro preguntas sobre tu compromiso, tu uso de IA y tu interés. Una persona del equipo lo revisa y decide.
        </Callout>
        {!inPortal && (
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <Link className="btn" href="/ingresar">Ingresar a mi portal</Link>
            <Link className="btn ghost" href="/">Volver al inicio</Link>
          </div>
        )}
      </Message>
    );
  if (s === "RESCUE_REQUIRED")
    return (
      <Message eyebrow="Complementa tu postulación" title="Queremos complementar tu postulación">
        <p>El formulario escrito puede no reflejar todo lo que traes. Queremos conocerte mejor con un video breve que responda estas preguntas.</p>
        <p className="muted">No es un castigo y no garantiza selección: complementa tu Assessment, y una persona del equipo lo revisa.</p>
        <RescueForm token={data.token} sent={data.rescue} />
      </Message>
    );
  if (s === "NOT_SELECTED")
    return (
      <Message eyebrow="Tu postulación" title="En esta ola no continuarás el proceso">
        <p>Gracias por tu interés y por el tiempo que dedicaste. Esto es un “todavía no”: podrás participar en próximos grupos cuando se abra la oportunidad.</p>
      </Message>
    );
  if (["SELECTED", "CONDITIONS_PENDING"].includes(s)) return <Commitment data={data} first={first} />;
  return (
    <Message eyebrow="Inscripción confirmada" title={`Ya eres parte de ${data.wave.name.replace("AI Edge Talent · ", "")}`}>
      <p>Tu compromiso quedó registrado. Tu Delivery te contactará con el calendario inicial y tu primera etapa: AI First Mindset.</p>
      <LifecycleRail current="MINDSET" only={["MINDSET", "AI_CERTS", "AI_LAB", "SHOWCASE", "CLOSURE"]} />
    </Message>
  );
}

function Message({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <div className="card narrow stack">
      <div className="eyebrow">{eyebrow}</div>
      <h1 style={{ margin: 0 }}>{title}</h1>
      {children}
    </div>
  );
}

function BeforeApplying({ data, first }: { data: PortalData; first: string }) {
  const doc = getDocument("PRE_APPLICATION_ACK", data.wave.acknowledgement_version);
  const [checked, setChecked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!doc) return <Callout tone="warn" title="Confirmación no configurada para esta Wave" />;
  const all = doc.confirmations.every((c) => checked.includes(c.id));
  return (
    <div className="stack">
      <BrandHero
        image="trabajo-laptop"
        photoLeft
        eyebrow={data.wave.name}
        title={`${first}, antes de postular queremos que sepas a qué te estás comprometiendo`}
        lead="AI Edge Talent no es solo un curso ni una certificación. Si eres seleccionado/a, participarás en un journey completo: Assessment → AI First Mindset → AI CERTs → AI Lab → Showcase → Cierre."
      >
        <Callout tone="warn" title="Postular no significa estar seleccionado/a.">
          {data.wave.application_deadline ? `Plazo: ${fmtDeadline(data.wave.application_deadline)}.` : null}
        </Callout>
      </BrandHero>
      <CommitmentSummaryCard />
      <div className="card narrow">
        <h2 style={{ marginTop: 0 }}>{doc.title}</h2>
        <p className="muted">{doc.descriptor}</p>
        {doc.confirmations.map((c) => (
          <label key={c.id} className="check">
            <input type="checkbox" checked={checked.includes(c.id)} onChange={(e) => setChecked((x) => (e.target.checked ? [...x, c.id] : x.filter((y) => y !== c.id)))} />
            <span>{c.text}</span>
          </label>
        ))}
        {error && <p className="error" role="alert">{error}</p>}
        <button
          className="btn"
          disabled={!all || pending}
          onClick={() =>
            start(async () => {
              const r = await acknowledgeAndStart(data.token, checked);
              if (!r.ok) setError(r.message);
              else router.refresh();
            })
          }
        >
          {pending ? "Un momento…" : doc.cta}
        </button>
        <p className="muted"><small>Versión {doc.version}</small></p>
      </div>
    </div>
  );
}

type SaveState = "idle" | "pending" | "saving" | "saved" | "offline" | "error";
const draftKey = (token: string) => `aet-assessment-${token}`;
const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit" });

/**
 * Assessment con continuidad: cada cambio se guarda en la base (borrador) a los pocos segundos y, mientras tanto,
 * queda una copia en este dispositivo. Si se corta la conexión o se cierra la pestaña, al volver se recupera lo
 * que no alcanzó a guardarse. El envío definitivo es una acción aparte, con validación y confirmación.
 */
function ApplicationForm({ data, preview = false }: { data: PortalData; preview?: boolean }) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(data.answers);
  const [save, setSave] = useState<{ state: SaveState; at: string | null; note?: string }>({ state: data.savedAt && answeredCount(data.questions, data.answers) ? "saved" : "idle", at: data.savedAt });
  const [missing, setMissing] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [recovered, setRecovered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  /** Confirmación local del envío: se muestra aunque la sesión haya caducado (el formulario usa su enlace personal). */
  const [finished, setFinished] = useState<null | "sent" | "already">(null);
  const latest = useRef(answers);
  const version = useRef(0);
  const savedVersion = useRef(0);
  const inflight = useRef<Promise<void> | null>(null);
  const timer = useRef<number | null>(null);
  const retry = useRef<number | null>(null);
  const done = useRef(false);

  const storeLocal = (a: Record<string, string>) => {
    try { localStorage.setItem(draftKey(data.token), JSON.stringify({ answers: a, at: Date.now() })); } catch { /* sin almacenamiento local: igual se guarda en la base */ }
  };
  const clearLocal = () => { try { localStorage.removeItem(draftKey(data.token)); } catch { /* nada */ } };

  /** Envía al servidor lo último escrito. Nunca hay dos guardados a la vez; si hubo cambios durante uno, sigue otro. */
  const flush = useCallback(async (): Promise<void> => {
    if (preview || done.current) return;
    if (inflight.current) { await inflight.current; if (version.current > savedVersion.current) return flush(); return; }
    if (version.current <= savedVersion.current) return;
    const v = version.current;
    setSave((s) => ({ ...s, state: "saving" }));
    inflight.current = (async () => {
      try {
        const r = await saveAnswers(data.token, latest.current, false);
        if (r.state === "submitted") { done.current = true; clearLocal(); setFinished("already"); return; }
        if (!r.ok) { setSave((s) => ({ ...s, state: "error", note: r.message })); scheduleRetry(); return; }
        savedVersion.current = Math.max(savedVersion.current, v);
        if (savedVersion.current >= version.current) clearLocal();
        setSave({ state: savedVersion.current >= version.current ? "saved" : "pending", at: r.savedAt ?? new Date().toISOString() });
      } catch {
        // Sin conexión o servidor no disponible: queda en este dispositivo y se reintenta.
        setSave((s) => ({ ...s, state: navigator.onLine ? "error" : "offline", note: undefined }));
        scheduleRetry();
      } finally {
        inflight.current = null;
      }
    })();
    await inflight.current;
    if (version.current > savedVersion.current && !retry.current) return flush();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.token, preview]);

  const scheduleRetry = () => {
    if (retry.current) return;
    retry.current = window.setTimeout(() => { retry.current = null; void flush(); }, 8000);
  };

  // Al abrir: si en este dispositivo quedó algo más reciente que lo guardado en la base, se recupera y se sincroniza.
  useEffect(() => {
    if (preview) return;
    try {
      const raw = localStorage.getItem(draftKey(data.token));
      if (raw) {
        const local = JSON.parse(raw) as { answers: Record<string, string>; at: number };
        const serverAt = data.savedAt ? Date.parse(data.savedAt) : 0;
        const differs = data.questions.some((q) => (local.answers[q.id] ?? "") !== (data.answers[q.id] ?? ""));
        if (differs && local.at > serverAt) {
          const merged = { ...data.answers, ...local.answers };
          latest.current = merged;
          setAnswers(merged);
          version.current += 1;
          setRecovered(true);
          setSave((s) => ({ ...s, state: "pending" }));
          void flush();
        } else clearLocal();
      }
    } catch { /* copia local ilegible: se ignora */ }
    // Retomar: lleva a la primera pregunta pendiente si ya había avance.
    const first = firstPending(data.questions, latest.current);
    if (first && answeredCount(data.questions, latest.current) > 0) document.getElementById(`q-${first}`)?.scrollIntoView({ block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guardar al ocultar la pestaña, al volver la conexión y avisar si se intenta cerrar con cambios sin guardar.
  useEffect(() => {
    if (preview) return;
    const onHide = () => { if (document.visibilityState === "hidden") void flush(); };
    const onOnline = () => void flush();
    const onOffline = () => setSave((s) => ({ ...s, state: "offline" }));
    const onUnload = (e: BeforeUnloadEvent) => {
      if (done.current || version.current <= savedVersion.current) return;
      void flush();
      e.preventDefault();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeunload", onUnload);
      if (timer.current) window.clearTimeout(timer.current);
      if (retry.current) window.clearTimeout(retry.current);
    };
  }, [flush, preview]);

  const set = (id: string, v: string) => {
    const next = { ...latest.current, [id]: v };
    latest.current = next;
    setAnswers(next);
    if (missing.includes(id) && v.trim()) setMissing((m) => m.filter((x) => x !== id));
    if (preview) return;
    version.current += 1;
    storeLocal(next);
    setSave((s) => ({ ...s, state: s.state === "offline" ? "offline" : "pending" }));
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), 1200);
  };

  const submit = async () => {
    if (submitting || preview) return;
    setError(null);
    const miss = missingRequired(data.questions, latest.current);
    if (miss.length) {
      setMissing(miss);
      setError(`Te faltan ${miss.length} pregunta(s) obligatoria(s), marcadas abajo. Tus respuestas siguen guardadas.`);
      document.getElementById(`q-${miss[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!confirm("¿Enviar tu postulación? Después no podrás editarla.")) return;
    setSubmitting(true);
    if (timer.current) window.clearTimeout(timer.current);
    try {
      if (inflight.current) await inflight.current;
      const r = await saveAnswers(data.token, latest.current, true);
      if (r.ok) { done.current = true; clearLocal(); setFinished(r.message === "submitted" ? "sent" : "already"); return; }
      if (r.missing?.length) { setMissing(r.missing); document.getElementById(`q-${r.missing[0]}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }
      setError(`${r.message} Tus respuestas siguen guardadas.`);
    } catch {
      setError("No pudimos enviar tu postulación: parece que no hay conexión. Tus respuestas quedaron guardadas; vuelve a intentarlo en un momento.");
    }
    setSubmitting(false);
  };

  if (finished)
    return (
      <Message eyebrow={`Assessment ${ASSESSMENT_STATE_LABEL.COMPLETED.toLowerCase()}`} title="Recibimos tu postulación">
        <p>{finished === "sent" ? "¡Gracias por postular! Tu Assessment quedó enviado y registrado." : "Tu postulación ya estaba enviada: quedó registrada una sola vez."}</p>
        <p>Te enviamos un correo con el detalle. Puedes seguir el estado de tu postulación ingresando a tu portal con tu correo.</p>
        <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
          <Link className="btn" href="/mi-journey">Ir a mi portal</Link>
          <Link className="btn ghost" href="/">Volver al inicio</Link>
        </div>
      </Message>
    );

  const answered = answeredCount(data.questions, answers);
  const total = data.questions.length;
  const first = firstPending(data.questions, answers);
  const label: Record<SaveState, string> = {
    idle: "Tus respuestas se guardan solas mientras escribes.",
    pending: "Cambios sin guardar…",
    saving: "Guardando…",
    saved: save.at ? `Guardado a las ${hhmm(save.at)}` : "Guardado",
    offline: "Sin conexión: tus respuestas quedan en este dispositivo y se guardarán al volver la conexión.",
    error: `No se pudo guardar${save.note ? ` (${save.note})` : ""}. Reintentaremos en unos segundos; no cierres la página.`,
  };

  return (
    <div className="grid assess-grid">
      <div className="stack" style={{ minWidth: 0 }}>
        <div>
          <div className="eyebrow">{data.wave.name}</div>
          <h1>Tu Assessment</h1>
          <p className="lead">Queremos conocerte a través de experiencias reales.</p>
          <p>No buscamos respuestas perfectas ni conocimientos memorizados. Queremos conocer cómo estás utilizando IA, cómo abordas problemas, cómo aprendes y cómo imaginas la evolución de tu trabajo.</p>
          <Callout title="Puedes hacerlo en varias veces.">Tus respuestas se guardan solas. Si cierras la página, vuelve con tu enlace o ingresando a tu portal con tu correo y continúa donde quedaste.</Callout>
        </div>
        <div className="assess-bar" role="region" aria-label="Avance del Assessment">
          <span className="ds-status s-progress">{ASSESSMENT_STATE_LABEL.IN_PROGRESS}</span>
          <strong>{answered} de {total} respondidas</strong>
          <span className={`assess-save s-${save.state}`} role="status" aria-live="polite">{label[save.state]}</span>
          {first && answered > 0 && <button type="button" className="link-btn" onClick={() => document.getElementById(`q-${first}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}>Ir a la primera pendiente</button>}
        </div>
        {recovered && <Callout tone="ok" title="Recuperamos respuestas que no alcanzaron a guardarse">Estaban en este dispositivo; ya las estamos guardando.</Callout>}
        {data.questions.map((q, i) => (
          <div key={q.id} id={`q-${q.id}`} className={`card${missing.includes(q.id) ? " q-missing" : ""}`}>
            <label htmlFor={q.id}>
              {i + 1}. {q.prompt} {q.required && <span className="muted">*</span>}
            </label>
            {q.help && <div className="hint" style={{ marginBottom: 8 }}>{q.help}</div>}
            {q.kind === "single_choice" && q.options ? (
              <div className="row" role="radiogroup" aria-labelledby={`q-${q.id}`}>
                {q.options.map((o) => (
                  <label key={o} className="check" style={{ marginBottom: 0 }}>
                    <input type="radio" name={q.id} checked={answers[q.id] === o} onChange={() => set(q.id, o)} />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea id={q.id} value={answers[q.id] ?? ""} onChange={(e) => set(q.id, e.target.value)} onBlur={() => void flush()} rows={q.kind === "short_text" ? 2 : 6} maxLength={8000} aria-invalid={missing.includes(q.id) || undefined} />
            )}
            {missing.includes(q.id) && <small className="error">Esta pregunta es obligatoria para enviar.</small>}
          </div>
        ))}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="row">
          <button className="btn ghost" type="button" disabled={submitting || save.state === "saving"} onClick={() => { version.current = Math.max(version.current, savedVersion.current + 1); void flush(); }}>
            Guardar ahora
          </button>
          <button className="btn" type="button" disabled={submitting} onClick={() => void submit()}>
            {submitting ? "Enviando…" : "Enviar mi postulación"}
          </button>
          <span className="muted"><small>{answered}/{total} respondidas</small></span>
        </div>
      </div>
      <aside className="card">
        <h3>Qué evaluaremos</h3>
        <ul>
          {ASSESSMENT_DIMENSIONS.map((d) => (
            <li key={d.id}>
              {d.label} <span className="muted">· {d.weight}%</span>
            </li>
          ))}
        </ul>
        <p className="muted">Evaluamos la calidad de la evidencia, no la habilidad para escribir “lo que creemos que queremos escuchar”.</p>
        {data.wave.application_deadline && (
          <p>
            <strong>Deadline:</strong> {fmtDeadline(data.wave.application_deadline)}
          </p>
        )}
      </aside>
    </div>
  );
}

function Commitment({ data, first }: { data: PortalData; first: string }) {
  const doc = getDocument("COMMITMENT_LETTER", data.wave.commitment_version);
  const [checked, setChecked] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (!doc) return <Callout tone="warn" title="Carta de compromiso no configurada" />;
  return (
    <div className="stack narrow">
      <Callout tone="ok" title={`${first}, fuiste seleccionado/a para continuar`}>
        Antes de comenzar, revisa y acepta las condiciones. Seleccionado/a todavía no es inscrito/a: tu inscripción se confirma al aceptar.
      </Callout>
      <div className="eyebrow">{data.wave.name} · Carta de compromiso</div>
      <h1>{doc.title}</h1>
      <p className="lead">{doc.descriptor}</p>
      <div className="card">
        <DocumentView doc={doc} />
      </div>
      <div className="card">
        <div className="grid grid-3" style={{ marginBottom: 12 }}>
          <div><small className="muted">Wave</small><div><strong>{data.wave.name.replace("AI Edge Talent · ", "")}</strong></div></div>
          <div><small className="muted">Versión</small><div><strong>{doc.version}</strong></div></div>
          <div><small className="muted">Fecha</small><div><strong>{fmtDay(new Date().toISOString())}</strong></div></div>
        </div>
        {doc.confirmations.map((c) => (
          <label key={c.id} className="check">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <span>{c.text}</span>
          </label>
        ))}
        <div className="field">
          <label htmlFor="fullname">Nombre completo</label>
          <input id="fullname" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={data.candidate.fullName} />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button
          className="btn"
          disabled={!checked || name.trim().length < 3 || pending}
          onClick={() =>
            start(async () => {
              const r = await acceptCommitmentByToken(data.token, name, checked);
              if (!r.ok) setError(r.message);
              else router.refresh();
            })
          }
        >
          {pending ? "Registrando…" : doc.cta}
        </button>
        <p className="muted" style={{ marginTop: 8 }}><small>¿Dudas? Habla con tu Delivery antes de aceptar. <Link href="/programa">Ver el programa</Link></small></p>
      </div>
    </div>
  );
}
