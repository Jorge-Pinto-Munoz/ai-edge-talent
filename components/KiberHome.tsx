"use client";

import Link from "next/link";
import { useCurrentApp } from "./useCurrentApp";
import { NoApplication } from "./NoApplication";
import { ExpectationCard, LifecycleRail } from "./journey";
import { Badge, Callout, fmtDate, fmtDeadline } from "./ui";
import { ADMISSION_LABEL } from "@/lib/domain/types";
import { currentCommitment, setCurrentApplication } from "@/lib/store/state";
import { useStore } from "@/lib/store/StoreProvider";
import type { LifecycleStageId } from "@/lib/data/journey";

export function KiberHome() {
  const { app, wave, hydrated, state } = useCurrentApp();
  const { run } = useStore();
  if (!hydrated) return <p className="muted">Cargando…</p>;
  if (!app || !wave) return <NoApplication />;

  const s = app.applicationStatus;
  const lifecycle: LifecycleStageId =
    s === "MINDSET_READY" && app.journeyStage
      ? app.journeyStage
      : s === "ENROLLED"
        ? "ENROLLMENT"
        : ["SELECTED", "CONDITIONS_PENDING", "CONDITIONS_ACCEPTED"].includes(s)
          ? "CONDITIONS"
          : ["ASSESSMENT_EVALUATED", "HUMAN_REVIEW", "RESCUE_REQUIRED", "NOT_SELECTED"].includes(s)
            ? "SELECTION"
            : s === "APPLICATION_SUBMITTED"
              ? "ASSESSMENT"
              : "APPLICATION";
  const events = state.events.filter((e) => e.applicationId === app.id);
  const commitment = currentCommitment(state, app.id);

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <div className="eyebrow">{wave.name}</div>
          <h1 style={{ marginBottom: 4 }}>Hola, {app.participantName.split(" ")[0]}</h1>
          <span className="muted">
            {app.role} · {app.client} {app.deliveryOwner ? `· Delivery: ${app.deliveryOwner}` : ""}
          </span>
        </div>
        <Badge tone="brand">{ADMISSION_LABEL[s]}</Badge>
      </div>

      <NextStep />

      <h2>Dónde estás</h2>
      <LifecycleRail current={lifecycle} only={["APPLICATION", "ASSESSMENT", "SELECTION", "CONDITIONS", "ENROLLMENT", "MINDSET", "AI_CERTS", "AI_LAB", "SHOWCASE", "CLOSURE"]} />
      <ExpectationCard stageId={lifecycle} audiences={["kiber", "aetEvidence"]} />

      <div className="grid grid-2">
        <div className="card">
          <h3>Qué ocurrió</h3>
          <ul>
            {events.map((e) => (
              <li key={e.id}>
                <strong>{ADMISSION_LABEL[e.to]}</strong> <span className="muted">· {fmtDate(e.at)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Mis registros</h3>
          <ul>
            {state.acknowledgements
              .filter((a) => a.participantId === app.id)
              .map((a) => (
                <li key={a.id}>
                  Confirmación previa {a.acknowledgementVersion} · {fmtDate(a.acceptedAt)}
                </li>
              ))}
            {state.commitments
              .filter((c) => c.participantId === app.id)
              .map((c) => (
                <li key={c.id}>
                  Compromiso {c.documentVersion} · <Badge tone={c.status === "ACCEPTED" ? "ok" : c.status === "SUPERSEDED" ? undefined : "warn"}>{c.status}</Badge>
                  {c.acceptedAt && <span className="muted"> · {fmtDate(c.acceptedAt)} por {c.acceptedBy}</span>}
                </li>
              ))}
            {!commitment && state.acknowledgements.every((a) => a.participantId !== app.id) && <li className="muted">Sin registros aún.</li>}
          </ul>
          <Link href="/kiber/programa">Revisar el programa y mi onboarding</Link>
        </div>
      </div>
      <p className="muted">
        <small>
          ¿No eres tú? <button className="btn ghost small" onClick={() => run((st) => setCurrentApplication(st, null))}>Cambiar de participante</button>
        </small>
      </p>
    </div>
  );
}

function NextStep() {
  const { app, wave } = useCurrentApp();
  if (!app || !wave) return null;
  switch (app.applicationStatus) {
    case "NOMINATED":
    case "INVITED":
    case "IDENTIFIED":
    case "APPLICATION_STARTED":
      return (
        <Callout title="Qué toca ahora: completar tu postulación">
          {wave.applicationDeadline && <p>Plazo: {fmtDeadline(wave.applicationDeadline)}.</p>}
          <Link className="btn" href={wave.id === "wave-3" ? "/wave-3/postular" : "/programa"}>
            Continuar mi postulación
          </Link>
        </Callout>
      );
    case "APPLICATION_SUBMITTED":
    case "ASSESSMENT_EVALUATED":
      return (
        <Callout title="Recibimos tu postulación">
          El equipo AI Edge Talent revisará la evidencia y te comunicará el resultado y el próximo paso. Postular no significa estar seleccionado/a.
        </Callout>
      );
    case "HUMAN_REVIEW":
      return (
        <Callout title="Tu postulación está en revisión humana">
          Una persona del equipo está revisando tu evidencia con más detalle. No necesitas hacer nada por ahora; te contactaremos con el resultado.
        </Callout>
      );
    case "RESCUE_REQUIRED":
      return (
        <Callout tone="warn" title="Queremos complementar tu postulación">
          <p>
            El formulario escrito no nos permitió observar suficientemente parte de tu evidencia. Te pediremos un breve video que complementa —no reemplaza— tu Assessment.
          </p>
          <p style={{ margin: 0 }}>
            No es un castigo y no garantiza selección. Tu Delivery te enviará las instrucciones y el plazo.
          </p>
        </Callout>
      );
    case "NOT_SELECTED":
      return (
        <Callout title="En esta Wave no continuarás el proceso">
          Partimos con un grupo inicial. Agradecemos tu postulación: podrás participar en próximos ciclos cuando se abra la oportunidad. Tu Delivery puede conversar contigo
          sobre los próximos pasos.
        </Callout>
      );
    case "SELECTED":
    case "CONDITIONS_PENDING":
      return (
        <Callout tone="ok" title="Fuiste seleccionado/a para continuar">
          <p>Antes de comenzar, revisa y acepta las condiciones de participación. Seleccionado/a todavía no es inscrito/a.</p>
          <Link className="btn" href="/kiber/conditions">
            Revisar y aceptar condiciones de ingreso
          </Link>
        </Callout>
      );
    case "CONDITIONS_ACCEPTED":
    case "ENROLLED":
      return (
        <Callout tone="ok" title={`Ya eres parte de ${wave.name.replace("AI Edge Talent · ", "")}`}>
          {app.onboardingCompletedAt ? null : (
            <Link className="btn" href="/kiber/onboarding">
              Comenzar mi journey
            </Link>
          )}
        </Callout>
      );
    case "MINDSET_READY":
      return (
        <Callout tone="ok" title="Qué toca ahora: AI First Mindset">
          Rediseñar una actividad real integrando IA con criterio. Aprobación: ≥75/100 + hard gates. Dos intentos; REVISIÓN HUMANA no consume intento.
        </Callout>
      );
  }
}
