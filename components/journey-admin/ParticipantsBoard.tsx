"use client";

import { useState } from "react";
import { layerName, type Layer } from "@/lib/journey/rules";
import { fmtDate } from "@/components/ui";
import { BulkMoveBar } from "./BulkMoveBar";

interface Person { id: string; full_name: string; client_name: string | null; role_title: string | null; specialty: string | null; journey_layer: Layer | null; journey_layer_since: string | null }

export function ParticipantsBoard({ waveId, people, isAdmin, next = null }: { waveId: string; people: Person[]; isAdmin: boolean; next?: Layer | null }) {
  const [sel, setSel] = useState<string[]>([]);
  return (
    <div className="stack">
      {isAdmin && <BulkMoveBar selected={sel} total={people.length} to={next} onSelectAll={() => setSel(people.map((p) => p.id))} onClear={() => setSel([])} />}
      <div className="table-wrap" tabIndex={0}>
        <table>
          <thead><tr>{isAdmin && next && <th><input type="checkbox" aria-label="Seleccionar a todos" checked={people.length > 0 && sel.length === people.length} onChange={(e) => setSel(e.target.checked ? people.map((p) => p.id) : [])} /></th>}<th>Persona</th><th>Cliente · Rol</th><th>Especialidad</th><th>Etapa</th><th>Desde</th></tr></thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id}>
                {isAdmin && next && <td><input type="checkbox" aria-label={`Seleccionar ${p.full_name}`} checked={sel.includes(p.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))} /></td>}
                <td><a href={`/admin/admision/${waveId}/c/${p.id}#etapa`}><strong>{p.full_name}</strong></a>{isAdmin && <><br /><a className="link-context" href={`/admin/admision/${waveId}/c/${p.id}#etapa`}><small>Mover de etapa</small></a></>}</td>
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
