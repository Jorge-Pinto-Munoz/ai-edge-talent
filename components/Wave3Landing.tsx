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

  const start = LIVE
    ? <Link className="btn btn-lg" href={`/postular/registro?wave=${wave.id}`}>Comenzar postulación</Link>
    : <button className="btn btn-lg" onClick={() => setStarted(true)}>Comenzar postulación</button>;

  return (
    <div className="stack apply-page">
      <BrandHero
        image="trabajo-laptop"
        photoLeft
        eyebrow={wave.name}
        title="Postula a Wave 3 de AI Edge Talent"
        lead="El programa de Kibernum para profesionales TI que quieren integrar la inteligencia artificial a su rol: certificación, laboratorio con desafíos reales de su cliente y acompañamiento en cada etapa."
      >
        {wave.applicationDeadline && (
          <p className="apply-deadline">
            <span className="eyebrow">Postulaciones abiertas</span>
            <strong>Hasta el {fmtDay(wave.applicationDeadline)}, 12:00 del mediodía (hora de Chile).</strong>
          </p>
        )}
        <div className="apply-cta">
          {start}
          <p className="apply-alt">¿Ya comenzaste tu postulación? <Link href="/ingresar?modo=continuar&next=/mi-journey">Continuar aquí <span aria-hidden="true">→</span></Link></p>
        </div>
      </BrandHero>

      <section className="apply-sec" aria-labelledby="ap-how">
        <h2 id="ap-how">Cómo postular</h2>
        <p className="muted">Son cuatro pasos. Puedes hacerlo en varias veces: tus respuestas se guardan solas.</p>
        <ol className="apply-steps">
          <li><strong>Tus datos</strong><span>Nombre, correo, teléfono, cliente, rol y tu Delivery.</span></li>
          <li><strong>Verificas tu correo</strong><span>Te enviamos un código de 6 dígitos. Con tu correo entras siempre a tu portal, sin contraseñas.</span></li>
          <li><strong>Conoces el compromiso</strong><span>Qué se espera de ti, qué pone Kibernum y qué pone tu cliente.</span></li>
          <li><strong>Respondes el Assessment</strong><span>Preguntas sobre cómo usas la IA hoy, con ejemplos reales de tu trabajo.</span></li>
        </ol>
      </section>

      <div className="grid grid-2 apply-pair">
        <section className="card apply-sec" aria-labelledby="ap-after">
          <h2 id="ap-after">Qué pasa después de enviar</h2>
          <ul className="apply-list">
            <li>Te llega un correo de confirmación y puedes seguir el estado desde tu portal.</li>
            <li>El equipo revisa tu Assessment con apoyo de IA; la decisión la toma una persona.</li>
            <li>Después del cierre te contamos el resultado y el próximo paso, por correo y en tu portal.</li>
            <li>Si quedas bajo el corte, te pediremos un video breve: es una segunda oportunidad.</li>
          </ul>
          <Callout tone="warn" title="Postular no significa estar seleccionado/a.">Si eres seleccionado/a, antes de comenzar aceptarás formalmente tu compromiso.</Callout>
        </section>
        <section className="card apply-sec" aria-labelledby="ap-resume">
          <h2 id="ap-resume">¿Empezaste y no terminaste?</h2>
          <p>Tu avance queda guardado. Ingresa con el mismo correo, te enviamos un código y retomas en la primera pregunta pendiente.</p>
          <p><Link href="/ingresar?modo=continuar&next=/mi-journey">Continuar mi postulación <span aria-hidden="true">→</span></Link></p>
          <p className="muted">¿Quieres saber más antes de postular? <Link href="/programa">Conoce cómo funciona AI Edge Talent</Link>.</p>
        </section>
      </div>
    </div>
  );
}
