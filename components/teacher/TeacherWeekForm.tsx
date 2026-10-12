"use client";

import { useMemo, useState, useTransition } from "react";
import { reopenTeacherWeek, saveTeacherWeek, type Result } from "@/lib/teacher/actions";
import { TEACHER_FLAGS, TEACHER_STATUS, type TeacherEntry } from "@/lib/teacher/rules";
import { layerName, type Layer } from "@/lib/journey/rules";
import { Callout } from "@/components/ui";

export type TeacherPerson = { id: string; name: string; role: string | null; client: string | null; layer: Layer | null };

/** Cierre semanal: una fila por participante + feedback general de la clase. */
export function TeacherWeekForm({ waveId, week, people, existing, generalFeedback, closedAt }: {
  waveId: string;
  week: string;
  people: TeacherPerson[];
  existing: TeacherEntry[];
  generalFeedback: string;
  closedAt: string | null;
}) {
  const [entries, setEntries] = useState<TeacherEntry[]>(() =>
    people.map((p) => existing.find((e) => e.candidateId === p.id) ?? { candidateId: p.id, status: "AL_DIA", progress: null, attended: true, note: "", flag: "NONE" }),
  );
  const [general, setGeneral] = useState(generalFeedback);
  const [msg, setMsg] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  const locked = Boolean(closedAt);
  const upd = (i: number, patch: Partial<TeacherEntry>) => setEntries((x) => x.map((e, k) => (k === i ? { ...e, ...patch } : e)));
  const counts = useMemo(
    () => ({
      concern: entries.filter((e) => e.flag === "CONCERN").length,
      highlight: entries.filter((e) => e.flag === "HIGHLIGHT").length,
      risk: entries.filter((e) => e.status !== "AL_DIA").length,
    }),
    [entries],
  );
  const save = (close: boolean) => start(async () => setMsg(await saveTeacherWeek({ waveId, week, entries, generalFeedback: general, close })));

  if (people.length === 0) {
    return <div className="empty">Aún no hay participantes activos en esta Wave.</div>;
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="teacher-list">
        {people.map((p, i) => {
          const e = entries[i];
          return (
            <article key={p.id} className={`teacher-row flag-${e.flag.toLowerCase()}`}>
              <div className="who">
                <strong>{p.name}</strong>
                <small className="muted">{[p.role, p.client].filter(Boolean).join(" · ")}</small>
                <small className="muted">{layerName(p.layer)}</small>
              </div>
              <div className="ctrl">
                <div className="seg" role="radiogroup" aria-label={`Estado de ${p.name}`}>
                  {TEACHER_STATUS.map((s) => (
                    <button key={s.id} type="button" role="radio" aria-checked={e.status === s.id} disabled={locked} className={`seg-btn ${s.tone} ${e.status === s.id ? "on" : ""}`} onClick={() => upd(i, { status: s.id })}>
                      {s.label}
                    </button>
                  ))}
                </div>
                <label className="mini">
                  Avance
                  <input type="number" min={0} max={100} step={5} inputMode="numeric" aria-label={`Avance de ${p.name} (%)`} disabled={locked} value={e.progress ?? ""} placeholder="%" onChange={(ev) => upd(i, { progress: ev.target.value === "" ? null : Math.max(0, Math.min(100, Math.round(Number(ev.target.value)))) })} />
                </label>
                <label className="mini check">
                  <input type="checkbox" disabled={locked} checked={e.attended ?? false} onChange={(ev) => upd(i, { attended: ev.target.checked })} />
                  Asistió
                </label>
                <select aria-label={`Marca de ${p.name}`} disabled={locked} value={e.flag} onChange={(ev) => upd(i, { flag: ev.target.value as TeacherEntry["flag"] })}>
                  {TEACHER_FLAGS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
              <input
                type="text"
                className="note"
                aria-label={`Nota sobre ${p.name}`}
                disabled={locked}
                value={e.note}
                onChange={(ev) => upd(i, { note: ev.target.value })}
                placeholder={e.flag === "CONCERN" ? "¿Qué te preocupa y qué sugieres a Delivery?" : e.flag === "HIGHLIGHT" ? "¿Qué destacó esta semana?" : "Nota breve (opcional)"}
              />
            </article>
          );
        })}
      </div>

      <div className="field">
        <label htmlFor="tw-general">Feedback general de la clase *</label>
        <textarea id="tw-general" rows={4} disabled={locked} value={general} onChange={(e) => setGeneral(e.target.value)} placeholder="Cómo avanzó el grupo, qué costó, qué funcionó y qué ajustarías para la próxima semana." />
      </div>

      <p className="muted" style={{ margin: 0 }}>
        <small>{counts.risk} en riesgo o atrasado/s · {counts.concern} preocupante/s · {counts.highlight} destacado/s. Al cerrar, Delivery recibe los casos marcados para darles seguimiento.</small>
      </p>
      {msg && <Callout tone={msg.ok ? "ok" : "bad"} title={msg.message} />}
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        {locked ? (
          <button type="button" className="btn ghost" disabled={pending} onClick={() => start(async () => setMsg(await reopenTeacherWeek(waveId, week)))}>Reabrir semana</button>
        ) : (
          <>
            <button type="button" className="btn" disabled={pending} onClick={() => save(true)}>Cerrar semana</button>
            <button type="button" className="btn ghost" disabled={pending} onClick={() => save(false)}>Guardar borrador</button>
          </>
        )}
      </div>
    </div>
  );
}
