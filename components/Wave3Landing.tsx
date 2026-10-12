"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store/StoreProvider";
import { getWave } from "@/lib/store/state";
import { ApplicationFlow } from "./ApplicationFlow";
import { BrandHero, Callout, fmtDay } from "./ui";

/** Con Supabase configurado, la postulación es real (formulario propio + base de datos); si no, demo local. */
const LIVE = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export function Wave3Landing() {
  const { state, hydrated } = useStore();
  const wave = getWave(state, "wave-3");
  const resuming = hydrated && state.applications.some((a) => a.id === state.session.currentApplicationId && a.waveId === wave.id);
  const [started, setStarted] = useState(false);

  if (!LIVE && (started || resuming)) return <ApplicationFlow waveId={wave.id} />;

  return (
    <div className="stack">
      <BrandHero
        image="trabajo-laptop"
        photoLeft
        eyebrow={wave.name}
        title="Postula a Wave 3 de AI Edge Talent"
        lead="Una experiencia para profesionales TI que quieren integrar inteligencia artificial de manera más profunda a su rol y llevar ese aprendizaje a desafíos reales de su trabajo."
      >
        <Callout tone="warn" title="Postular no significa estar seleccionado/a.">
          Si eres seleccionado/a, antes de comenzar aceptarás formalmente tu compromiso.
        </Callout>
        {wave.applicationDeadline && (
          <p className="kicker" style={{ marginTop: 16 }}>
            <span className="eyebrow" style={{ display: "block", marginBottom: 2 }}>Deadline</span>
            <strong style={{ color: "#fff", fontSize: "1.15rem" }}>Tienes hasta el {fmtDay(wave.applicationDeadline)} a las 12:00 hrs.</strong>
          </p>
        )}
        <div className="row" style={{ marginTop: 16 }}>
          {LIVE ? (
            <Link className="btn" href={`/postular/registro?wave=${wave.id}`}>
              Comenzar mi postulación
            </Link>
          ) : (
            <button className="btn" onClick={() => setStarted(true)}>
              Comenzar mi postulación
            </button>
          )}
          <Link className="btn secondary" href="/programa">
            Conocer cómo funciona AI Edge Talent
          </Link>
        </div>
      </BrandHero>
      <section className="grid grid-3">
        <div className="card signal">
          <strong>1. Te identificas</strong>
          <p className="muted">Nombre, correo corporativo, cliente y rol.</p>
        </div>
        <div className="card signal">
          <strong>2. Conoces el compromiso</strong>
          <p className="muted">Qué se espera de ti, qué pone Kibernum y qué pone el cliente.</p>
        </div>
        <div className="card signal">
          <strong>3. Respondes el Assessment</strong>
          <p className="muted">Dentro de la plataforma, con ejemplos reales.</p>
        </div>
      </section>
    </div>
  );
}
