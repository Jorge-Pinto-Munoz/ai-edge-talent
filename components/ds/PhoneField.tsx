"use client";

import { useState } from "react";
import { DEFAULT_PREFIX, PHONE_PREFIXES, splitPhone } from "@/lib/identity/phone";

/**
 * Teléfono con prefijo de país (+56 por defecto) y número, con la misma altura y estilo que los demás campos.
 * Envía `name` como "+56 912345678" (el servidor lo normaliza a E.164). Controlado con value/onChange o autónomo.
 */
export function PhoneField({ id, name, label = "Teléfono", required = false, help, error, value, onChange, defaultValue }: {
  id: string; name?: string; label?: string; required?: boolean; help?: string; error?: string | null;
  value?: string; onChange?: (v: string) => void; defaultValue?: string | null;
}) {
  const init = splitPhone(value ?? defaultValue ?? null);
  const [prefix, setPrefix] = useState(init.prefix);
  const [number, setNumber] = useState(init.number);
  const emit = (p: string, n: string) => onChange?.(n.trim() ? `${p} ${n.trim()}` : "");
  const helpId = help ? `${id}-help` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className="field">
      <label htmlFor={id}>{label}{required ? " *" : <span className="muted"> (opcional)</span>}</label>
      <div className={`phone-field${error ? " has-error" : ""}`}>
        <select aria-label="Código de país" value={prefix} onChange={(e) => { setPrefix(e.target.value); emit(e.target.value, number); }}>
          {PHONE_PREFIXES.map(([p, c, iso]) => <option key={p} value={p} aria-label={`${c} ${p}`}>{iso} {p}</option>)}
        </select>
        <input
          id={id} type="tel" inputMode="tel" autoComplete="tel-national" required={required}
          placeholder={prefix === DEFAULT_PREFIX ? "9 1234 5678" : "Número"} value={number}
          onChange={(e) => { const n = e.target.value.replace(/[^\d\s-]/g, "").slice(0, 16); setNumber(n); emit(prefix, n); }}
          aria-describedby={[helpId, errId].filter(Boolean).join(" ") || undefined} aria-invalid={error ? true : undefined}
        />
      </div>
      {name && <input type="hidden" name={name} value={number.trim() ? `${prefix} ${number.trim()}` : ""} />}
      {help && <small id={helpId} className="muted">{help}</small>}
      {error && <small id={errId} className="error">{error}</small>}
    </div>
  );
}
