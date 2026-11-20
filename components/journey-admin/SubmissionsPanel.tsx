"use client";

import { useState } from "react";
import { fmtDate } from "@/components/ui";
import { BulkMoveBar } from "./BulkMoveBar";
import { SignedLink } from "@/components/journey/SignedLink";
import type { Layer } from "@/lib/journey/rules";
import type { DeliveryState } from "@/lib/journey/delivery-status";

/** Flujo de 4 pasos de una entrega (lo mismo que el estado de entrega, en lenguaje de proceso). */
export const FLOW: { key: DeliveryState; label: string; hint: string; tone: "muted" | "info" | "warn" | "ok" }[] = [
  { key: "missing", label: "En trabajo", hint: "Aún no envía su reto", tone: "muted" },
  { key: "pending", label: "Enviado", hint: "Esperando tu revisión", tone: "info" },
  { key: "not_approved", label: "Corrigiendo", hint: "No aprobó: ajusta para su reintento", tone: "warn" },
  { key: "approved", label: "Completado", hint: "Reto aprobado", tone: "ok" },
];

export type PanelRow = {
  id: string;
  name: string;
  client: string | null;
  role: string | null;
  state: DeliveryState;
  subId: string | null;
  attempt: number | null;
  maxAttempts: number | null;
  score: number | null;
  aiScore: number | null;
  submittedAt: string | null;
  /** Etapa en que está hoy la persona y si ya avanzó más allá de esta etapa. */
  stageName: string;
  ahead: boolean;
  /** Archivos de su entrega final (la aprobada o la última). */
  files: { name: string; path: string }[];
  /** Certificación AI CERT asignada. */
  cert?: string | null;
};

/**
 * Participantes y entregas: barra de avance (que también filtra), selección para pasar de etapa o descargar entregas
 * en ZIP, y la lista con etapa actual, puntaje y entregable. Clic en la persona: su entrega, la revisión de la IA y la
 * decisión. Enlaces <a> a propósito: en la página de etapa, la navegación cliente que solo cambia ?tab=/?sub= se pierde.
 */
export function SubmissionsPanel({ base, rows, isAdmin, next = null }: { base: string; rows: PanelRow[]; isAdmin: boolean; next?: Layer | null }) {
  const [sel, setSel] = useState<string[]>([]);
  const [filter, setFilter] = useState<DeliveryState | "all">("all");
  const [sort, setSort] = useState<"flow" | "done" | "name" | "score">("flow");
  const href = (r: PanelRow) => `${base}?tab=entregas&${r.subId ? `sub=${r.subId}` : `p=${r.id}`}`;
  // Orden: por paso del flujo (lo que requiere tu acción primero), completados primero, nombre o puntaje.
  const FLOW_ORDER: DeliveryState[] = ["pending", "not_approved", "missing", "approved"];
  const sorter = (a: PanelRow, b: PanelRow) =>
    sort === "name" ? a.name.localeCompare(b.name, "es")
    : sort === "score" ? (b.score ?? b.aiScore ?? -1) - (a.score ?? a.aiScore ?? -1) || a.name.localeCompare(b.name, "es")
    : sort === "done" ? Number(b.state === "approved") - Number(a.state === "approved") || a.name.localeCompare(b.name, "es")
    : FLOW_ORDER.indexOf(a.state) - FLOW_ORDER.indexOf(b.state) || a.name.localeCompare(b.name, "es");
  const count = (k: DeliveryState) => rows.filter((r) => r.state === k).length;
  const pct = (n: number) => (rows.length ? Math.round((n / rows.length) * 100) : 0);
  const shown = rows.filter((r) => filter === "all" || r.state === filter).sort(sorter);
  const withFiles = sel.filter((id) => rows.find((r) => r.id === id)?.files.length);
  const canSelect = isAdmin;
  return (
    <div className="stack">
      <section className="sp-progress" aria-label="Avance de las entregas">
        <div className="sp-stack" role="group" aria-label="Filtrar por paso del flujo">
          {FLOW.map((f) => count(f.key) > 0 && (
            <button key={f.key} type="button" className={`seg ${f.tone}${filter === f.key ? " on" : ""}`} style={{ flexGrow: count(f.key) }} aria-pressed={filter === f.key} title={`${f.label}: ${count(f.key)} (${pct(count(f.key))}%) · ${f.hint}`} onClick={() => setFilter(filter === f.key ? "all" : f.key)}>
              {pct(count(f.key)) >= 8 ? `${count(f.key)}` : ""}
            </button>
          ))}
          {rows.length === 0 && <span className="seg empty">Sin participantes</span>}
        </div>
        <ul className="sp-legend">
          {FLOW.map((f) => (
            <li key={f.key}>
              <button type="button" className={`${f.tone}${filter === f.key ? " on" : ""}`} aria-pressed={filter === f.key} onClick={() => setFilter(filter === f.key ? "all" : f.key)}>
                <i aria-hidden="true" /> {f.label} <strong>{count(f.key)}</strong> <small>{pct(count(f.key))}%</small>
              </button>
            </li>
          ))}
          {filter !== "all" && <li><button type="button" className="link-btn" onClick={() => setFilter("all")}>Ver todos ({rows.length})</button></li>}
        </ul>
      </section>

      {isAdmin && (
        <BulkMoveBar
          selected={sel}
          total={shown.length}
          to={next}
          onSelectAll={() => setSel(shown.map((r) => r.id))}
          onClear={() => setSel([])}
          extra={withFiles.length > 0 ? <a className="btn small ghost" href={`${base}/descargar-entregas?ids=${withFiles.join(",")}`} download>Descargar entregas (ZIP · {withFiles.length})</a> : null}
        />
      )}

      <div className="sp-bar">
        <strong>{shown.length} participante{shown.length === 1 ? "" : "s"}{filter !== "all" ? ` · ${FLOW.find((f) => f.key === filter)?.label}` : ""}</strong>
        <label className="sp-sort">Ordenar
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="flow">Por revisar primero</option>
            <option value="done">Completados primero</option>
            <option value="score">Mayor puntaje</option>
            <option value="name">Nombre (A–Z)</option>
          </select>
        </label>
      </div>
      <div className="table-wrap" tabIndex={0}>
        <table className="rtable sp-table">
          <thead>
            <tr>
              {canSelect && <th className="sp-check"><input type="checkbox" aria-label="Seleccionar a todos" checked={shown.length > 0 && shown.every((r) => sel.includes(r.id))} onChange={(e) => setSel(e.target.checked ? shown.map((r) => r.id) : [])} /></th>}
              <th>Participante</th><th>Etapa actual</th><th>Paso</th><th>Puntaje</th><th>Entregable</th><th><span className="sr-only">Acción</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const at = FLOW.findIndex((f) => f.key === r.state);
              return (
                <tr key={r.id} className="sp-row">
                  {canSelect && <td className="sp-check"><input type="checkbox" aria-label={`Seleccionar a ${r.name}`} checked={sel.includes(r.id)} onChange={(e) => setSel((x) => (e.target.checked ? [...x, r.id] : x.filter((y) => y !== r.id)))} /></td>}
                  <td className="rt-title">
                    <a href={href(r)} className="sp-name"><strong>{r.name}</strong></a>
                    <small className="muted">{[r.client, r.role].filter(Boolean).join(" · ") || "—"}</small>
                    {r.cert && <small className="cert-name">{r.cert}</small>}
                    {isAdmin && <a className="sp-move" href={`${base}?tab=entregas&p=${r.id}#etapa`}>Mover de etapa</a>}
                  </td>
                  <td data-label="Etapa actual"><span className={`badge ${r.ahead ? "brand" : ""}`}>{r.stageName}</span></td>
                  <td data-label="Paso">
                    <span className={`sp-pill ${FLOW[at].tone}`}>{FLOW[at].label}</span>
                    {r.attempt && r.attempt > 1 ? <small className="muted"> · intento {r.attempt}{r.maxAttempts ? ` de ${r.maxAttempts}` : ""}</small> : null}
                  </td>
                  <td data-label="Puntaje">
                    {r.score != null ? <strong>{Math.round(r.score)}</strong> : r.aiScore != null ? <span className="muted" title="Propuesta de la IA, aún sin tu decisión">IA {Math.round(r.aiScore)}</span> : <span className="muted">—</span>}
                  </td>
                  <td data-label="Entregable">
                    {r.files.length > 0 ? <span className="sp-dl">{r.files.map((f) => <SignedLink key={f.path} bucket="submissions" path={f.path}>{f.name}</SignedLink>)}</span> : <span className="muted">—</span>}
                    {r.submittedAt && <small className="muted sp-when">{fmtDate(r.submittedAt)}</small>}
                  </td>
                  <td className="sp-act">
                    <a className={`btn small${isAdmin && r.state === "pending" ? "" : " ghost"}`} href={href(r)}>{isAdmin && r.state === "pending" ? "Evaluar" : "Ver"}</a>
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && <tr><td colSpan={7} className="muted">Nadie en este paso.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
