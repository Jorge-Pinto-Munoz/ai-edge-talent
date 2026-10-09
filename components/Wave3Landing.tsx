"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store/StoreProvider";
import { getWave } from "@/lib/store/state";
import { ApplicationFlow } from "./ApplicationFlow";
import { Callout, fmtDay } from "./ui";

export function Wave3Landing() {
  const { state, hydrated } = useStore();
  const wave = getWave(state, "wave-3");
  const resuming = hydrated && state.applications.some((a) => a.id === state.session.currentApplicationId && a.waveId === wave.id);
  const [started, setStarted] = useState(false);

  if (started || resuming) return <ApplicationFlow waveId={wave.id} />;

  return (
    <div className="stack">
      <section className="hero narrow">
        <div className="eyebrow">{wave.name}</div>
        <h1>Postula a Wave 3 de AI Edge Talent</h1>
        <p className="lead">
          Una experiencia para profesionales TI que quieren integrar inteligencia artificial de manera más profunda a su rol y llevar ese aprendizaje a desafíos reales de su
          trabajo.
        </p>
        <Callout tone="warn" title="Postular no significa estar seleccionado/a.">
          Esta invitación es una oportunidad para postular. Si eres seleccionado/a, antes de comenzar aceptarás formalmente tu compromiso.
        </Callout>
        {wave.applicationDeadline && (
          <div className="card" style={{ marginTop: 14 }}>
            <div className="eyebrow">Deadline</div>
            <div className="kpi">Tienes hasta el {fmtDay(wave.applicationDeadline)} a las 12:00 hrs.</div>
          </div>
        )}
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn" onClick={() => setStarted(true)}>
            Comenzar mi postulación
          </button>
          <Link className="btn secondary" href="/programa">
            Conocer cómo funciona AI Edge Talent
          </Link>
        </div>
      </section>
      <section className="grid grid-3">
        <div className="card">
          <strong>1. Te identificas</strong>
          <p className="muted">Nombre, correo corporativo, cliente y rol.</p>
        </div>
        <div className="card">
          <strong>2. Conoces el compromiso</strong>
          <p className="muted">Qué se espera de ti, qué pone Kibernum y qué pone el cliente.</p>
        </div>
        <div className="card">
          <strong>3. Respondes el Assessment</strong>
          <p className="muted">Dentro de la plataforma, con ejemplos reales.</p>
        </div>
      </section>
    </div>
  );
}
