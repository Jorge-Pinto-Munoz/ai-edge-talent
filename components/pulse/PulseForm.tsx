"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PulseDef, Question } from "@/lib/pulse/definitions";
import { submitPulse, type PulseResult } from "@/lib/pulse/actions";
import { Icon } from "@/components/site/Icon";

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/** Formulario de un pulso: escalas como botones grandes, una pregunta por bloque. `preview` lo muestra sin enviar. */
export function PulseForm({ def, waveId, preview = false, onDone }: { def: PulseDef; waveId: string; preview?: boolean; onDone?: () => void }) {
  const [a, setA] = useState<Record<string, string | number | boolean>>({});
  const [res, setRes] = useState<PulseResult | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (id: string, v: string | number | boolean) => setA((x) => ({ ...x, [id]: v }));
  const required = def.questions.filter((q) => !q.optional);
  const filled = (q: Question) => a[q.id] !== undefined && a[q.id] !== "" && !(q.type === "text" && q.minLength && String(a[q.id]).trim().length < q.minLength);
  const done = required.filter(filled).length;

  if (res?.ok) {
    return (
      <div className="help-done" role="status">
        <Icon name="check" size={26} />
        <div><strong>{res.message}</strong><p>{def.closes ? "Tu experiencia nos ayuda a mejorar el programa para ti y para quienes vienen." : "Con tus respuestas ajustamos el acompañamiento."}</p>{onDone && <button type="button" className="btn small ghost" onClick={onDone}>Cerrar</button>}</div>
      </div>
    );
  }
  return (
    <form
      className="pulse"
      onSubmit={(e) => {
        e.preventDefault();
        if (preview) return;
        start(async () => {
          const r = await submitPulse(def.key, waveId, a);
          setRes(r);
          if (r.ok) router.refresh();
        });
      }}
    >
      <p className="muted" style={{ marginTop: 0 }}>{def.intro}</p>
      {def.questions.map((q, i) => <Field key={q.id} q={q} n={i + 1} value={a[q.id]} onChange={(v) => set(q.id, v)} />)}
      {res && !res.ok && <p className="error" role="alert">{res.message}</p>}
      <div className="pulse-foot">
        <span className="muted"><small>{done} de {required.length} respondidas</small></span>
        <button className="btn" disabled={pending || preview || done < required.length}>{preview ? "Vista previa: no se envía" : pending ? "Enviando…" : "Enviar respuestas"}</button>
      </div>
    </form>
  );
}

function Field({ q, n, value, onChange }: { q: Question; n: number; value: string | number | boolean | undefined; onChange: (v: string | number | boolean) => void }) {
  const id = `pq-${q.id}`;
  const label = <>{n}. {q.label}{q.optional && <span className="muted"> (opcional)</span>}</>;
  if (q.type === "text" || q.type === "hours") {
    return (
      <div className="field pulse-q">
        <label htmlFor={id}>{label}</label>
        {q.hint && <small className="muted" id={`${id}-h`}>{q.hint}</small>}
        {q.type === "text" ? (
          <>
            <textarea id={id} rows={3} maxLength={1500} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} aria-describedby={q.hint ? `${id}-h` : undefined} />
            {q.quick && (
              <div className="pulse-quick">
                {q.quick.map((t) => <button key={t} type="button" className={`btn small ${value === t ? "" : "ghost"}`} aria-pressed={value === t} onClick={() => onChange(t)}>{t}</button>)}
              </div>
            )}
          </>
        ) : (
          <div className="pulse-hours">
            <input id={id} type="number" inputMode="decimal" min={0} max={80} step={0.5} value={(value as number | undefined) ?? ""} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} aria-describedby={q.hint ? `${id}-h` : undefined} />
            <span>horas / semana</span>
          </div>
        )}
      </div>
    );
  }
  const opts: { v: string | number | boolean; label: string }[] =
    q.type === "scale5" ? range(1, 5).map((x) => ({ v: x, label: String(x) }))
    : q.type === "nps" || q.type === "score10" ? range(0, 10).map((x) => ({ v: x, label: String(x) }))
    : q.type === "yesno" ? [{ v: true, label: "Sí" }, { v: false, label: "No" }]
    : (q.options ?? []).map((o) => ({ v: o, label: o }));
  const pills = q.type !== "choice";
  return (
    <fieldset className="pulse-q">
      <legend>{label}</legend>
      {q.hint && <small className="muted">{q.hint}</small>}
      <div className={pills ? `pulse-scale n${opts.length}` : "pulse-choices"}>
        {opts.map((o) => (
          <label key={String(o.v)} className={value === o.v ? "on" : ""}>
            <input type="radio" name={q.id} checked={value === o.v} onChange={() => onChange(o.v)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
