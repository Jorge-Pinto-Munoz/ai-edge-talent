import { layerName, type Layer } from "@/lib/journey/rules";
import { STAGE_STATUS, type StageStatus } from "@/lib/journey/closure";
import { CLOSING_LAYERS, STAGE_REFERENCE_DAYS, TEXT_FIELDS, isDelayed, personSatisfaction, type ExpPerson, type experience, type operational, type StageExperience } from "@/lib/pulse/experience";
import { Kpi } from "@/components/ds/Status";

type Ops = ReturnType<typeof operational>;
type Exp = ReturnType<typeof experience>;
const fmt = (x: number | null | undefined, suffix = "") => (x === null || x === undefined ? "—" : `${String(x).replace(".", ",")}${suffix}`);

/** Nivel 1 · Resumen: indicadores operacionales y de experiencia, separados. */
export function ExperienceSummary({ ops, exp, showExperience = true }: { ops: Ops; exp: Exp; showExperience?: boolean }) {
  return (
    <>
      <section className="card" aria-labelledby="op-t">
        <h2 id="op-t" style={{ marginTop: 0 }}>Avance operacional</h2>
        <div className="kpi-grid">
          <Kpi label="Inscritos" value={ops.enrolled} />
          <Kpi label="Activos" value={ops.active} hint={ops.neverSignedIn ? `${ops.neverSignedIn} sin primer ingreso` : "Todos ingresaron"} />
          <Kpi label="Journey completado" value={ops.completed} />
          <Kpi label="Requisitos académicos pendientes" value={ops.academicPending} />
          <Kpi label="Pulsos de cierre pendientes" value={ops.pulsePending} hint="Cumplieron requisitos; falta su pulso" />
          <Kpi label="Requieren atención" value={ops.attention} hint="Intentos agotados o pulso muy atrasado" />
          <Kpi label="Retrasados" value={ops.delayed} hint="Sobre los días de referencia de su etapa" />
        </div>
        <div className="table-wrap" tabIndex={0} style={{ marginTop: 14 }}>
          <table className="rtable">
            <thead><tr><th>Etapa</th><th>Personas hoy</th><th>Etapa cerrada</th><th>Referencia</th></tr></thead>
            <tbody>
              {(["AI_MINDSET", "ROLE_ENABLEMENT", "AI_LAB_SHOWCASE", "CLOSURE"] as Layer[]).map((l) => (
                <tr key={l}>
                  <td className="rt-title">{layerName(l)}</td>
                  <td data-label="Personas hoy">{ops.byStage[l]}</td>
                  <td data-label="Etapa cerrada">{ops.closedByStage[l]}</td>
                  <td data-label="Referencia"><small className="muted">{STAGE_REFERENCE_DAYS[l]} días</small></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {showExperience && (
        <section className="card" aria-labelledby="ex-t">
          <h2 id="ex-t" style={{ marginTop: 0 }}>Experiencia declarada</h2>
          <p className="muted" style={{ marginTop: 0 }}>Lo que las personas cuentan en sus pulsos de cierre. Es experiencia, no adopción: la adopción se mide con certificaciones verificadas, avance AI CERT y casos presentados.</p>
          <div className="kpi-grid">
            <Kpi label="Pulsos esperados" value={exp.expected} hint="Uno por persona y etapa con requisitos cumplidos" />
            <Kpi label="Pulsos completados" value={exp.completed} />
            <Kpi label="Tasa de respuesta" value={fmt(exp.rate, "%")} />
            <Kpi label="Satisfacción promedio" value={fmt(exp.satisfaction, " / 5")} hint={exp.satisfactionN ? `${exp.satisfactionN} ${exp.satisfactionN === 1 ? "respuesta" : "respuestas"} (1 a 5)` : "Sin respuestas todavía"} />
          </div>
          {exp.evolution.length > 0 && <h3 style={{ margin: "18px 0 0" }}>Satisfacción a lo largo del journey</h3>}
          {exp.evolution.length > 0 && (
            <div className="ex-evo" role="img" aria-label={`Satisfacción por etapa: ${exp.evolution.map((e) => `${layerName(e.layer)} ${fmt(e.satisfaction)}`).join(", ")}`}>
              {exp.evolution.map((e) => (
                <div key={e.layer} className="ex-evo-col">
                  <div className="ex-evo-bar" style={{ height: `${(e.satisfaction / 5) * 100}%` }}><b>{fmt(e.satisfaction)}</b></div>
                  <small>{layerName(e.layer)}<br /><span className="muted">{e.n} {e.n === 1 ? "respuesta" : "respuestas"}</span></small>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}

/** Nivel 2 · Por etapa: tasa, satisfacción, distribución y textos agrupados. */
export function ExperienceByStage({ exp, showNames = true }: { exp: Exp; showNames?: boolean }) {
  return (
    <>
      {exp.stages.map((s) => <StageBlock key={s.layer} s={s} showNames={showNames} />)}
    </>
  );
}

function StageBlock({ s, showNames }: { s: StageExperience; showNames: boolean }) {
  const max = Math.max(1, ...s.distribution);
  return (
    <section className="card" aria-labelledby={`st-${s.layer}`}>
      <div className="spread">
        <h2 id={`st-${s.layer}`} style={{ margin: 0 }}>{layerName(s.layer)}</h2>
        <span className="muted"><small>{s.completed} de {s.expected} esperados · {fmt(s.rate, "%")}</small></span>
      </div>
      {s.completed === 0 ? <p className="muted">Sin pulsos de cierre todavía.</p> : (
        <>
          {s.satisfaction === null ? (
            <p className="muted"><small>Estas respuestas son anteriores a las cinco preguntas base: no registran satisfacción ni textos de cierre.</small></p>
          ) : (
            <div className="ex-dist" aria-label={`Satisfacción promedio ${fmt(s.satisfaction)} de 5`}>
              <strong>{fmt(s.satisfaction, " / 5")}</strong>
              <ul>{s.distribution.map((n, i) => <li key={i}><span>{i + 1}</span><i style={{ width: `${(n / max) * 100}%` }} /><small>{n}</small></li>)}</ul>
            </div>
          )}
          <div className="ex-texts">
            {TEXT_FIELDS.map(([f, label]) => (
              <details key={f}>
                <summary><strong>{label}</strong> <small className="muted">· {s.texts[f].length}{f === "mejorar" && s.nothingToImprove ? ` · ${s.nothingToImprove} «Nada por ahora»` : ""}</small></summary>
                {s.texts[f].length === 0 ? <p className="muted">Sin respuestas.</p> : (
                  <ul>{s.texts[f].map((t, i) => <li key={i}>{t.text}{showNames && <small className="muted"> — {t.name}{t.client ? ` · ${t.client}` : ""}</small>}</li>)}</ul>
                )}
              </details>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

const SHORT: Partial<Record<Layer, string>> = { AI_MINDSET: "Mindset", ROLE_ENABLEMENT: "Certificación", AI_LAB_SHOWCASE: "AI Lab", CLOSURE: "Cierre" };
const tone = (s: StageStatus) => STAGE_STATUS[s].tone;

/** Nivel 3 · Detalle: cada persona con su etapa, estado y satisfacción por etapa. */
export function ExperienceDetail({ people, deliveryName, showExperience = true }: { people: ExpPerson[]; deliveryName?: (e: string | null) => string; showExperience?: boolean }) {
  const now = new Date();
  if (!people.length) return <p className="muted">No hay personas con estos filtros.</p>;
  return (
    <div className="table-wrap" tabIndex={0}>
      <table className="rtable">
        <thead>
          <tr>
            <th>Profesional</th><th>Etapa</th><th>Estado</th>
            {deliveryName && <th>Delivery</th>}
            {showExperience && <th>Satisfacción por etapa</th>}
          </tr>
        </thead>
        <tbody>
          {people.map((p) => {
            const sat = personSatisfaction(p);
            return (
              <tr key={p.id}>
                <td className="rt-title">{p.name}<br /><small className="muted">{[p.client, !p.signedIn && "sin primer ingreso"].filter(Boolean).join(" · ")}</small></td>
                <td data-label="Etapa">{layerName(p.layer)}{isDelayed(p, now) && <><br /><small className="error">Retrasado/a</small></>}</td>
                <td data-label="Estado"><span className={`ds-status s-${tone(p.status)}`}>{STAGE_STATUS[p.status].label}</span></td>
                {deliveryName && <td data-label="Delivery">{p.delivery ? deliveryName(p.delivery) : <span className="error">Sin asignar</span>}</td>}
                {showExperience && (
                  <td data-label="Satisfacción">
                    {CLOSING_LAYERS.filter((l) => sat[l] !== undefined).map((l) => <span key={l} className="ex-chip" title={layerName(l)}>{SHORT[l]} {sat[l]}</span>)}
                    {!Object.keys(sat).length && <span className="muted">—</span>}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
