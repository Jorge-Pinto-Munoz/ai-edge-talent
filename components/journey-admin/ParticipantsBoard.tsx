"use client";

import { useState, useTransition } from "react";
import { advanceLayer } from "@/lib/journey/actions";
import { LAYERS, layerName, type Layer } from "@/lib/journey/rules";
import { Callout, fmtDate } from "@/components/ui";

interface Person { id: string; full_name: string; client_name: string | null; role_title: string | null; specialty: string | null; journey_layer: Layer | null; journey_layer_since: string | null }

export function ParticipantsBoard({ waveId, people, isAdmin }: { waveId: string; people: Person[]; isAdmin: boolean }) {
  const [sel, setSel] = useState<string[]>([]);
  const [to, setTo] = useState<Layer>("AI_MINDSET");
  const [exception, setException] = useState("");
  const [res, setRes] = useState<{ ok: boolean; message: string; data?: string[] } | null>(null);
  const [pending, start] = useTransition();
  const columns: (Layer | null)[] = [null, "AI_MINDSET", "ROLE_ENABLEMENT", "AI_LAB_SHOWCASE", "CLOSURE"];
  return (
    <div className="stack">
      <div className="grid grid-3">
        {columns.map((l) => (
          <div key={l ?? "none"} className="card">
            <div className="kpi">{people.filter((p) => p.journey_layer === l).length}</div>
            <small className="muted">{l ? layerName(l) : "Inscritos sin iniciar"}</small>
          </div>
        ))}
      </div>
      {isAdmin && sel.length > 0 && (
        <div className="card" style={{ borderColor: "var(--accent)" }}>
          <strong>{sel.length} seleccionado(s) · avanzar etapa</strong>
          <div className="row" style={{ marginTop: 8 }}>
            <select value={to} onChange={(e) => setTo(e.target.value as Layer)} style={{ width: "auto" }} aria-label="Etapa destino">
              {LAYERS.filter((l) => l.id !== "ASSESSMENT").map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
            <input type="text" value={exception} onChange={(e) => setException(e.target.value)} placeholder="Nota de excepción (solo si no cumple el gate)" style={{ maxWidth: 380 }} />
            <button className="btn small" disabled={pending} onClick={() => start(async () => { setRes(await advanceLayer(waveId, sel, to, exception)); setSel([]); })}>Avanzar</button>
          </div>
          <p className="muted" style={{ margin: "6px 0 0" }}><small>El sistema valida los gates (tareas de Mindset aprobadas, certificación verificada). Sin cumplirlos, solo avanza con una nota de excepción que queda registrada.</small></p>
        </div>
      )}
      {res && (
        <Callout tone={res.ok ? "ok" : "bad"} title={res.message}>
          {res.data && res.data.length > 0 && <ul style={{ margin: 0 }}>{res.data.map((d) => <li key={d}><small>{d}</small></li>)}</ul>}
        </Callout>
      )}
      <div className="table-wrap">
        <table>
          <thead><tr>{isAdmin && <th></th>}<th>Persona</th><th>Cliente · Rol</th><th>Especialidad</th><th>Etapa</th><th>Desde</th></tr></thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id}>
                {isAdmin && <td><input type="checkbox" aria-label={`Seleccionar ${p.full_name}`} checked={sel.includes(p.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))} /></td>}
                <td><strong>{p.full_name}</strong></td>
                <td>{p.client_name ?? "—"}<br /><small className="muted">{p.role_title}</small></td>
                <td>{p.specialty ?? "—"}</td>
                <td><span className="badge brand">{p.journey_layer ? layerName(p.journey_layer) : "Sin iniciar"}</span></td>
                <td><small>{p.journey_layer_since ? fmtDate(p.journey_layer_since) : "—"}</small></td>
              </tr>
            ))}
            {people.length === 0 && <tr><td colSpan={6} className="muted">Aún no hay personas inscritas en esta Wave.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
