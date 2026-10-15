"use client";

import { useRef, useState } from "react";
import { Icon, type IconName } from "@/components/site/Icon";

/** Lo que se espera de la persona en cada una de las 5 etapas. */
const STAGES: { n: number; name: string; icon: IconName; summary: string; expect: string[] }[] = [
  { n: 1, name: "Assessment", icon: "target", summary: "Nos cuentas cómo usas IA hoy.", expect: ["Responde con experiencias reales de tu trabajo.", "Envía tu postulación dentro del plazo.", "Una persona del equipo revisa y decide."] },
  { n: 2, name: "AI First Mindset", icon: "brain", summary: "Cambias la forma de abordar tu trabajo con IA.", expect: ["Es obligatoria: no se puede saltar.", "Completa el reto y sus entregables a tiempo.", "Responde el pulso de cierre de la etapa."] },
  { n: 3, name: "Role Enablement · AI CERT", icon: "badge", summary: "Te certificas en IA para tu rol.", expect: ["Asiste a las clases con tu AI Coach (obligatorio).", "Avanza en los contenidos AI CERT al ritmo acordado.", "Tienes 2 intentos para certificarte.", "Debes estar certificado/a antes de pasar al AI Lab."] },
  { n: 4, name: "AI Lab & Showcase", icon: "flask", summary: "Aplicas IA a un caso real y lo presentas.", expect: ["Trabaja en equipo en un desafío real.", "Asiste a las clases del Lab.", "Presenta tu resultado en el Showcase."] },
  { n: 5, name: "Cierre", icon: "flag", summary: "Cierras el ciclo y defines tus próximos pasos.", expect: ["Completa el pulso final.", "Acuerda con tu Delivery cómo seguir aplicando lo aprendido."] },
];

/** Compromisos que aplican a todo el ciclo. */
const GENERAL: { icon: IconName; title: string; text: string }[] = [
  { icon: "clock", title: "Sin afectar a tu cliente", text: "El programa no debe restar horas comprometidas con tu cliente." },
  { icon: "route", title: "Proceso completo", text: "Te comprometes a terminar todo el journey, no solo la certificación." },
  { icon: "check", title: "Plazos", text: "Cada etapa tiene hitos y fechas; la continuidad depende de cumplirlos." },
  { icon: "spark", title: "Aprendizaje autónomo", text: "Gran parte del avance depende de tu iniciativa entre clases." },
  { icon: "chat", title: "Comunicación", text: "Si algo cambia, avisa a tu Delivery a tiempo." },
];

export function StageSlider() {
  const track = useRef<HTMLOListElement>(null);
  const [at, setAt] = useState(0);
  const go = (i: number) => {
    const el = track.current?.children[i] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  };
  const onScroll = () => {
    const t = track.current;
    if (!t) return;
    const w = (t.children[0] as HTMLElement | undefined)?.offsetWidth ?? 1;
    setAt(Math.round(t.scrollLeft / (w + 16)));
  };
  return (
    <section className="pa-sec" aria-labelledby="pa-stages">
      <div className="pa-sec-head">
        <div>
          <h2 id="pa-stages">Lo que se espera de ti en cada etapa</h2>
          <p className="muted">5 etapas. Desliza para verlas.</p>
        </div>
        <div className="pa-nav">
          <button type="button" aria-label="Etapa anterior" disabled={at <= 0} onClick={() => go(Math.max(0, at - 1))}><Icon name="arrowLeft" size={18} /></button>
          <button type="button" aria-label="Etapa siguiente" disabled={at >= STAGES.length - 1} onClick={() => go(Math.min(STAGES.length - 1, at + 1))}><Icon name="arrowRight" size={18} /></button>
        </div>
      </div>
      <ol className="pa-track" ref={track} onScroll={onScroll}>
        {STAGES.map((s) => (
          <li key={s.n} className="pa-stage" aria-label={`Etapa ${s.n} de 5: ${s.name}`}>
            <span className="pa-ico"><Icon name={s.icon} size={22} /></span>
            <span className="pa-n">Etapa {s.n} de 5</span>
            <h3>{s.name}</h3>
            <p className="muted">{s.summary}</p>
            <ul>{s.expect.map((e) => <li key={e}>{e}</li>)}</ul>
          </li>
        ))}
      </ol>
      <div className="pa-dots" aria-hidden="true">
        {STAGES.map((s, i) => <button key={s.n} type="button" tabIndex={-1} className={i === at ? "on" : ""} onClick={() => go(i)} />)}
      </div>
    </section>
  );
}

export function GeneralCommitments() {
  return (
    <section className="pa-sec" aria-labelledby="pa-general">
      <div className="pa-sec-head">
        <div>
          <h2 id="pa-general">Compromisos durante todo el ciclo</h2>
        </div>
      </div>
      <ul className="pa-general">
        {GENERAL.map((g) => (
          <li key={g.title}>
            <span className="pa-ico sm"><Icon name={g.icon} size={18} /></span>
            <div><strong>{g.title}</strong><p className="muted">{g.text}</p></div>
          </li>
        ))}
      </ul>
    </section>
  );
}
