"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { acknowledgeAndStart, acceptCommitmentByToken, saveAnswers } from "@/lib/admission/candidate-actions";
import { getDocument } from "@/lib/content";
import { ASSESSMENT_DIMENSIONS } from "@/lib/data/journey";
import { CommitmentSummaryCard, LifecycleRail } from "@/components/journey";
import { BrandHero, Callout, DocumentView, fmtDay, fmtDeadline } from "@/components/ui";
import { RescueForm } from "./RescueForm";

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
  rescue: { at: string; reviewed: boolean } | null;
}

/** `inPortal`: la persona ya ingresó con su cuenta (no se le recuerda revisar el correo de credenciales). */
export function CandidatePortal({ data, inPortal = false }: { data: PortalData; inPortal?: boolean }) {
  const s = data.candidate.status;
  const first = data.candidate.fullName.split(" ")[0];
  if (["NOMINATED", "INVITED", "IDENTIFIED"].includes(s)) return <BeforeApplying data={data} first={first} />;
  if (s === "APPLICATION_STARTED") return <ApplicationForm data={data} />;
  if (["APPLICATION_SUBMITTED", "ASSESSMENT_EVALUATED", "HUMAN_REVIEW"].includes(s))
    return (
      <Message eyebrow="Postulación enviada" title="Recibimos tu postulación">
        {!inPortal && <p>¡Gracias por postular! Te enviamos un correo con tus credenciales para ingresar a tu portal: ahí ves el estado de tu postulación. Al ingresar por primera vez creas tu propio código de 4 dígitos.</p>}
        <p>El equipo AI Edge Talent revisará la evidencia y te comunicará el resultado y el próximo paso por correo y en tu portal.</p>
        <Callout tone="warn" title="Postular no significa estar seleccionado/a." />
        <Callout title="Si quedas bajo el corte, tienes una segunda oportunidad">
          Te pediremos un video breve (máximo 3 minutos) respondiendo cuatro preguntas sobre tu compromiso, tu uso de IA y tu interés. Una persona del equipo lo revisa y decide.
        </Callout>
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

function ApplicationForm({ data }: { data: PortalData }) {
  const [answers, setAnswers] = useState<Record<string, string>>(data.answers);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const dirty = useRef(false);

  // Autoguardado cada 20 s si hay cambios.
  useEffect(() => {
    const t = window.setInterval(async () => {
      if (!dirty.current) return;
      dirty.current = false;
      const r = await saveAnswers(data.token, answers, false);
      setStatus(r.ok ? `Borrador guardado · ${new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}` : r.message);
    }, 20000);
    return () => window.clearInterval(t);
  }, [answers, data.token]);

  const set = (id: string, v: string) => {
    dirty.current = true;
    setAnswers((a) => ({ ...a, [id]: v }));
  };
  const answered = data.questions.filter((q) => (answers[q.id] ?? "").trim()).length;

  return (
    <div className="grid assess-grid">
      <div className="stack" style={{ minWidth: 0 }}>
        <div>
          <div className="eyebrow">{data.wave.name}</div>
          <h1>Tu Assessment</h1>
          <p className="lead">Queremos conocerte a través de experiencias reales.</p>
          <p>No buscamos respuestas perfectas ni conocimientos memorizados. Queremos conocer cómo estás utilizando IA, cómo abordas problemas, cómo aprendes y cómo imaginas la evolución de tu trabajo.</p>
          <Callout title="Sé generoso/a en tus respuestas.">Usa ejemplos concretos. Tus respuestas se guardan automáticamente como borrador.</Callout>
        </div>
        {data.questions.map((q, i) => (
          <div key={q.id} className="card">
            <label htmlFor={q.id}>
              {i + 1}. {q.prompt} {q.required && <span className="muted">*</span>}
            </label>
            {q.help && <div className="hint" style={{ marginBottom: 8 }}>{q.help}</div>}
            {q.kind === "single_choice" && q.options ? (
              <div className="row">
                {q.options.map((o) => (
                  <label key={o} className="check" style={{ marginBottom: 0 }}>
                    <input type="radio" name={q.id} checked={answers[q.id] === o} onChange={() => set(q.id, o)} />
                    <span>{o}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea id={q.id} value={answers[q.id] ?? ""} onChange={(e) => set(q.id, e.target.value)} rows={q.kind === "short_text" ? 2 : 6} maxLength={8000} />
            )}
          </div>
        ))}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="row">
          <button
            className="btn ghost"
            disabled={pending}
            onClick={() => start(async () => setStatus((await saveAnswers(data.token, answers, false)).message))}
          >
            Guardar borrador
          </button>
          <button
            className="btn"
            disabled={pending}
            onClick={() =>
              start(async () => {
                if (!confirm("¿Enviar tu postulación? Después no podrás editarla.")) return;
                const r = await saveAnswers(data.token, answers, true);
                if (!r.ok) setError(r.message);
                else router.refresh();
              })
            }
          >
            {pending ? "Enviando…" : "Enviar mi postulación"}
          </button>
          <span className="muted"><small>{answered}/{data.questions.length} respondidas {status && `· ${status}`}</small></span>
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
