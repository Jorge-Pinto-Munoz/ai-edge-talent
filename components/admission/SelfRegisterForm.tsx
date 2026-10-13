"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { selfRegister } from "@/lib/admission/candidate-actions";
import { requestLoginCode, verifyLoginCode } from "@/lib/identity/actions";
import { COMMUNITY_CONSENT } from "@/lib/data/consents";
import { PhoneField } from "@/components/ds/PhoneField";
import { CodeInput } from "@/components/identity/IdentityFlow";

/**
 * Postulación · paso 1 (tus datos) y paso 2 (verificar tu correo con un código de 6 dígitos). Al verificar entras a
 * tu portal y sigues con la postulación; si ya la habías empezado, la retomas donde quedaste.
 */
export function SelfRegisterForm({ waveId, deliveries }: { waveId: string; deliveries: { email: string; name: string }[] }) {
  const [state, action, pending] = useActionState(selfRegister, null);
  if (state?.ok && state.step === "verify" && state.email) return <VerifyEmail email={state.email} initialWait={state.waitS ?? 45} />;
  return (
    <form action={action} className="card narrow reg-card">
      <ol className="reg-steps" aria-label="Pasos de la postulación">
        <li className="on" aria-current="step">Tus datos</li>
        <li>Verifica tu correo</li>
        <li>Assessment</li>
      </ol>
      <h1>Tus datos</h1>
      <p className="muted">Con estos datos te identificamos y te asignamos a tu Delivery. No solicitamos RUT.</p>
      <input type="hidden" name="wave" value={waveId} />
      <div className="field">
        <label htmlFor="full_name">Nombre completo *</label>
        <input id="full_name" name="full_name" type="text" required autoComplete="name" />
      </div>
      <div className="field">
        <label htmlFor="corporate_email">Correo electrónico *</label>
        <input id="corporate_email" name="corporate_email" type="email" required autoComplete="email" inputMode="email" aria-describedby="email-help" />
        <small id="email-help" className="muted">Te enviaremos un código para verificarlo. Con este correo entras a tu portal.</small>
      </div>
      <PhoneField id="phone" name="phone" required help="En Chile, tu celular de 9 dígitos." />
      <div className="field">
        <label htmlFor="client_name">Cliente en el que trabajas *</label>
        <input id="client_name" name="client_name" type="text" required autoComplete="organization" />
      </div>
      <div className="field">
        <label htmlFor="role_title">Rol / cargo *</label>
        <input id="role_title" name="role_title" type="text" required autoComplete="organization-title" />
      </div>
      <div className="field">
        <label htmlFor="team">Unidad / equipo <span className="muted">(opcional)</span></label>
        <input id="team" name="team" type="text" autoComplete="off" />
      </div>
      <div className="field">
        <label htmlFor="delivery">Tu Delivery *</label>
        <select id="delivery" name="delivery" required defaultValue="" aria-describedby="delivery-help">
          <option value="" disabled>Elige a tu Delivery</option>
          {deliveries.map((d) => <option key={d.email} value={d.email}>{d.name}</option>)}
          <option value="none">No lo sé</option>
        </select>
        <small id="delivery-help" className="muted">La persona de Kibernum que te acompaña en tu cliente. Te acompañará también en el programa.</small>
      </div>
      <label className="consent">
        <input type="checkbox" name="community" value="1" />
        <span>
          {COMMUNITY_CONSENT.text} <span className="muted">(opcional)</span>
          <small className="muted">{COMMUNITY_CONSENT.detail}</small>
        </span>
      </label>
      {state && !state.ok && <p className="error" role="alert">{state.message}</p>}
      <button className="btn btn-lg" type="submit" disabled={pending}>
        {pending ? "Enviando código…" : "Continuar"}
      </button>
      <p className="reg-alt">¿Ya comenzaste tu postulación? <Link href="/ingresar?modo=continuar&next=/mi-journey">Continuar aquí →</Link></p>
    </form>
  );
}

function VerifyEmail({ email, initialWait }: { email: string; initialWait: number }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [wait, setWait] = useState(initialWait);
  const [pending, start] = useTransition();
  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);
  const verify = (c = code) => start(async () => {
    const r = await verifyLoginCode(email, c, "/mi-journey");
    if (r.ok && r.redirect) { router.replace(r.redirect); router.refresh(); return; }
    setMsg(r);
    setCode("");
  });
  return (
    <form className="card narrow reg-card" onSubmit={(e) => { e.preventDefault(); verify(); }}>
      <ol className="reg-steps" aria-label="Pasos de la postulación">
        <li className="done">Tus datos</li>
        <li className="on" aria-current="step">Verifica tu correo</li>
        <li>Assessment</li>
      </ol>
      <h1>Verifica tu correo</h1>
      <p className="muted">Te enviamos un código de 6 dígitos a <strong>{email}</strong>. Vence en 10 minutos.</p>
      <CodeInput value={code} onChange={setCode} onComplete={(v) => verify(v)} />
      {msg && !msg.ok && <p className="error" role="alert">{msg.message}</p>}
      {msg?.ok && <p className="uc-ok" role="status">{msg.message}</p>}
      <button className="btn btn-lg" disabled={pending || code.length !== 6}>{pending ? "Verificando…" : "Verificar y continuar"}</button>
      <div className="auth-links">
        <button type="button" className="link-btn" disabled={pending || wait > 0} onClick={() => start(async () => { const r = await requestLoginCode(email); setMsg(r.ok ? { ok: true, message: "Te enviamos un código nuevo." } : r); setWait(r.waitS ?? 45); })}>{wait > 0 ? `Reenviar código en ${wait} s` : "Reenviar código"}</button>
      </div>
      <p className="auth-hint muted">¿No llega? Revisa spam o la cuarentena de tu correo corporativo.</p>
    </form>
  );
}
