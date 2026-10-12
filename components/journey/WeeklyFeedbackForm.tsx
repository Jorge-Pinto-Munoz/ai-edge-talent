"use client";

import { useState, useTransition } from "react";
import { saveWeeklyFeedback, type FeedbackEntry } from "@/lib/journey/actions";
import { layerName, layerIndex, type Layer } from "@/lib/journey/rules";
import { Callout } from "@/components/ui";

type Existing = { candidate_id: string; attendance: FeedbackEntry["attendance"]; progress: number; risk: FeedbackEntry["risk"]; comment: string | null };

export function WeeklyFeedbackForm({ groupId, groupName, people, existing, note }: {
  groupId: string;
  groupName: string;
  people: { id: string; name: string; role: string | null; layer: Layer | null }[];
  existing: Existing[];
  note: { course_feedback: string; blockers: string | null } | null;
}) {
  const [entries, setEntries] = useState<FeedbackEntry[]>(
    people.map((p) => {
      const e = existing.find((x) => x.candidate_id === p.id);
      return { candidateId: p.id, attendance: e?.attendance ?? "FULL", progress: e?.progress ?? 3, risk: e?.risk ?? "LOW", comment: e?.comment ?? "" };
    }),
  );
  const [course, setCourse] = useState(note?.course_feedback ?? "");
  const [blockers, setBlockers] = useState(note?.blockers ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const upd = (i: number, patch: Partial<FeedbackEntry>) => setEntries((x) => x.map((e, k) => (k === i ? { ...e, ...patch } : e)));
  return (
    <div className="card">
      <div className="spread">
        <h2 style={{ margin: 0 }}>{groupName}</h2>
        {existing.length > 0 && <span className="badge ok">Enviado esta semana</span>}
      </div>
      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table>
          <thead><tr><th>Persona</th><th>Asistencia</th><th>Avance (1–5)</th><th>Riesgo</th><th>Comentario</th></tr></thead>
          <tbody>
            {people.map((p, i) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.name}</strong><br /><small className="muted">{p.role} · {layerName(p.layer)}</small>
                  {layerIndex(p.layer) < layerIndex("ROLE_ENABLEMENT") && <><br /><small className="pending-def">Aún no inicia Role Enablement</small></>}
                </td>
                <td>
                  <select aria-label={`Asistencia de ${p.name}`} value={entries[i].attendance} onChange={(e) => upd(i, { attendance: e.target.value as FeedbackEntry["attendance"] })}>
                    <option value="FULL">Completa</option><option value="PARTIAL">Parcial</option><option value="NONE">Sin asistencia</option>
                  </select>
                </td>
                <td>
                  <select aria-label={`Avance de ${p.name}`} value={entries[i].progress} onChange={(e) => upd(i, { progress: Number(e.target.value) })}>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </td>
                <td>
                  <select aria-label={`Riesgo de ${p.name}`} value={entries[i].risk} onChange={(e) => upd(i, { risk: e.target.value as FeedbackEntry["risk"] })}>
                    <option value="LOW">Bajo</option><option value="MEDIUM">Medio</option><option value="HIGH">Alto</option>
                  </select>
                </td>
                <td><input type="text" aria-label={`Comentario sobre ${p.name}`} value={entries[i].comment} onChange={(e) => upd(i, { comment: e.target.value })} placeholder="Qué observaste esta semana" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid grid-2" style={{ marginTop: 12 }}>
        <div className="field"><label htmlFor={`co-${groupId}`}>¿Cómo va el curso / acompañamiento? *</label><textarea id={`co-${groupId}`} rows={3} value={course} onChange={(e) => setCourse(e.target.value)} /></div>
        <div className="field"><label htmlFor={`bl-${groupId}`}>Bloqueos o necesidades (opcional)</label><textarea id={`bl-${groupId}`} rows={3} value={blockers} onChange={(e) => setBlockers(e.target.value)} /></div>
      </div>
      <p className="muted"><small>Una semana completa sin acompañamiento es señal de riesgo: márcala como “Sin asistencia”.</small></p>
      {msg && <Callout tone={msg.ok ? "ok" : "bad"} title={msg.message} />}
      <button className="btn" disabled={pending} onClick={() => start(async () => setMsg(await saveWeeklyFeedback(groupId, entries, course, blockers)))}>
        {existing.length ? "Actualizar feedback" : "Enviar feedback de la semana"}
      </button>
    </div>
  );
}
