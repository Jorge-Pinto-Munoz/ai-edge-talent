"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteClass, saveClass, type Result } from "@/lib/teacher/actions";
import { CLASS_FIELDS, type ClassInput } from "@/lib/teacher/rules";
import { Icon } from "@/components/site/Icon";
import { Callout } from "@/components/ui";

export type ClassPerson = { id: string; name: string; detail: string };
type Draft = Omit<ClassInput, "attendance" | "waveId">;

/**
 * Registro de una clase: fecha, de qué se trató y quién asistió.
 * Todos parten como presentes: el profesor solo toca a quienes faltaron.
 */
export function ClassForm({ waveId, people, initial, attended }: { waveId: string; people: ClassPerson[]; initial: Draft; attended: Record<string, boolean> | null }) {
  const router = useRouter();
  const [d, setD] = useState<Draft>(initial);
  const [present, setPresent] = useState<Record<string, boolean>>(() => Object.fromEntries(people.map((p) => [p.id, attended?.[p.id] ?? true])));
  const [msg, setMsg] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const count = people.filter((p) => present[p.id]).length;
  const all = (v: boolean) => setPresent(Object.fromEntries(people.map((p) => [p.id, v])));

  const submit = () =>
    start(async () => {
      const r = await saveClass({ ...d, waveId, attendance: people.map((p) => ({ candidateId: p.id, attended: present[p.id] })) });
      setMsg(r);
      if (r.ok && !d.id) {
        // Lista para registrar la próxima clase.
        setD(initial);
        all(true);
      }
      router.refresh();
    });

  return (
    <form className="class-form" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <div className="class-col">
        <div className="field" style={{ maxWidth: 240 }}>
          <label htmlFor="cl-date">Fecha de la clase *</label>
          <input id="cl-date" type="date" required value={d.heldOn} onChange={(e) => set({ heldOn: e.target.value })} />
        </div>
        {CLASS_FIELDS.map((f) => (
          <div key={f.key} className="field">
            <label htmlFor={`cl-${f.key}`}>{f.label}{f.key === "topic" ? " *" : ""}</label>
            <textarea id={`cl-${f.key}`} rows={f.rows} value={d[f.key]} placeholder={f.placeholder} onChange={(e) => set({ [f.key]: e.target.value } as Partial<Draft>)} />
          </div>
        ))}
      </div>

      <div className="class-col">
        <div className="attend-head">
          <div>
            <strong>Asistencia</strong>
            <small className="muted">Toca a quien no asistió · {count} de {people.length} presentes</small>
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button type="button" className="btn ghost small" onClick={() => all(true)}>Todos</button>
            <button type="button" className="btn ghost small" onClick={() => all(false)}>Ninguno</button>
          </div>
        </div>
        {people.length === 0 ? (
          <div className="empty"><span>Aún no hay participantes activos en esta Wave.</span></div>
        ) : (
          <ul className="attend-list">
            {people.map((p) => (
              <li key={p.id}>
                <button type="button" className={`attend ${present[p.id] ? "in" : "out"}`} aria-pressed={present[p.id]} onClick={() => setPresent((x) => ({ ...x, [p.id]: !x[p.id] }))}>
                  <span className="mark"><Icon name={present[p.id] ? "check" : "close"} size={16} /></span>
                  <span className="who"><strong>{p.name}</strong><small>{p.detail}</small></span>
                  <span className="state">{present[p.id] ? "Asistió" : "No asistió"}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="class-actions">
        {msg && <Callout tone={msg.ok ? "ok" : "bad"} title={msg.message} />}
        <div className="row" style={{ gap: 8 }}>
          <button className="btn" disabled={pending || people.length === 0}>{d.id ? "Guardar cambios" : "Guardar clase"}</button>
          {d.id && (
            <button type="button" className="btn ghost danger" disabled={pending} onClick={() => { if (confirm("¿Eliminar esta clase y su asistencia?")) start(async () => { const r = await deleteClass(waveId, d.id!); setMsg(r); if (r.ok) { const u = new URL(window.location.href); u.searchParams.delete("clase"); router.push(u.pathname + u.search); } }); }}>
              Eliminar clase
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
