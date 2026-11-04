"use client";

import { useState } from "react";
import { fmtDate } from "@/components/ui";
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
};

/** Enlaces <a> a propósito: en la página de etapa, la navegación cliente que solo cambia ?tab=/?sub= no se aplica.
 *  Desafío y entregas: indicadores, flujo de 4 pasos (filtros) y listado de personas con acceso a «Evaluar». */
export function SubmissionsPanel({ base, rows, isAdmin }: { base: string; rows: PanelRow[]; isAdmin: boolean }) {
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
  const kpis = [
    { label: "Participantes", value: rows.length, hint: "en la Wave", tone: "" },
    { label: "Completados", value: count("approved"), hint: `${pct(count("approved"))}% aprobó`, tone: "ok" },
    { label: "Por revisar", value: count("pending"), hint: count("pending") ? "esperan tu evaluación" : "nada pendiente", tone: "info" },
    { label: "Corrigiendo", value: count("not_approved"), hint: "en segundo intento", tone: "warn" },
    { label: "Sin enviar", value: count("missing"), hint: `${pct(count("missing"))}% aún no envía`, tone: "bad" },
  ];
  return (
    <div className="stack">
      <section className="sp-kpis" aria-label="Resumen de entregas">
        {kpis.map((k) => (
          <div key={k.label} className={`sp-kpi ${k.tone}`}>
            <span>{k.label}</span>
            <strong>{k.value}</strong>
            <small>{k.hint}</small>
          </div>
        ))}
      </section>

      <nav className="sp-flow" aria-label="Flujo de entrega">
        <button type="button" className={`sp-step all${filter === "all" ? " on" : ""}`} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>
          <strong>{rows.length}</strong><span>Todos</span>
        </button>
        {FLOW.map((f, i) => (
          <button key={f.key} type="button" className={`sp-step ${f.tone}${filter === f.key ? " on" : ""}`} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            <em>{i + 1}</em>
            <strong>{count(f.key)}</strong>
            <span>{f.label}</span>
            <small>{f.hint}</small>
          </button>
        ))}
      </nav>

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
            <tr><th>Participante</th><th>Paso del flujo</th><th>Intento</th><th>Puntaje</th><th>Enviado</th><th><span className="sr-only">Acción</span></th></tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const at = FLOW.findIndex((f) => f.key === r.state);
              return (
                <tr key={r.id} className="sp-row">
                  <td className="rt-title">
                    <a href={href(r)} className="sp-name"><strong>{r.name}</strong></a>
                    <small className="muted">{[r.client, r.role].filter(Boolean).join(" · ") || "—"}</small>
                    {isAdmin && <a className="sp-move" href={`${base}?tab=entregas&p=${r.id}#etapa`}>Mover de etapa</a>}
                  </td>
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
                    <a className={`btn small${isAdmin && r.state === "pending" ? "" : " ghost"}`} href={href(r)}>{isAdmin && r.state === "pending" ? "Evaluar" : "Detalles"}</a>
                  </td>
                </tr>
              );
            })}
            {shown.length === 0 && <tr><td colSpan={6} className="muted">Nadie en este paso.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
