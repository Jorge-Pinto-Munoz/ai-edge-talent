"use client";

import { useState, type ReactNode } from "react";
import { Callout, fmtDate } from "@/components/ui";
import { SubmissionCard, type Sub } from "./ReviewQueue";
import { FLOW } from "./SubmissionsPanel";
import type { DeliveryState } from "@/lib/journey/delivery-status";

type Past = { id: string; attempt: number; status: string; score: number | null; feedback: string | null; submitted_at: string };
const PAST: Record<string, string> = { APPROVED: "Aprobada", NOT_APPROVED: "No aprobada", SUBMITTED: "Por revisar", HUMAN_REVIEW: "Revisión humana" };

type Facts = { email: string; delivery: string | null; account: string; lastLogin: string | null; stage: string; since: string | null };

/** Detalle de un participante: datos, paso del flujo, entrega actual con revisión (IA + decisión), intentos y mover de etapa. */
export function EvaluateView({ sub, name, person, facts, state, history, backHref, nextHref, isAdmin, move }: { sub: Sub | null; name: string; person: { client: string | null; role: string | null }; facts: Facts; state: DeliveryState; history: Past[]; backHref: string; nextHref: string | null; isAdmin: boolean; move: ReactNode }) {
  const [done, setDone] = useState<string | null>(null);
  const at = FLOW.findIndex((f) => f.key === state);
  return (
    <div className="stack">
      <a className="ev-back" href={backHref}>← Volver a participantes</a>
      <header className="ev-head card">
        <div>
          <h2 style={{ margin: 0 }}>{name}</h2>
          <p className="muted" style={{ margin: "2px 0 0" }}>{[person.client, person.role].filter(Boolean).join(" · ") || "—"}</p>
        </div>
        <ol className="ev-flow" aria-label="Paso del flujo">
          {FLOW.map((f, i) => <li key={f.key} className={i < at ? "past" : i === at ? `now ${f.tone}` : ""}>{i + 1}. {f.label}</li>)}
        </ol>
        <dl className="ev-kv">
          <div><dt>Correo</dt><dd>{facts.email}</dd></div>
          <div><dt>Delivery</dt><dd>{facts.delivery ?? "Sin asignar"}</dd></div>
          <div><dt>Cuenta</dt><dd className={facts.account === "Activa" ? "ok" : "warn"}>{facts.account}</dd></div>
          <div><dt>Último ingreso</dt><dd>{facts.lastLogin ? fmtDate(facts.lastLogin) : "Nunca"}</dd></div>
          <div><dt>Etapa actual</dt><dd>{facts.stage}{facts.since ? <small className="muted"> · desde {fmtDate(facts.since)}</small> : null}</dd></div>
        </dl>
      </header>

      {!sub ? (
        <div className="card ev-empty">
          <strong>Aún no envía su reto.</strong>
          <p className="muted" style={{ margin: "4px 0 0" }}>{facts.account === "Activa" ? "Ya activó su cuenta: puede ver los módulos y subir su entrega desde su portal." : "Primero debe activar su cuenta (ingresar con su correo). Revisa con su Delivery."}</p>
        </div>
      ) : done ? (
        <Callout tone="ok" title={done}>
          <div className="row" style={{ marginTop: 8 }}>
            <a className="btn small ghost" href={backHref}>Volver a participantes</a>
            {nextHref && <a className="btn small" href={nextHref}>Siguiente por revisar →</a>}
          </div>
        </Callout>
      ) : (
        <>
          <h3 className="ev-sec">Entrega actual · intento {sub.attempt}</h3>
          <SubmissionCard s={sub} onDone={setDone} canReview={isAdmin} />
        </>
      )}

      {history.length > 0 && (
        <details className="card ev-history">
          <summary>Intentos anteriores ({history.length})</summary>
          <ul>
            {history.map((h) => (
              <li key={h.id}>
                <strong>Intento {h.attempt}</strong> · {fmtDate(h.submitted_at)} · {PAST[h.status] ?? h.status}{h.score != null ? ` · ${Math.round(Number(h.score))}/100` : ""}
                {h.feedback && <p className="muted" style={{ margin: "4px 0 0" }}>{h.feedback}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}

      {move}
    </div>
  );
}
