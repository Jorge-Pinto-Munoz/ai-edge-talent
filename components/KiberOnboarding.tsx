"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useStore } from "@/lib/store/StoreProvider";
import { completeOnboarding, currentCommitment } from "@/lib/store/state";
import { isEnrolled } from "@/lib/domain/admission";
import { KIBER_COMMITMENTS } from "@/lib/data/program";
import { useCurrentApp } from "./useCurrentApp";
import { NoApplication } from "./NoApplication";
import { SupportTeam } from "./KiberCommitment";
import { LifecycleRail } from "./journey";
import { ProgramPortal } from "./ProgramPortal";
import { Callout, fmtDate, fmtDay } from "./ui";
import type { ApplicationRecord, Wave } from "@/lib/domain/types";
import type { AppState } from "@/lib/store/state";

function onboardingSteps(app: ApplicationRecord, wave: Wave, state: AppState): { title: string; body: ReactNode }[] {
  const rec = currentCommitment(state, app.id);
  return [
    {
      title: "Bienvenido/a",
      body: <p>Ya eres parte de {wave.name}. Este recorrido te deja claro cómo funciona tu proceso. Puedes volver a consultarlo cuando quieras desde “Mi programa”.</p>,
    },
    {
      title: "Tu Wave",
      body: (
        <ul>
          <li><strong>Wave:</strong> {wave.name}</li>
          <li><strong>Cliente:</strong> {app.client}</li>
          <li><strong>Rol:</strong> {app.role}</li>
          <li><strong>Inicio:</strong> {wave.startDate ? fmtDay(wave.startDate) : "lo confirma tu Delivery en el calendario inicial"}</li>
          <li><strong>Duración de referencia:</strong> 30–45 días</li>
        </ul>
      ),
    },
    {
      title: "Cómo funciona el journey",
      body: (
        <>
          <LifecycleRail current="MINDSET" only={["MINDSET", "AI_CERTS", "AI_LAB", "SHOWCASE", "CLOSURE"]} />
          <p style={{ marginTop: 10 }}>La certificación es una etapa del proceso. No es el final del programa.</p>
        </>
      ),
    },
    { title: "Quién te acompaña", body: <SupportTeam /> },
    {
      title: "Qué esperamos de ti",
      body: (
        <ul>
          {KIBER_COMMITMENTS.map((c) => (
            <li key={c.title}>
              <strong>{c.title}</strong>
            </li>
          ))}
        </ul>
      ),
    },
    {
      title: "Cómo funcionan los gates",
      body: (
        <>
          <ul>
            <li><strong>AI First Mindset:</strong> ≥75/100 + hard gates. Dos intentos. REVISIÓN HUMANA no consume intento. Segundo intento no aprobado: no avanzas a AI CERTs salvo excepción explícita de Product Lead.</li>
            <li><strong>AI CERTs:</strong> ~40 horas. Dos intentos financiados. Segundo intento no aprobado: el journey AET se cierra salvo excepción explícita.</li>
            <li><strong>AI Lab:</strong> requiere certificación aprobada. Sin máximo fijo de intentos: ajustes hasta readiness o decisión explícita.</li>
            <li><strong>Plazos:</strong> un atraso activa alerta, recovery y revisión. No es una expulsión automática.</li>
          </ul>
          {rec?.status === "ACCEPTED" && (
            <p className="muted">
              Aceptaste el compromiso {rec.documentVersion} el {fmtDate(rec.acceptedAt!)}. <Link href="/kiber/commitment">Ver documento</Link>
            </p>
          )}
        </>
      ),
    },
    {
      title: "Canales y ayuda",
      body: (
        <ul>
          {wave.channels.map((c) => (
            <li key={c.label}>
              <strong>{c.label}:</strong> {c.value ?? <span className="pending-def">PENDIENTE DE DEFINICIÓN</span>}
            </li>
          ))}
          <li>
            <Link href="/ayuda">Preguntas frecuentes</Link>
          </li>
        </ul>
      ),
    },
    {
      title: "Tu primer próximo paso",
      body: (
        <Callout tone="ok" title="AI First Mindset">
          Prepárate para rediseñar una actividad real de tu trabajo integrando IA con criterio. Conocerás los criterios y hard gates antes de entregar.
        </Callout>
      ),
    },
  ];
}

export function KiberOnboarding() {
  const { app, wave, hydrated, state } = useCurrentApp();
  const { run } = useStore();
  const router = useRouter();
  const [i, setI] = useState(0);
  if (!hydrated) return <p className="muted">Cargando…</p>;
  if (!app || !wave) return <NoApplication />;
  if (!isEnrolled(app.applicationStatus)) {
    return <Callout title="El onboarding se habilita al inscribirte">Primero acepta tu compromiso. <Link href="/kiber">Ver mi proceso</Link></Callout>;
  }
  const steps = onboardingSteps(app, wave, state);
  const last = i === steps.length - 1;
  return (
    <div className="stack narrow">
      <div className="steps">
        {steps.map((s, k) => (
          <button key={s.title} className={`step ${k < i ? "done" : k === i ? "current" : ""}`} style={{ border: 0, cursor: "pointer" }} onClick={() => setI(k)}>
            {k + 1}. {s.title}
          </button>
        ))}
      </div>
      <div className="card">
        <div className="eyebrow">Paso {i + 1} de {steps.length}</div>
        <h1>{steps[i].title}</h1>
        {steps[i].body}
      </div>
      <div className="row">
        <button className="btn ghost" disabled={i === 0} onClick={() => setI(i - 1)}>
          Anterior
        </button>
        {last ? (
          <button
            className="btn"
            onClick={() => {
              run((s) => completeOnboarding(s, app.id));
              router.push("/kiber");
            }}
          >
            {app.onboardingCompletedAt ? "Volver a mi proceso" : "Finalizar onboarding"}
          </button>
        ) : (
          <button className="btn" onClick={() => setI(i + 1)}>
            Siguiente
          </button>
        )}
      </div>
    </div>
  );
}

export function KiberProgram() {
  const { app } = useCurrentApp();
  return (
    <ProgramPortal
      intro={
        app && isEnrolled(app.applicationStatus) ? (
          <div className="row">
            <Link className="btn ghost small" href="/kiber/onboarding">Revisar mi onboarding</Link>
            <Link className="btn ghost small" href="/kiber/conditions">Mis condiciones</Link>
            <Link className="btn ghost small" href="/kiber/commitment">Mi compromiso</Link>
          </div>
        ) : null
      }
    />
  );
}
