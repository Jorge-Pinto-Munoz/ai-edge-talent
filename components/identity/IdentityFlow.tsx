"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { loginDemo, requestAccount, requestLoginCode, verifyLoginCode, type FlowResult } from "@/lib/identity/actions";
import { Icon } from "@/components/site/Icon";
import { PUBLIC_REQUEST_ROLES, ROLE_LABEL } from "@/lib/identity/roles";
import { suggestEmail } from "@/lib/identity/email-typo";
import { PhoneField } from "@/components/ds/PhoneField";

export type FlowMode = "ingresar" | "activar" | "restablecer" | "especial" | "continuar";
type Screen = "email" | "code" | "demo" | "create" | "create_done";

/** Casillas de dígitos: una por número, pegar el código completo funciona; `secret` oculta los números. */
function Digits({ n, value, onChange, label, secret = false, autoFocus = false, onComplete, aside }: { n: 4 | 6; value: string; onChange: (v: string) => void; label: string; secret?: boolean; autoFocus?: boolean; onComplete?: (v: string) => void; aside?: React.ReactNode }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const set = (i: number, raw: string) => {
    let only = raw.replace(/\D/g, "");
    // Escribir sobre una casilla ya llena (la primera admite pegar el código completo): queda el dígito nuevo.
    if (only.length === 2 && value[i] && only.startsWith(value[i])) only = only.slice(1);
    if (only.length > 1) {
      const v = only.slice(0, n);
      onChange(v);
      refs.current[Math.min(v.length, n - 1)]?.focus();
      if (v.length === n) onComplete?.(v);
      return;
    }
    // Sin huecos: borrar una casilla descarta las siguientes (si no, los dígitos se correrían y se guardaría otro código);
    // escribir más allá del último dígito lo agrega al final.
    const v = !only ? value.slice(0, i) : i >= value.length ? (value + only).slice(0, n) : (value.slice(0, i) + only + value.slice(i + 1)).slice(0, n);
    onChange(v);
    if (only && v.length < n) refs.current[v.length]?.focus();
    if (v.length === n) onComplete?.(v);
  };
  return (
    <fieldset className="otp">
      <legend>{label}</legend>
      {aside && <div className="otp-aside">{aside}</div>}
      <div className={`otp-boxes n${n}`}>
        {Array.from({ length: n }, (_, i) => (
          <input key={i} ref={(el) => { refs.current[i] = el; }} aria-label={`${label}: dígito ${i + 1}`} inputMode="numeric" pattern="[0-9]*"
            type={secret ? "password" : "text"} autoComplete={i === 0 && !secret ? "one-time-code" : "off"} autoFocus={autoFocus && i === 0}
            maxLength={i === 0 ? n : 1} value={value[i] ?? ""} onChange={(e) => set(i, e.target.value)}
            onKeyDown={(e) => { if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus(); }} />
        ))}
      </div>
    </fieldset>
  );
}

/** Código de 6 dígitos (ingreso y verificación de correo). */
export function CodeInput({ value, onChange, onComplete }: { value: string; onChange: (v: string) => void; onComplete?: (v: string) => void }) {
  return <Digits n={6} value={value} onChange={onChange} label="Código de acceso" autoFocus onComplete={onComplete} />;
}

export function IdentityFlow({ initialMode, initialEmail, next }: { initialMode: FlowMode; initialEmail: string; next?: string }) {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>(initialMode === "especial" ? "create" : "email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<FlowResult | null>(null);
  const [wait, setWait] = useState(0);
  const [pending, start] = useTransition();
  const go = (s: Screen) => { setScreen(s); setMsg(null); };
  const continuing = initialMode === "continuar";

  // Cuenta regresiva para volver a pedir un código.
  useEffect(() => {
    if (wait <= 0) return;
    const t = window.setTimeout(() => setWait((w) => w - 1), 1000);
    return () => window.clearTimeout(t);
  }, [wait]);

  const send = () => start(async () => {
    const r = await requestLoginCode(email);
    setMsg(r);
    if (!r.ok) return;
    if (r.step === "demo") { setScreen("demo"); return; }
    setCode("");
    setWait(r.waitS ?? 45);
    setScreen("code");
  });
  const verify = (c = code) => start(async () => {
    const r = await verifyLoginCode(email, c, next);
    setMsg(r);
    if (r.ok && r.redirect) { router.replace(r.redirect); router.refresh(); return; }
    setCode(""); // un código rechazado se borra para escribirlo de nuevo desde la primera casilla
  });
  const err = msg && !msg.ok ? <p className="error" role="alert">{msg.message}</p> : null;
  const fix = suggestEmail(email);
  const emailField = (
    <div className="field">
      <label htmlFor="id-e">Correo electrónico</label>
      <input id="id-e" type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus={!email} />
      {fix && <small className="auth-typo" role="status">¿Quisiste decir <button type="button" className="link-btn" onClick={() => setEmail(fix)}>{fix}</button>?</small>}
    </div>
  );

  if (screen === "email") {
    return (
      <>
        <h1>{continuing ? "Continúa tu postulación" : "Ingresa a AI Edge Talent"}</h1>
        <p className="muted">{continuing ? "Escribe el correo con el que te registraste. Te enviaremos un código de 6 dígitos y retomas donde quedaste." : "Escribe tu correo. Te enviaremos un código de 6 dígitos para ingresar: no necesitas contraseña."}</p>
        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
          {emailField}
          {err}
          <button className="btn auth-btn" disabled={pending || !email}>{pending ? "Enviando…" : "Enviar código"} <Icon name="arrowRight" size={18} /></button>
        </form>
        {!continuing && (
          <div className="auth-new">
            <span>¿No tienes cuenta?</span>
            <button type="button" className="btn ghost auth-btn" onClick={() => go("create")}>Crear cuenta</button>
          </div>
        )}
      </>
    );
  }

  if (screen === "code") {
    return (
      <>
        <h1>Revisa tu correo</h1>
        <p className="muted">Si <strong>{email}</strong> está registrado, te enviamos un código de 6 dígitos. Vence en 10 minutos y sirve una sola vez.</p>
        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); verify(); }}>
          <Digits n={6} value={code} onChange={setCode} label="Código de acceso" autoFocus onComplete={(v) => verify(v)} />
          {err}
          <button className="btn auth-btn" disabled={pending || code.length !== 6}>{pending ? "Verificando…" : "Ingresar"} <Icon name="arrowRight" size={18} /></button>
          <div className="auth-links">
            <button type="button" className="link-btn" disabled={pending || wait > 0} onClick={send} aria-live="polite">{wait > 0 ? `Reenviar código en ${wait} s` : "Reenviar código"}</button>
            <button type="button" className="link-btn" onClick={() => { setCode(""); go("email"); }}>Usar otro correo</button>
          </div>
          <p className="auth-hint muted">¿No llega? Revisa spam o la cuarentena de tu correo corporativo.</p>
        </form>
      </>
    );
  }

  if (screen === "demo") {
    return (
      <>
        <h1>Cuenta de demostración</h1>
        <p className="muted">Es una cuenta ficticia de solo lectura: ves la plataforma como ese profesional, sin enviar nada.</p>
        <div className="auth-form">
          {err}
          <button type="button" className="btn auth-btn" disabled={pending} onClick={() => start(async () => { const r = await loginDemo(email, next); setMsg(r); if (r.ok && r.redirect) { router.replace(r.redirect); router.refresh(); } })}>{pending ? "Entrando…" : "Entrar a la demostración"}</button>
          <div className="auth-links"><button type="button" className="link-btn" onClick={() => go("email")}>Usar otro correo</button></div>
        </div>
      </>
    );
  }

  if (screen === "create_done") {
    return (
      <>
        <div className="help-done" role="status"><Icon name="check" size={26} /><div><strong>{msg?.message}</strong><p>Te escribiremos a {email}.</p></div></div>
        <div className="auth-alt"><button type="button" className="link-btn" onClick={() => go("email")}>Volver al ingreso</button></div>
      </>
    );
  }

  return <CreateAccount email={email} setEmail={setEmail} onDone={(r) => { setMsg(r); if (r.ok) setScreen("create_done"); }} onBack={() => go("email")} />;
}

function CreateAccount({ email, setEmail, onDone, onBack }: { email: string; setEmail: (v: string) => void; onDone: (r: FlowResult) => void; onBack: () => void }) {
  const [f, setF] = useState({ name: "", phone: "", role: "", note: "", website: "" });
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <>
      <h1>Crear cuenta</h1>
      <p className="muted">Cuéntanos quién eres. El Líder de producto revisa tu solicitud y te llega un correo para activar tu cuenta.</p>
      <form className="auth-form" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await requestAccount({ ...f, email }); if (!r.ok) setErr(r.message); onDone(r); }); }}>
        <div className="field"><label htmlFor="ca-n">Nombre completo</label><input id="ca-n" required autoComplete="name" value={f.name} onChange={set("name")} /></div>
        <div className="field"><label htmlFor="ca-e">Correo electrónico</label><input id="ca-e" type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field"><label htmlFor="ca-r">Participas como</label>
          <select id="ca-r" required value={f.role} onChange={set("role")} aria-describedby="ca-r-h">
            <option value="" disabled>Elige una opción</option>
            {PUBLIC_REQUEST_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          <small id="ca-r-h" className="muted">Las cuentas de Delivery, Hub AI, AI Coach y Líder de producto las crea el administrador de la plataforma.</small>
        </div>
        <PhoneField id="ca-p" value={f.phone} onChange={(v) => setF((x) => ({ ...x, phone: v }))} />
        <div className="field"><label htmlFor="ca-d">¿Algo que debamos saber? <span className="muted">(opcional)</span></label><textarea id="ca-d" rows={2} maxLength={2000} placeholder="Cliente, equipo o Wave en la que participas" value={f.note} onChange={set("note")} /></div>
        <div className="sr-only" aria-hidden="true"><input tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} /></div>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="btn auth-btn" disabled={pending || !f.role}>{pending ? "Enviando…" : "Enviar solicitud"}</button>
        <div className="auth-links"><button type="button" className="link-btn" onClick={onBack}>Ya tengo cuenta: ingresar</button></div>
      </form>
    </>
  );
}
