"use client";

import { useActionState } from "react";
import { sendMagicLink } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(sendMagicLink, null);
  return (
    <form action={action} className="card">
      <input type="hidden" name="next" value={next} />
      <div className="field">
        <label htmlFor="email">Correo</label>
        <input id="email" name="email" type="email" required autoComplete="email" placeholder="nombre@kibernum.com" />
      </div>
      {state && <p className={state.ok ? "" : "error"} role="status">{state.message}</p>}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Enviando…" : "Enviarme el enlace"}
      </button>
    </form>
  );
}
