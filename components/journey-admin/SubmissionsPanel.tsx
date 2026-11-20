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
};

/** Enlaces <a> a propósito: en la página de etapa, la navegación cliente que solo cambia ?tab=/?sub= no se aplica.
 *  Desafío y entregas: indicadores, flujo de 4 pasos (filtros) y listado de personas con acceso a «Evaluar». */
export function SubmissionsPanel({ base, rows: allRows, isAdmin, next = null }: { base: string; rows: PanelRow[]; isAdmin: boolean; next?: Layer | null }) {
  const [sel, setSel] = useState<string[]>([]);
  // Por defecto solo quienes siguen en la etapa; quienes ya avanzaron se ven aparte, con su etapa actual.
  const [scope, setScope] = useState<"here" | "ahead" | "all">("here");
  const nAhead = allRows.filter((r) => r.ahead).length;
  const rows = allRows.filter((r) => (scope === "here" ? !r.ahead : scope === "ahead" ? r.ahead : true));
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
  return (
    <div className="stack">
      <nav className="sp-scope" aria-label="Quiénes mostrar">
        {([["here", `En esta etapa (${allRows.length - nAhead})`], ["ahead", `Ya avanzaron (${nAhead})`], ["all", `Todos (${allRows.length})`]] as const).map(([k, label]) => (
          <button key={k} type="button" aria-pressed={scope === k} className={scope === k ? "on" : ""} onClick={() => { setScope(k); setFilter("all"); setSel([]); }}>{label}</button>
        ))}
      </nav>

      <nav className="sp-flow" aria-label="Flujo de entrega">
        <button type="button" className={`sp-step all${filter === "all" ? " on" : ""}`} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
          <strong>{rows.length}</strong><span>Todos</span>
        </button>
        {FLOW.map((f, i) => (
          <button key={f.key} type="button" className={`sp-step ${f.tone}${filter === f.key ? " on" : ""}`} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            <em>{i + 1}</em>
            <strong>{count(f.key)} <small className="sp-pct">{pct(count(f.key))}%</small></strong>
            <span>{f.label}</span>
            <small>{f.hint}</small>
          </button>
        ))}
      </nav>

      {isAdmin && <BulkMoveBar selected={sel} total={shown.length} to={next} onSelectAll={() => setSel(shown.map((r) => r.id))} onClear={() => setSel([])} />}

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
            <tr>{isAdmin && next && <th className="sp-check"><span className="sr-only">Seleccionar</span></th>}<th>Participante</th>{scope !== "here" && <th>Etapa actual</th>}<th>Paso del flujo</th><th>Intento</th><th>Puntaje</th><th>Enviado</th><th><span className="sr-only">Acción</span></th></tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const at = FLOW.findIndex((f) => f.key === r.state);
              return (
                <tr key={r.id} className="sp-row">
                  {isAdmin && next && <td className="sp-check"><input type="checkbox" aria-label={`Seleccionar a ${r.name}`} checked={sel.includes(r.id)} onChange={(e) => setSel((x) => (e.target.checked ? [...x, r.id] : x.filter((y) => y !== r.id)))} /></td>}
                  <td className="rt-title">
                    <a href={href(r)} className="sp-name"><strong>{r.name}</strong></a>
                    <small className="muted">{[r.client, r.role].filter(Boolean).join(" · ") || "—"}</small>
                    {isAdmin && <a className="sp-move" href={`${base}?tab=entregas&p=${r.id}#etapa`}>Mover de etapa</a>}
                  </td>
                  {scope !== "here" && <td data-label="Etapa actual"><span className={`badge ${r.ahead ? "brand" : ""}`}>{r.stageName}</span></td>}
                  <td data-label="Paso">
                    <span className="sp-dots" aria-hidden="true">{FLOW.map((f, i) => <i key={f.key} className={i < at ? "past" : i === at ? `now ${f.tone}` : ""} />)}</span>
                    <span className={`sp-pill ${FLOW[at].tone}`}>{FLOW[at].label}</span>
                  </td>
                  <td data-label="Intento">
                    {r.attempt ? <>{r.attempt}{r.maxAttempts ? ` de ${r.maxAttempts}` : ""}{r.attempt > 1 && <span className="badge warn" style={{ marginLeft: 6 }}>Reintento</span>}</> : <span className="muted">—</span>}
                  </td>
                  <td data-label="Puntaje">
                    {r.score != null ? <strong>{Math.round(r.score)}</strong> : r.aiScore != null ? <span className="muted" title="Propuesta de la IA, aún sin tu decisión">IA {Math.round(r.aiScore)}</span> : <span className="muted">—</span>}
                  </td>
                  <td data-label="Enviado">{r.submittedAt ? <small>{fmtDate(r.submittedAt)}</small> : <span className="muted">—</span>}</td>
                  <td className="sp-act">
                    {r.files.length > 0 && <span className="sp-dl" title="Descargar su entrega final">{r.files.map((f) => <SignedLink key={f.path} bucket="submissions" path={f.path}>{r.files.length > 1 ? f.name : "Descargar"}</SignedLink>)}</span>}
                    <a className={`btn small${isAdmin && r.state === "pending" ? "" : " ghost"}`} href={href(r)}>{isAdmin && r.state === "pending" ? "Evaluar" : "Detalles"}</a>
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && <tr><td colSpan={8} className="muted">{scope === "ahead" ? "Nadie ha avanzado aún a la etapa siguiente." : "Nadie en este paso."}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
