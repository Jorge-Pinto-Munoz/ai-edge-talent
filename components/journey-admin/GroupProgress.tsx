import { GpList } from "./GpList";
import type { Coverage, Light } from "@/lib/journey/coverage";

const LIGHT: Record<Light, { label: string; hint: string }> = {
  green: { label: "Completado", hint: "Cumplió esta etapa o ya avanzó" },
  yellow: { label: "En proceso", hint: "Entregó y está en revisión o corrigiendo" },
  red: { label: "Falta", hint: "Aún no entrega o no ha comenzado" },
};

/** Avance del grupo completo en la etapa: barra de semáforo + quiénes están en cada color. */
export function GroupProgress({ cov, stageName, doneLabel, dropped = [] }: { cov: Coverage; stageName: string; doneLabel: string; dropped?: string[] }) {
  // Alerta de la etapa: quién no ha rendido, quién quedó bloqueado y quién no continuó en el programa.
  const red = cov.rows.filter((r) => r.light === "red");
  const blocked = red.filter((r) => /intentos/i.test(r.reason));
  const missing = red.filter((r) => !/intentos/i.test(r.reason));
  const names = (xs: { name: string }[]) => xs.slice(0, 4).map((x) => x.name.split(" ").slice(0, 2).join(" ")).join(", ") + (xs.length > 4 ? ` y ${xs.length - 4} más` : "");
  const order: Light[] = ["green", "yellow", "red"];
  return (
    <section className="card gp" aria-labelledby="gp-t">
      <div className="gp-head">
        <div>
          <h2 id="gp-t" className="h-card" style={{ margin: 0 }}>Avance del grupo en {stageName}</h2>
          <p className="muted" style={{ margin: "2px 0 0" }}>El 100 % es todo el grupo que pasó el Assessment ({cov.total} personas).</p>
        </div>
        <div className="gp-big" aria-label={`${cov.count.green} de ${cov.total} ${doneLabel}`}>
          <strong>{cov.count.green}<small>/{cov.total}</small></strong>
          <span>{doneLabel} · {cov.pct.green}%</span>
        </div>
      </div>
      <div className="gp-bar" role="img" aria-label={order.map((k) => `${LIGHT[k].label}: ${cov.count[k]} (${cov.pct[k]}%)`).join(", ")}>
        {order.map((k) => cov.count[k] > 0 && <span key={k} className={`gp-seg ${k}`} style={{ width: `${(cov.count[k] / Math.max(cov.total, 1)) * 100}%` }}>{cov.pct[k] >= 8 ? `${cov.pct[k]}%` : ""}</span>)}
      </div>
      <ul className="gp-legend">
        {order.map((k) => <li key={k} className={k}><i aria-hidden="true" /> <strong>{cov.count[k]}</strong> {LIGHT[k].label} <small>· {cov.pct[k]}%</small></li>)}
      </ul>
      {cov.ahead.n > 0 && (
        <p className="gp-note">Incluye {cov.ahead.n} persona{cov.ahead.n === 1 ? "" : "s"} que ya {cov.ahead.n === 1 ? "está" : "están"} en {cov.ahead.where.join(" y ")}: cuenta{cov.ahead.n === 1 ? "" : "n"} como completada{cov.ahead.n === 1 ? "" : "s"} en esta etapa.</p>
      )}
      {(red.length > 0 || dropped.length > 0) && (
        <div className="gp-alert" role="alert">
          <strong>Atención en {stageName}</strong>
          <ul>
            {missing.length > 0 && <li><b>{missing.length}</b> sin completar: {names(missing)}.</li>}
            {blocked.length > 0 && <li><b>{blocked.length}</b> usó todos sus intentos (decide si darle uno extra o moverla): {names(blocked)}.</li>}
            {dropped.length > 0 && <li><b>{dropped.length}</b> no continuó (dado/a de baja del programa): {names(dropped.map((name) => ({ name })))}.</li>}
          </ul>
        </div>
      )}
      <div className="gp-cols">
        {(["red", "yellow", "green"] as Light[]).map((k) => {
          const people = cov.rows.filter((r) => r.light === k);
          return (
            <div key={k} className={`gp-col ${k}`}>
              <h3><i aria-hidden="true" /> {LIGHT[k].label} <small>{people.length} · {cov.pct[k]}%</small></h3>
              <p className="muted"><small>{LIGHT[k].hint}</small></p>
              <GpList people={people.map((r) => ({ id: r.id, name: r.name, detail: `${r.reason}${r.client ? ` · ${r.client}` : ""}` }))} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
