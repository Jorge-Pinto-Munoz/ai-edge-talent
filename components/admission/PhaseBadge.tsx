import { PHASES, PHASE_STATE, phasesOf, type PhaseState } from "@/lib/admission/phases";

/** Estado de una fase de Admisión: el mismo color y texto en tabla, filtros y detalle. */
export function PhaseBadge({ state }: { state: PhaseState }) {
  const m = PHASE_STATE[state];
  return <span className={`ph-badge t-${m.tone}`} title={m.hint}>{m.label}</span>;
}

/** Las cuatro fases de un candidato, en orden; las que aún no alcanza se muestran como pendientes. */
export function PhaseStrip({ status }: { status: string }) {
  const p = phasesOf(status);
  return (
    <dl className="ph-strip">
      {PHASES.map((ph) => (
        <div key={ph.key}>
          <dt>{ph.label}</dt>
          <dd>{p[ph.key] ? <PhaseBadge state={p[ph.key] as PhaseState} /> : <span className="muted">Aún no</span>}</dd>
        </div>
      ))}
    </dl>
  );
}
