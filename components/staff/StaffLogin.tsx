"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestStaffCode, verifyStaffCode, type CodeResult } from "@/lib/staff/actions";
import { Icon } from "@/components/site/Icon";

/** Ingreso del equipo en dos pasos: correo → código de 4 dígitos (una casilla por número, pegar funciona). */
export function StaffLogin({ next }: { next: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [msg, setMsg] = useState<CodeResult | null>(null);
  const [pending, start] = useTransition();
  const [cool, setCool] = useState(0);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cool <= 0) return;
    const t = setTimeout(() => setCool((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cool]);

  const ask = () =>
    start(async () => {
      const r = await requestStaffCode(email);
      setMsg(r);
      if (r.ok) {
        setStep("code");
        setDigits(["", "", "", ""]);
        setCool(45);
        setTimeout(() => boxes.current[0]?.focus(), 50);
      }
    });

  const verify = (code: string) =>
    start(async () => {
      const r = await verifyStaffCode(email, code);
      if (r.ok) {
        setMsg({ ok: true, message: "Código correcto. Entrando…" });
        router.replace(next);
        router.refresh();
      } else {
        setMsg(r);
        setDigits(["", "", "", ""]);
        boxes.current[0]?.focus();
      }
    });

  const setDigit = (i: number, raw: string) => {
    const only = raw.replace(/\D/g, "");
    if (only.length > 1) {
      // Pegó el código completo.
      const d = only.slice(0, 4).split("");
      const full = [0, 1, 2, 3].map((k) => d[k] ?? "");
      setDigits(full);
      if (full.every(Boolean)) verify(full.join(""));
      else boxes.current[Math.min(d.length, 3)]?.focus();
      return;
    }
    const nextDigits = digits.map((x, k) => (k === i ? only : x));
    setDigits(nextDigits);
    if (only && i < 3) boxes.current[i + 1]?.focus();
    if (nextDigits.every(Boolean)) verify(nextDigits.join(""));
  };

  if (step === "email") {
    return (
      <form className="auth-form" onSubmit={(e) => { e.preventDefault(); ask(); }}>
        <div className="field">
          <label htmlFor="se">Correo corporativo</label>
          <input id="se" type="email" required autoComplete="email" inputMode="email" placeholder="nombre@kibernum.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {msg && !msg.ok && <p className="error" role="alert">{msg.message}</p>}
        <button className="btn auth-btn" disabled={pending}>{pending ? "Enviando…" : "Enviar código"} <Icon name="arrowRight" size={18} /></button>
      </form>
    );
  }

  return (
    <form className="auth-form" onSubmit={(e) => { e.preventDefault(); if (digits.every(Boolean)) verify(digits.join("")); }}>
      <p className="auth-sent" role="status"><Icon name="send" size={18} /> <span>{msg?.ok ? msg.message : `Código enviado a ${email}.`}</span></p>
      {msg?.devCode && <p className="auth-dev">Desarrollo: tu código es <strong>{msg.devCode}</strong> (en producción llega por correo).</p>}
      <fieldset className="otp" disabled={pending}>
        <legend>Código de 4 dígitos</legend>
        <div className="otp-boxes">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { boxes.current[i] = el; }}
              aria-label={`Dígito ${i + 1}`}
              inputMode="numeric"
              autoComplete={i === 0 ? "one-time-code" : "off"}
              pattern="[0-9]*"
              maxLength={i === 0 ? 4 : 1}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Backspace" && !d && i > 0) boxes.current[i - 1]?.focus(); }}
            />
          ))}
        </div>
      </fieldset>
      {msg && !msg.ok && <p className="error" role="alert">{msg.message}</p>}
      <button className="btn auth-btn" disabled={pending || !digits.every(Boolean)}>{pending ? "Validando…" : "Ingresar"}</button>
      <div className="auth-links">
        <button type="button" className="link-btn" onClick={() => { setStep("email"); setMsg(null); }}>Cambiar correo</button>
        <button type="button" className="link-btn" disabled={cool > 0 || pending} onClick={ask}>{cool > 0 ? `Reenviar código en ${cool} s` : "Reenviar código"}</button>
      </div>
    </form>
  );
}
