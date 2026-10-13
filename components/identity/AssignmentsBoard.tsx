"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignDelivery, provisionWave, setWaveDeliveries, type AdminResult } from "@/lib/identity/admin-actions";
import { layerName, type Layer } from "@/lib/journey/rules";
import { Icon } from "@/components/site/Icon";

export interface ProRow { id: string; name: string; client: string | null; role: string | null; layer: string | null; status: string; delivery: string | null }
export interface DeliveryRow { email: string; name: string; status: string; lastSignIn: string | null; count: number }
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "short" }) : null);

/** Alertas de cobertura, Delivery de la Wave y asignación (individual o en lote) de profesionales. */
export function AssignmentsBoard({ waveId, pros, team, allDeliveries }: { waveId: string; pros: ProRow[]; team: DeliveryRow[]; allDeliveries: { email: string; name: string }[] }) {
  const router = useRouter();
  const [res, setRes] = useState<AdminResult | null>(null);
  const [busy, start] = useTransition();
  const [sel, setSel] = useState<string[]>([]);
  const [bulk, setBulk] = useState(team[0]?.email ?? "");
  const [filter, setFilter] = useState<"all" | "unassigned">("all");
  const [members, setMembers] = useState<string[]>(team.map((t) => t.email));
  const run = (f: () => Promise<AdminResult>) => start(async () => { const r = await f(); setRes(r); if (r.ok) { setSel([]); router.refresh(); } });
  const nameOf = (e: string | null) => team.find((t) => t.email === e)?.name ?? e ?? "";
  const list = pros.filter((p) => filter === "all" || !p.delivery);
  const alerts = [
    ...pros.filter((p) => !p.delivery).map((p) => ({ k: `p${p.id}`, t: `${p.name} no tiene Delivery asignado.` })),
    ...team.filter((d) => d.count === 0).map((d) => ({ k: `d${d.email}`, t: `${d.name} no tiene profesionales asignados en esta Wave.` })),
    ...team.filter((d) => !d.lastSignIn).map((d) => ({ k: `n${d.email}`, t: `${d.name} aún no ha ingresado a la plataforma.` })),
  ];

  return (
    <div className="stack">
      {res && <p className={res.ok ? "uc-ok" : "error"} role={res.ok ? "status" : "alert"}>{res.message}</p>}
      {alerts.length > 0 ? (
        <div className="dj-attn" role="region" aria-label="Alertas de cobertura">
          <h2 className="as-alert-t"><Icon name="alert" size={18} /> {alerts.length} alerta{alerts.length === 1 ? "" : "s"} de cobertura</h2>
          <ul className="as-alerts">{alerts.slice(0, 12).map((a) => <li key={a.k}>{a.t}</li>)}</ul>
          {alerts.length > 12 && <p className="muted" style={{ margin: 0 }}>Y {alerts.length - 12} más.</p>}
        </div>
      ) : (
        <p className="uc-ok">Cobertura completa: todos los profesionales tienen Delivery y todos los Delivery tienen profesionales.</p>
      )}

      <section className="card">
        <div className="spread">
          <h2 style={{ margin: 0 }}>Portales de los profesionales</h2>
          <button type="button" className="btn small secondary" disabled={busy} onClick={() => run(() => provisionWave(waveId))}>Activar portales pendientes</button>
        </div>
        <p className="muted ud-note">Cada inscrito recibe su código de activación al pasar a AI First Mindset. Esto lo envía a quienes aún no lo recibieron (por ejemplo, inscritos antes de esta función). No duplica envíos.</p>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Delivery de la Wave</h2>
        <div className="as-team">
          {team.map((d) => (
            <div key={d.email} className="as-member">
              <strong>{d.name}</strong>
              <small className="muted">{d.email}</small>
              <span className={`ds-status s-${d.count ? "done" : "attention"}`}>{d.count} profesional{d.count === 1 ? "" : "es"}</span>
              <small className={d.lastSignIn ? "muted" : "error"}>{d.lastSignIn ? `Último ingreso ${fmt(d.lastSignIn)}` : "Nunca ha ingresado"}</small>
            </div>
          ))}
          {team.length === 0 && <p className="muted">Aún no hay Delivery en esta Wave.</p>}
        </div>
        <details style={{ marginTop: 12 }}>
          <summary><strong>Agregar o quitar Delivery de la Wave</strong></summary>
          <div className="ud-checks" style={{ marginTop: 10 }}>
            {allDeliveries.map((d) => <label key={d.email}><input type="checkbox" checked={members.includes(d.email)} onChange={(e) => setMembers((x) => (e.target.checked ? [...x, d.email] : x.filter((y) => y !== d.email)))} /> {d.name} <small className="muted">· {d.email}</small></label>)}
            {allDeliveries.length === 0 && <p className="muted">No hay cuentas Delivery. Créalas en Usuarios y accesos.</p>}
          </div>
          <button type="button" className="btn small secondary" style={{ marginTop: 10 }} disabled={busy} onClick={() => run(() => setWaveDeliveries(waveId, members))}>Guardar Delivery de la Wave</button>
          <p className="muted ud-note">Quitar a un Delivery de la Wave retira también sus asignaciones en ella.</p>
        </details>
      </section>

      <section className="card">
        <div className="spread">
          <h2 style={{ margin: 0 }}>Profesionales</h2>
          <div className="ds-seg">
            <a href="#" className={filter === "all" ? "on" : ""} onClick={(e) => { e.preventDefault(); setFilter("all"); }}>Todos · {pros.length}</a>
            <a href="#" className={filter === "unassigned" ? "on" : ""} onClick={(e) => { e.preventDefault(); setFilter("unassigned"); }}>Sin Delivery · {pros.filter((p) => !p.delivery).length}</a>
          </div>
        </div>
        {team.length > 0 && (
          <div className="as-bulk">
            <span>{sel.length} seleccionado{sel.length === 1 ? "" : "s"}</span>
            <label className="sr-only" htmlFor="as-b">Delivery</label>
            <select id="as-b" value={bulk} onChange={(e) => setBulk(e.target.value)}>{team.map((t) => <option key={t.email} value={t.email}>{t.name}</option>)}</select>
            <button type="button" className="btn small" disabled={busy || !sel.length} onClick={() => run(() => assignDelivery(waveId, sel, bulk))}>Asignar seleccionados</button>
            <button type="button" className="btn small ghost" disabled={busy || !sel.length} onClick={() => run(() => assignDelivery(waveId, sel, null))}>Quitar asignación</button>
          </div>
        )}
        <div className="table-wrap" tabIndex={0}>
          <table className="rtable">
            <thead><tr><th><input type="checkbox" aria-label="Seleccionar todos" checked={sel.length === list.length && list.length > 0} onChange={(e) => setSel(e.target.checked ? list.map((p) => p.id) : [])} /></th><th>Profesional</th><th>Etapa</th><th>Delivery responsable</th></tr></thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td className="rt-check"><input type="checkbox" aria-label={`Seleccionar ${p.name}`} checked={sel.includes(p.id)} onChange={(e) => setSel((x) => (e.target.checked ? [...x, p.id] : x.filter((y) => y !== p.id)))} /></td>
                  <td className="rt-title">{p.name}<br /><small className="muted">{[p.role, p.client].filter(Boolean).join(" · ")}</small></td>
                  <td data-label="Etapa">{p.layer ? layerName(p.layer as Layer) : p.status === "SELECTED" || p.status === "CONDITIONS_PENDING" ? "Seleccionado/a" : "Inscrito/a"}</td>
                  <td data-label="Delivery">
                    <label className="sr-only" htmlFor={`as-${p.id}`}>Delivery de {p.name}</label>
                    <select id={`as-${p.id}`} value={p.delivery ?? ""} disabled={busy || team.length === 0} onChange={(e) => run(() => assignDelivery(waveId, [p.id], e.target.value || null))}>
                      <option value="">Sin asignar</option>
                      {team.map((t) => <option key={t.email} value={t.email}>{t.name}</option>)}
                      {p.delivery && !team.some((t) => t.email === p.delivery) && <option value={p.delivery}>{nameOf(p.delivery)}</option>}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
