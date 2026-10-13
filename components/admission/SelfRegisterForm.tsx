"use client";

import { useActionState } from "react";
import { selfRegister } from "@/lib/admission/candidate-actions";
import { Callout } from "@/components/ui";
import Link from "next/link";
import { COMMUNITY_CONSENT } from "@/lib/data/consents";

export function SelfRegisterForm({ waveId }: { waveId: string }) {
  const [state, action, pending] = useActionState(selfRegister, null);
  if (state?.ok) {
    return (
      <div className="stack narrow">
        <Callout tone="ok" title="Ya tienes una postulación">
          {state.message}
        </Callout>
        <Link className="btn" href="/ingresar">Ir a ingresar</Link>
      </div>
    );
  }
  return (
    <form action={action} className="card narrow">
      <div className="eyebrow">Paso 1 · Identificación</div>
      <h1>Identifícate</h1>
      <p className="muted">Con tus datos pasas directo a las preguntas. Al enviar tu postulación te llega un correo con tus credenciales para seguir su estado desde tu portal. No solicitamos RUT.</p>
      <input type="hidden" name="wave" value={waveId} />
      <div className="field">
        <label htmlFor="full_name">Nombre completo *</label>
        <input id="full_name" name="full_name" type="text" required autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="corporate_email">Correo electrónico *</label>
        <input id="corporate_email" name="corporate_email" type="email" required autoComplete="email" aria-describedby="email-help" />
        <small id="email-help" className="muted">Utilizaremos este correo para enviarte información importante sobre tu participación en AI Edge Talent y el acceso a tu portal.</small>
      </div>
      <div className="field">
        <label htmlFor="phone">Teléfono *</label>
        <div className="phone-cl"><span aria-hidden="true">+56 9</span><input id="phone" name="phone" inputMode="numeric" pattern="[0-9 ]{8,9}" maxLength={9} required autoComplete="tel-national" placeholder="1234 5678" aria-describedby="phone-help" /></div>
        <small id="phone-help" className="muted">Ingresa los 8 dígitos después de +56 9.</small>
      </div>
      {[
        ["client_name", "Cliente en el que trabajas *", "text", "organization"],
        ["role_title", "Rol / cargo *", "text", "organization-title"],
        ["team", "Unidad / equipo (opcional)", "text", "off"],
      ].map(([name, label, type, ac]) => (
        <div className="field" key={name}>
          <label htmlFor={name}>{label}</label>
          <input id={name} name={name} type={type} required={label.endsWith("*")} autoComplete={ac} />
        </div>
      ))}
      <label className="consent">
        <input type="checkbox" name="community" value="1" />
        <span>
          {COMMUNITY_CONSENT.text} <span className="muted">(opcional)</span>
          <small className="muted">{COMMUNITY_CONSENT.detail}</small>
        </span>
      </label>
      {state && !state.ok && <p className="error" role="alert">{state.message}</p>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Un momento…" : "Continuar a la postulación"}
      </button>
    </form>
  );
}
