"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store/StoreProvider";
import { getWave } from "@/lib/store/state";
import { ApplicationFlow } from "./ApplicationFlow";
import { LifecycleRail } from "./journey";
import { BrandHero, Callout, fmtDeadline } from "./ui";

/**
 * Ruta individual /apply/[token]. El token identifica la invitación (no contiene datos personales).
 * Explica el programa ANTES del formulario. Nominación ≠ aceptación automática: la persona decide postular.
 */
export function ApplyByInvitation({ token }: { token: string }) {
  const { state, hydrated } = useStore();
  const [started, setStarted] = useState(false);
  const nomination = state.nominations.find((n) => n.invitationToken === token && n.status === "INVITED");

  if (!hydrated) return <p className="muted">Cargando invitación…</p>;
  if (!nomination) {
    return (
      <Callout tone="bad" title="Invitación no válida">
        Este enlace no corresponde a una invitación activa. Si crees que es un error, contacta a tu Delivery. También puedes revisar <Link href="/programa">el programa</Link>.
      </Callout>
    );
  }
  const wave = getWave(state, nomination.waveId);
  if (started) return <ApplicationFlow waveId={wave.id} nomination={nomination} />;

  const first = nomination.nomineeName.split(" ")[0];
  return (
    <div className="stack">
      <BrandHero
        image="colaboracion"
        eyebrow={`${wave.name} · Invitación personal`}
        title={`${first}, te invitamos a postular a AI Edge Talent`}
        lead={`Queremos invitarte a postular a ${wave.name.replace("AI Edge Talent · ", "")} de AI Edge Talent, una experiencia de desarrollo diseñada para profesionales TI que quieren integrar inteligencia artificial de manera más profunda a su rol, desarrollar criterio y llevar ese aprendizaje a desafíos reales de su trabajo.`}
      >
        <Callout tone="warn" title="Esta invitación no significa que ya estés seleccionado/a.">
          Fuiste nominado/a porque tu cliente y Delivery ven una oportunidad real de aplicación. Postular es tu decisión.
        </Callout>
      </BrandHero>

      <div className="card">
        <h3>¿Por qué fuiste invitado/a?</h3>
        <p className="muted">Oportunidad de aplicación identificada: {nomination.applicationOpportunity}</p>
      </div>
      <div className="card">
        <h3>El journey</h3>
        <LifecycleRail only={["ASSESSMENT", "MINDSET", "AI_CERTS", "AI_LAB", "SHOWCASE", "CLOSURE"]} />
      </div>
      <div className="grid grid-2">
        <div className="card">
          <h3>Duración y dedicación</h3>
          <ul>
            <li>De 30 a 45 días según tu ritmo.</li>
            <li>Normalmente 2–3 h/semana dentro de jornada, coordinadas con tu cliente según etapa.</li>
            <li>Además: estudio, práctica y avance autónomo.</li>
          </ul>
        </div>
        <div className="card">
          <h3>Selección y continuidad</h3>
          <ul>
            <li>El Assessment evalúa la calidad de tu evidencia.</li>
            <li>Si eres seleccionado/a, aceptas un compromiso antes de inscribirte.</li>
            <li>Cada etapa tiene gates y reglas de continuidad conocidas de antemano.</li>
          </ul>
        </div>
      </div>
      <div className="card">
        <h3>Tus responsabilidades</h3>
        <p className="muted">
          Responder personalmente, cumplir hitos, participar en acompañamientos, cuidar la confidencialidad del cliente y comunicar bloqueos a tiempo.{" "}
          <Link href="/programa">Ver detalle</Link>.
        </p>
      </div>
      {wave.applicationDeadline && (
        <p>
          <strong>Deadline:</strong> {fmtDeadline(wave.applicationDeadline)}
        </p>
      )}
      <div className="row">
        <button className="btn" onClick={() => setStarted(true)}>
          Quiero postular
        </button>
        <Link className="btn ghost" href="/programa">
          Conocer más del programa
        </Link>
      </div>
    </div>
  );
}
