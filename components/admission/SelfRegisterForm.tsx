"use client";

import { useActionState } from "react";
import { selfRegister } from "@/lib/admission/candidate-actions";
import { Callout } from "@/components/ui";

export function SelfRegisterForm({ waveId }: { waveId: string }) {
  const [state, action, pending] = useActionState(selfRegister, null);
  if (state?.ok) {
    return (
      <div className="stack narrow">
        <Callout tone="ok" title="Revisa tu correo">
          {state.message}
        </Callout>
        <p className="muted">El enlace es personal: te permite retomar tu postulación cuando quieras hasta el cierre del plazo.</p>
      </div>
    );
  }
  return (
    <form action={action} className="card narrow">
      <div className="eyebrow">Paso 1 · Identificación</div>
      <h1>Identifícate</h1>
      <p className="muted">Te enviaremos un enlace personal a tu correo corporativo para continuar. No solicitamos RUT.</p>
      <input type="hidden" name="wave" value={waveId} />
      {[
        ["full_name", "Nombre completo *", "text", "name"],
        ["corporate_email", "Correo corporativo *", "email", "email"],
        ["client_name", "Cliente en el que trabajas *", "text", "organization"],
        ["role_title", "Rol / cargo *", "text", "organization-title"],
        ["team", "Unidad / equipo (opcional)", "text", "off"],
      ].map(([name, label, type, ac]) => (
        <div className="field" key={name}>
          <label htmlFor={name}>{label}</label>
          <input id={name} name={name} type={type} required={label.endsWith("*")} autoComplete={ac} />
        </div>
      ))}
      {state && !state.ok && <p className="error" role="alert">{state.message}</p>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Recibir mi enlace de postulación"}
      </button>
    </form>
  );
}
