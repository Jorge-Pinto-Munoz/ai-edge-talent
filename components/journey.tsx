"use client";

import { useState } from "react";
import { LIFECYCLE, TRACK_LABEL, stage, type LifecycleStageId } from "@/lib/data/journey";
import { DELIVERY_PLAYBOOK, type PlaybookStage } from "@/lib/data/playbook";
import { RACI, RACI_ACTORS } from "@/lib/data/raci";
import { CLIENT_COMMITMENTS, KIBER_COMMITMENTS, KIBERNUM_COMMITMENTS, type QA } from "@/lib/data/program";
import { Pending } from "./ui";

export type ExpectationAudience = "kiber" | "delivery" | "client" | "aetEvidence";

const AUDIENCE: Record<ExpectationAudience, { who: string; question: string }> = {
  kiber: { who: "Para el Kiber", question: "¿Qué se espera de mí?" },
  delivery: { who: "Para Delivery", question: "¿Qué debo asegurar?" },
  client: { who: "Para el Cliente", question: "¿Qué puede esperar?" },
  aetEvidence: { who: "Para AET", question: "¿Qué evidencia debe existir?" },
};

/** Misma información del journey, adaptada según el rol. */
export function ExpectationCard({ stageId, audiences }: { stageId: LifecycleStageId; audiences?: ExpectationAudience[] }) {
  const s = stage(stageId);
  const list = audiences ?? (Object.keys(AUDIENCE) as ExpectationAudience[]);
  return (
    <div className="card">
      <div className="spread">
        <h3 style={{ margin: 0 }}>{s.name}</h3>
        <span className="badge">{TRACK_LABEL[s.track]}</span>
      </div>
      <p className="muted" style={{ marginTop: 6 }}>{s.summary}</p>
      <div className="grid grid-2">
        {list.map((a) => (
          <div key={a}>
            <div className="eyebrow">{AUDIENCE[a].who}</div>
            <strong>{AUDIENCE[a].question}</strong>
            <ul>
              {s.expectations[a].map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p style={{ marginBottom: 0 }}>
        <small>
          <strong>Qué se evalúa:</strong> {s.evaluates} · <strong>Si no se cumple:</strong> {s.ifNotPassed}
        </small>
      </p>
    </div>
  );
}

/** Ciclo completo con tracks diferenciados. */
export function LifecycleRail({ current, only }: { current?: LifecycleStageId; only?: LifecycleStageId[] }) {
  const items = only ? LIFECYCLE.filter((s) => only.includes(s.id)) : LIFECYCLE;
  return (
    <div className="rail">
      {items.map((s, i) => (
        <div key={s.id} className={`rail-item ${current === s.id ? "current" : ""}`} aria-current={current === s.id ? "step" : undefined}>
          <div className="track">{TRACK_LABEL[s.track]}</div>
          <strong>
            {i + 1}. {s.name}
          </strong>
        </div>
      ))}
    </div>
  );
}

export function DeliveryStageChecklist({ stage: st }: { stage: PlaybookStage }) {
  const [done, setDone] = useState<string[]>([]);
  const toggle = (x: string) => setDone((d) => (d.includes(x) ? d.filter((y) => y !== x) : [...d, x]));
  const Block = ({ title, items, tone }: { title: string; items: string[]; tone?: string }) => (
    <div>
      <div className="eyebrow" style={tone ? { color: tone } : undefined}>{title}</div>
      <ul>
        {items.map((x) => (
          <li key={x}>{x.includes("PENDIENTE DE DEFINICIÓN") ? <Pending what={x.replace("PENDIENTE DE DEFINICIÓN", "").trim()} /> : x}</li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className="card" id={st.id}>
      <div className="spread">
        <h3 style={{ margin: 0 }}>{st.name}</h3>
        <span className="badge brand">
          {done.length}/{st.mustDo.length} hechos
        </span>
      </div>
      <div className="grid grid-2" style={{ marginTop: 10 }}>
        <div>
          <div className="eyebrow">Debe hacer</div>
          {st.mustDo.map((x) => (
            <label key={x} className="check">
              <input type="checkbox" checked={done.includes(x)} onChange={() => toggle(x)} />
              <span>{x}</span>
            </label>
          ))}
        </div>
        <div className="stack">
          <Block title="No debe hacer" items={st.mustNotDo} tone="var(--bad)" />
          <Block title="Evidencia que debe existir" items={st.evidence} />
          <Block title="Cuándo escalar" items={st.escalateWhen} tone="var(--warn)" />
          <Block title="Qué comunicar" items={st.communicate} />
        </div>
      </div>
    </div>
  );
}

export function DeliveryPlaybookList() {
  return (
    <div className="stack">
      {DELIVERY_PLAYBOOK.map((s) => (
        <DeliveryStageChecklist key={s.id} stage={s} />
      ))}
    </div>
  );
}

export function ResponsibilityMatrix() {
  return (
    <div className="table-wrap" tabIndex={0}>
      <table className="raci">
        <thead>
          <tr>
            <th>Etapa</th>
            {RACI_ACTORS.map((a) => (
              <th key={a} style={{ textAlign: "center" }}>
                {a}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {RACI.map((row) => (
            <tr key={row.stage}>
              <td>
                <strong>{row.label}</strong>
              </td>
              {RACI_ACTORS.map((a) => {
                const c = row.cells[a];
                return (
                  <td key={a} className="cell">
                    {c ? (
                      <>
                        <span className="letters">{c.letters.join(" / ")}</span>
                        {c.note && <span className="note">{c.note}</span>}
                      </>
                    ) : (
                      <span className="pending-def" style={{ fontSize: "0.68rem" }}>PENDIENTE DE DEFINICIÓN</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CommitmentSummaryCard() {
  return (
    <div className="stack">
      <div className="card">
        <h3>Si eres seleccionado/a, esperamos que:</h3>
        <div className="grid grid-2">
          {KIBER_COMMITMENTS.map((c) => (
            <div key={c.title} style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
              <strong>{c.title}</strong>
              <p className="muted" style={{ marginTop: 4 }}>{c.body}</p>
              {c.bullets && (
                <ul className="muted">
                  {c.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-2">
        <div className="card">
          <h3>Nuestro compromiso contigo</h3>
          <p className="muted">Kibernum aporta:</p>
          <ul>
            {KIBERNUM_COMMITMENTS.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <h3>Compromiso esperado del cliente</h3>
          <p className="muted">El cliente:</p>
          <ul>
            {CLIENT_COMMITMENTS.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className="muted">
            <small>La disponibilidad se coordina según etapa: no es una cantidad exacta garantizada todas las semanas.</small>
          </p>
        </div>
      </div>
    </div>
  );
}

export function FaqList({ items }: { items: QA[] }) {
  return (
    <div>
      {items.map((x) => (
        <details key={x.q} className="faq">
          <summary>{x.q}</summary>
          <p>{x.a}</p>
        </details>
      ))}
    </div>
  );
}
