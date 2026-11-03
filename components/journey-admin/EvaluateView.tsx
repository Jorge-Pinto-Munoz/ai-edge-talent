"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Callout, fmtDate } from "@/components/ui";
import { SubmissionCard, type Sub } from "./ReviewQueue";
import { FLOW } from "./SubmissionsPanel";
import type { DeliveryState } from "@/lib/journey/delivery-status";

type Past = { id: string; attempt: number; status: string; score: number | null; feedback: string | null; submitted_at: string };
const PAST: Record<string, string> = { APPROVED: "Aprobada", NOT_APPROVED: "No aprobada", SUBMITTED: "Por revisar", HUMAN_REVIEW: "Revisión humana" };

/** Evaluación de una entrega: persona, paso del flujo, intentos anteriores y la revisión (IA + decisión). */
export function EvaluateView({ sub, person, state, history, backHref, nextHref, isAdmin }: { sub: Sub; person: { client: string | null; role: string | null }; state: DeliveryState; history: Past[]; backHref: string; nextHref: string | null; isAdmin: boolean }) {
  const [done, setDone] = useState<string | null>(null);
  const router = useRouter();
  const at = FLOW.findIndex((f) => f.key === state);
  return (
    <div className="stack">
      <Link className="ev-back" href={backHref}>← Volver al listado</Link>
      <header className="ev-head">
        <div>
          <h2 style={{ margin: 0 }}>{sub.person}</h2>
          <p className="muted" style={{ margin: "2px 0 0" }}>{[person.client, person.role].filter(Boolean).join(" · ") || "—"} · {sub.capsules.title}</p>
        </div>
        <ol className="ev-flow" aria-label="Paso del flujo">
          {FLOW.map((f, i) => <li key={f.key} className={i < at ? "past" : i === at ? `now ${f.tone}` : ""}>{f.label}</li>)}
        </ol>
      </header>

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

      {done ? (
        <Callout tone="ok" title={done}>
          <div className="row" style={{ marginTop: 8 }}>
            <Link className="btn small ghost" href={backHref} onClick={() => router.refresh()}>Volver al listado</Link>
            {nextHref && <Link className="btn small" href={nextHref}>Siguiente por revisar →</Link>}
          </div>
        </Callout>
      ) : (
        <SubmissionCard s={sub} onDone={setDone} canReview={isAdmin} />
      )}
    </div>
  );
}
