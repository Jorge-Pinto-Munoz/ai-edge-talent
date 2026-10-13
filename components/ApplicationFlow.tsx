"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/lib/store/StoreProvider";
import { acknowledge, getWave, identify, submitApplication } from "@/lib/store/state";
import { documentsForWave } from "@/lib/content";
import { applicationsOpen } from "@/lib/domain/wave";
import { hasSubmitted } from "@/lib/domain/admission";
import { ASSESSMENT_DIMENSIONS } from "@/lib/data/journey";
import type { Nomination } from "@/lib/domain/types";
import { CommitmentSummaryCard } from "./journey";
import { TypeformEmbed } from "./TypeformEmbed";
import { Callout, fmtDeadline } from "./ui";

type Step = "IDENTIFICATION" | "PROGRAM_OVERVIEW" | "APPLICATION_CONDITIONS" | "PRE_APPLICATION_ACKNOWLEDGEMENT" | "ASSESSMENT" | "APPLICATION_SUBMITTED";

const STEPS: { id: Step; label: string }[] = [
  { id: "IDENTIFICATION", label: "1 · Identificación" },
  { id: "PROGRAM_OVERVIEW", label: "2 · Antes de postular" },
  { id: "APPLICATION_CONDITIONS", label: "3 · Qué se espera" },
  { id: "PRE_APPLICATION_ACKNOWLEDGEMENT", label: "4 · Confirmación" },
  { id: "ASSESSMENT", label: "5 · Assessment" },
  { id: "APPLICATION_SUBMITTED", label: "6 · Enviado" },
];

export function ApplicationFlow({ waveId, nomination }: { waveId: string; nomination?: Nomination }) {
  const { state, run, hydrated } = useStore();
  const wave = getWave(state, waveId);
  const docs = documentsForWave(wave);
  const appId = state.session.currentApplicationId;
  const app = state.applications.find((a) => a.id === appId && a.waveId === waveId);
  const [step, setStep] = useState<Step>("IDENTIFICATION");
  const [error, setError] = useState<string | null>(null);

  // Reanudar según el estado registrado.
  useEffect(() => {
    if (!hydrated || !app) return;
    if (hasSubmitted(app.applicationStatus)) setStep("APPLICATION_SUBMITTED");
    else if (app.applicationStatus === "APPLICATION_STARTED") setStep("ASSESSMENT");
    else if (app.applicationStatus === "IDENTIFIED") setStep((s) => (s === "IDENTIFICATION" ? "PROGRAM_OVERVIEW" : s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, app?.id, app?.applicationStatus]);

  const gate = applicationsOpen(wave, new Date().toISOString());
  const idx = STEPS.findIndex((s) => s.id === step);
  const go = (s: Step) => {
    setError(null);
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!gate.open && !app) {
    return <Callout tone="warn" title="Postulación cerrada">{gate.reason}</Callout>;
  }

  return (
    <div className="stack">
      <div className="steps" aria-label="Progreso de postulación">
        {STEPS.map((s, i) => (
          <span key={s.id} className={`step ${i < idx ? "done" : i === idx ? "current" : ""}`}>
            {s.label}
          </span>
        ))}
      </div>
      {wave.applicationDeadline && step !== "APPLICATION_SUBMITTED" && (
        <p className="muted" style={{ margin: 0 }}>
          Plazo: <strong>{fmtDeadline(wave.applicationDeadline)}</strong>
        </p>
      )}
      {error && <p className="error" role="alert">{error}</p>}

      {step === "IDENTIFICATION" && (
        <Identification
          waveName={wave.name}
          clients={wave.clients.map((c) => c.name)}
          nomination={nomination}
          clientName={nomination ? wave.clients.find((c) => c.id === nomination.clientId)?.name : undefined}
          onSubmit={(data) => {
            let created: string | null = null;
            const err = run((s) => {
              const r = identify(s, { ...data, waveId, nominationId: nomination?.id });
              created = r.applicationId;
              return r.state;
            });
            if (err) return setError(err);
            if (created) go("PROGRAM_OVERVIEW");
          }}
        />
      )}

      {step === "PROGRAM_OVERVIEW" && (
        <div className="card narrow">
          <h1>Antes de postular, queremos que sepas a qué te estás comprometiendo</h1>
          <h3>Esto es AI Edge Talent</h3>
          <p>AI Edge Talent no es solo un curso ni una certificación.</p>
          <p>Si eres seleccionado/a, participarás en un journey completo:</p>
          <p>
            <strong>Assessment → AI First Mindset → AI CERTs → AI Lab → Showcase → Cierre</strong>
          </p>
          <Callout title="La certificación es una etapa del proceso.">No es el final del programa.</Callout>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn" onClick={() => go("APPLICATION_CONDITIONS")}>
              Continuar
            </button>
            <Link className="btn ghost" href="/programa" target="_blank">
              Ver el programa completo
            </Link>
          </div>
        </div>
      )}

      {step === "APPLICATION_CONDITIONS" && (
        <div className="stack">
          <h1>Qué se espera si eres seleccionado/a</h1>
          <p className="lead">El compromiso es bilateral: tú, Kibernum y el cliente.</p>
          <CommitmentSummaryCard />
          <div className="row">
            <button className="btn ghost" onClick={() => go("PROGRAM_OVERVIEW")}>
              Volver
            </button>
            <button className="btn" onClick={() => go("PRE_APPLICATION_ACKNOWLEDGEMENT")}>
              Continuar
            </button>
          </div>
        </div>
      )}

      {step === "PRE_APPLICATION_ACKNOWLEDGEMENT" && docs.acknowledgement && app && (
        <Acknowledgement
          doc={docs.acknowledgement}
          onBack={() => go("APPLICATION_CONDITIONS")}
          onAccept={(ids) => {
            const err = run((s) => acknowledge(s, app.id, ids));
            if (err) return setError(err);
            go("ASSESSMENT");
          }}
        />
      )}

      {step === "ASSESSMENT" && app && wave.assessmentUrl && (
        <div className="grid assess-grid">
          <div className="stack" style={{ minWidth: 0 }}>
            <div>
              <h1>Tu Assessment</h1>
              <p className="lead">Queremos conocerte a través de experiencias reales.</p>
              <p>
                No buscamos respuestas perfectas ni conocimientos memorizados. Queremos conocer cómo estás utilizando IA, cómo abordas problemas, cómo aprendes y cómo
                imaginas la evolución de tu trabajo.
              </p>
              <Callout title="Sé generoso/a en tus respuestas.">Usa ejemplos concretos.</Callout>
            </div>
            <TypeformEmbed
              url={wave.assessmentUrl}
              applicationId={app.id}
              waveId={wave.id}
              onSubmitted={(source) => {
                const err = run((s) => submitApplication(s, app.id, source));
                if (err) return setError(err);
                go("APPLICATION_SUBMITTED");
              }}
            />
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
            <p className="muted">
              Evaluamos la calidad de la evidencia, no la habilidad para escribir “lo que creemos que queremos escuchar”.
            </p>
            {wave.applicationDeadline && (
              <p>
                <strong>Deadline:</strong> {fmtDeadline(wave.applicationDeadline)}
              </p>
            )}
          </aside>
        </div>
      )}

      {step === "APPLICATION_SUBMITTED" && (
        <div className="card narrow">
          <div className="eyebrow">Postulación enviada</div>
          <h1>Recibimos tu postulación</h1>
          <p>El equipo AI Edge Talent revisará la evidencia y te comunicará el resultado y el próximo paso.</p>
          <Callout tone="warn" title="Postular no significa estar seleccionado/a.">
            Si eres seleccionado/a, antes de comenzar deberás revisar y aceptar formalmente tu compromiso de participación.
          </Callout>
          <h3 style={{ marginTop: 16 }}>Qué ocurre después</h3>
          <ol>
            <li>Evaluación de la evidencia del Assessment.</li>
            <li>Resultado: seleccionado/a, solicitud de complemento (video), revisión humana o no seleccionado/a.</li>
            <li>Si eres seleccionado/a: Carta de Compromiso → inscripción → onboarding → AI First Mindset.</li>
          </ol>
          <Link className="btn" href="/kiber">
            Ver el estado de mi postulación
          </Link>
        </div>
      )}
    </div>
  );
}

function Identification({
  waveName,
  clients,
  nomination,
  clientName,
  onSubmit,
}: {
  waveName: string;
  clients: string[];
  nomination?: Nomination;
  clientName?: string;
  onSubmit: (d: { participantName: string; corporateEmail: string; client: string; role: string; team?: string }) => void;
}) {
  const [f, setF] = useState({
    participantName: nomination?.nomineeName ?? "",
    corporateEmail: nomination?.nomineeEmail ?? "",
    client: clientName ?? "",
    role: nomination?.role ?? "",
    team: nomination?.team ?? "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const clientOptions = useMemo(() => [...new Set([...clients, ...(clientName ? [clientName] : [])])], [clients, clientName]);

  return (
    <form
      className="card narrow"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(f);
      }}
    >
      <h1>Identifícate</h1>
      <p className="muted">Antes del Assessment registramos tu postulación. No solicitamos RUT.</p>
      <div className="field">
        <label htmlFor="n">Nombre completo *</label>
        <input id="n" type="text" required value={f.participantName} onChange={set("participantName")} autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="e">Correo electrónico *</label>
        <input id="e" type="email" required value={f.corporateEmail} onChange={set("corporateEmail")} autoComplete="email" />
      </div>
      <div className="field">
        <label htmlFor="c">Cliente en el que trabajas *</label>
        <input id="c" type="text" required list="clients" value={f.client} onChange={set("client")} />
        <datalist id="clients">
          {clientOptions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>
      <div className="field">
        <label htmlFor="r">Rol / cargo *</label>
        <input id="r" type="text" required value={f.role} onChange={set("role")} />
      </div>
      <div className="field">
        <label htmlFor="t">Unidad / equipo (opcional)</label>
        <input id="t" type="text" value={f.team} onChange={set("team")} />
      </div>
      <div className="field">
        <label>Wave</label>
        <input type="text" value={waveName} readOnly disabled />
        <div className="hint">Tu Delivery asociado se asigna automáticamente cuando puede resolverse por cliente.</div>
      </div>
      <button className="btn" type="submit">
        Continuar
      </button>
    </form>
  );
}

function Acknowledgement({
  doc,
  onAccept,
  onBack,
}: {
  doc: NonNullable<ReturnType<typeof documentsForWave>["acknowledgement"]>;
  onAccept: (ids: string[]) => void;
  onBack: () => void;
}) {
  const [checked, setChecked] = useState<string[]>([]);
  const all = doc.confirmations.every((c) => checked.includes(c.id));
  return (
    <div className="card narrow">
      <h1>{doc.title}</h1>
      <p className="muted">{doc.descriptor}</p>
      {doc.confirmations.map((c) => (
        <label key={c.id} className="check">
          <input
            type="checkbox"
            checked={checked.includes(c.id)}
            onChange={(e) => setChecked((x) => (e.target.checked ? [...x, c.id] : x.filter((y) => y !== c.id)))}
          />
          <span>{c.text}</span>
        </label>
      ))}
      <p className="muted">
        <small>
          Versión {doc.version}. {checked.length}/{doc.confirmations.length} confirmaciones.
        </small>
      </p>
      <div className="row">
        <button className="btn ghost" onClick={onBack}>
          Volver
        </button>
        <button className="btn" disabled={!all} onClick={() => onAccept(checked)}>
          {doc.cta}
        </button>
      </div>
    </div>
  );
}
