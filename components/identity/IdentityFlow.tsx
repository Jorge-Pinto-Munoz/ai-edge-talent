"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  checkTemporaryCode, forcedPinChange, loginWithPin, requestPinReset, setPinWithCode, requestAccount, verifyAdminStep, type FlowResult,
} from "@/lib/identity/actions";
import { Icon } from "@/components/site/Icon";
import { PUBLIC_REQUEST_ROLES, ROLE_LABEL } from "@/lib/identity/roles";

export type FlowMode = "ingresar" | "activar" | "restablecer" | "especial";
type Screen = "login" | "activate" | "set_pin" | "forgot" | "forgot_sent" | "change_pin" | "admin_code" | "create" | "create_done";

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

export function IdentityFlow({ initialMode, initialEmail, next }: { initialMode: FlowMode; initialEmail: string; next?: string }) {
  const router = useRouter();
  const start0: Screen = initialMode === "activar" || initialMode === "restablecer" ? "activate" : initialMode === "especial" ? "create" : "login";
  const [screen, setScreen] = useState<Screen>(start0);
  const [email, setEmail] = useState(initialEmail);
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [msg, setMsg] = useState<FlowResult | null>(null);
  const [pending, start] = useTransition();
  const go = (s: Screen) => { setScreen(s); setMsg(null); };

  const handle = (r: FlowResult) => {
    setMsg(r);
    if (!r.ok) {
      // Un código rechazado se borra para escribirlo de nuevo desde la primera casilla.
      if (screen === "set_pin" || screen === "change_pin") { setP1(""); setP2(""); }
      if (screen === "login") setPin("");
      return;
    }
    if (r.step === "done" && r.redirect) { router.replace(r.redirect); router.refresh(); return; }
    // Tras el cambio obligatorio, el segundo paso de administración valida con el código NUEVO.
    if (r.step === "admin_code") { if (screen === "change_pin") setPin(p1); setCode(""); setScreen("admin_code"); }
    if (r.step === "change_pin") { setP1(""); setP2(""); setScreen("change_pin"); }
    if (r.step === "set_pin") { setP1(""); setP2(""); setScreen("set_pin"); }
    if (r.step === "code_sent") { setCode(""); setScreen("forgot_sent"); }
  };
  const run = (f: () => Promise<FlowResult>) => start(async () => handle(await f()));
  const err = msg && !msg.ok ? (
    <p className="error" role="alert">
      {msg.message}
      {msg.linkFallback && <> Mientras tanto, <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}>ingresa con un enlace por correo</Link>.</>}
    </p>
  ) : null;
  const devNote = msg?.devCode ? <p className="auth-dev">Desarrollo: tu código es <strong>{msg.devCode}</strong> (en producción llega por correo).</p> : null;
  const emailField = (
    <div className="field">
      <label htmlFor="id-e">Correo electrónico</label>
      <input id="id-e" type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
    </div>
  );

  if (screen === "login") {
    return (
      <>
        <h1>Bienvenido nuevamente</h1>
        <p className="muted">Ingresa con tu correo y tu código personal de 4 dígitos.</p>
        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); run(() => loginWithPin(email, pin, next)); }}>
          {emailField}
          <Digits n={4} value={pin} onChange={setPin} label="Código personal" secret />
          {err}
          <button className="btn auth-btn" disabled={pending || pin.length !== 4}>{pending ? "Ingresando…" : "Ingresar"} <Icon name="arrowRight" size={18} /></button>
          <button type="button" className="link-btn auth-forgot" onClick={() => go("forgot")}>Olvidé mi código</button>
        </form>
        <div className="auth-new">
          <span>¿No tienes cuenta?</span>
          <button type="button" className="btn ghost auth-btn" onClick={() => go("create")}>Crear cuenta</button>
        </div>
      </>
    );
  }

  if (screen === "activate" || screen === "forgot_sent") {
    return (
      <>
        <h1>{screen === "forgot_sent" ? "Revisa tu correo" : "Activa tu espacio AI Edge Talent"}</h1>
        <p className="muted">{screen === "forgot_sent" ? msg?.message ?? "Te enviamos un código temporal." : "Ingresa tu correo y el código temporal de 4 dígitos que recibiste."}</p>
        {devNote}
        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); run(() => checkTemporaryCode(email, code)); }}>
          {emailField}
          <Digits n={4} value={code} onChange={setCode} label="Código temporal" autoFocus={!!email} />
          {err}
          <button className="btn auth-btn" disabled={pending || code.length !== 4}>{pending ? "Validando…" : "Continuar"} <Icon name="arrowRight" size={18} /></button>
          <div className="auth-links">
            <button type="button" className="link-btn" onClick={() => go("login")}>Ya tengo mi código personal</button>
            <button type="button" className="link-btn" onClick={() => go("forgot")}>Pedir un código nuevo</button>
          </div>
        </form>
      </>
    );
  }

  if (screen === "set_pin" || screen === "change_pin") {
    const forced = screen === "change_pin";
    return (
      <>
        <h1>Crea tu código personal</h1>
        <p className="muted">{forced ? "Por seguridad, debes crear un nuevo código antes de continuar." : "Elige 4 números que recuerdes. Evita secuencias (1234) o números repetidos (1111)."}</p>
        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); run(() => (forced ? forcedPinChange(email, pin, p1, p2, next) : setPinWithCode(email, code, p1, p2, next))); }}>
          <Digits n={4} value={p1} onChange={setP1} label="Nuevo código" secret autoFocus />
          <Digits n={4} value={p2} onChange={setP2} label="Confirmar código" secret />
          {err}
          <button className="btn auth-btn" disabled={pending || p1.length !== 4 || p2.length !== 4}>{pending ? "Guardando…" : "Guardar e ingresar"}</button>
        </form>
      </>
    );
  }

  if (screen === "admin_code") {
    return (
      <>
        <h1>Verificación de administración</h1>
        <p className="muted">{msg?.ok ? msg.message : "Te enviamos un código de 6 dígitos a tu correo."} Es un segundo paso obligatorio para cuentas de administración.</p>
        {devNote}
        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); run(() => verifyAdminStep(email, pin, code, next)); }}>
          <Digits n={6} value={code} onChange={setCode} label="Código de verificación" autoFocus />
          {err}
          <button className="btn auth-btn" disabled={pending || code.length !== 6}>{pending ? "Verificando…" : "Verificar e ingresar"}</button>
          <div className="auth-links"><button type="button" className="link-btn" onClick={() => run(() => loginWithPin(email, pin, next))}>Reenviar código</button></div>
        </form>
      </>
    );
  }

  if (screen === "forgot") {
    return (
      <>
        <h1>Olvidé mi código</h1>
        <p className="muted">Te enviaremos un código temporal a tu correo para crear uno nuevo. Tu código actual sigue funcionando hasta que lo cambies.</p>
        <form className="auth-form" onSubmit={(e) => { e.preventDefault(); run(() => requestPinReset(email)); }}>
          {emailField}
          {err}
          <button className="btn auth-btn" disabled={pending}>{pending ? "Enviando…" : "Enviar código temporal"}</button>
          <div className="auth-links"><button type="button" className="link-btn" onClick={() => go("login")}>Volver</button></div>
        </form>
      </>
    );
  }

  if (screen === "create_done") {
    return (
      <>
        <div className="help-done" role="status"><Icon name="check" size={26} /><div><strong>{msg?.message}</strong><p>Te escribiremos a {email}.</p></div></div>
        <div className="auth-alt"><button type="button" className="link-btn" onClick={() => go("login")}>Volver al ingreso</button></div>
      </>
    );
  }

  return <CreateAccount email={email} setEmail={setEmail} onDone={(r) => { setMsg(r); if (r.ok) setScreen("create_done"); }} onBack={() => go("login")} />;
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
        <div className="field">
          <label htmlFor="ca-p">Teléfono <span className="muted">(opcional)</span></label>
          <div className="phone-cl"><span aria-hidden="true">+56 9</span><input id="ca-p" inputMode="numeric" autoComplete="tel-national" placeholder="1234 5678" maxLength={9} value={f.phone} onChange={set("phone")} /></div>
        </div>
        <div className="field"><label htmlFor="ca-d">¿Algo que debamos saber? <span className="muted">(opcional)</span></label><textarea id="ca-d" rows={2} maxLength={2000} placeholder="Cliente, equipo o Wave en la que participas" value={f.note} onChange={set("note")} /></div>
        <div className="sr-only" aria-hidden="true"><input tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} /></div>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="btn auth-btn" disabled={pending || !f.role}>{pending ? "Enviando…" : "Enviar solicitud"}</button>
        <div className="auth-links"><button type="button" className="link-btn" onClick={onBack}>Ya tengo cuenta: ingresar</button></div>
      </form>
    </>
  );
}
