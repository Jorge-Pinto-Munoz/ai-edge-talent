import { AICERT, AICERT_AFTER, AICERT_CLIENT, AICERT_IMPACT, AICERT_REWARDS, ROLE_PATHS } from "@/lib/data/aicert";
import { Icon } from "@/components/site/Icon";
import type { CertStat } from "@/lib/aicert/stats";

/**
 * AI CERT explicado de una vez: qué es, ruta por rol, qué recibes, cómo te acompañamos y qué impacto buscamos.
 * `audience` cambia el tono (profesional: "tú"; cliente: su equipo). `compact` para la hoja de Mi journey.
 */
export function AiCertSection({ audience, stat, compact = false, id }: { audience: "profesional" | "cliente"; stat: CertStat | null; compact?: boolean; id?: string }) {
  const pro = audience === "profesional";
  return (
    <section className={`aic ${compact ? "compact" : ""}`} id={id} aria-labelledby={`${id ?? "aic"}-t`}>
      <header className="aic-head">
        <span className="aic-eyebrow">Certificación por rol · AI CERTs™</span>
        <h2 id={`${id ?? "aic"}-t`}>{pro ? "Tu certificación en IA aplicada a tu rol" : "Profesionales certificados en IA aplicada a su rol"}</h2>
        <p className="aic-lead">{pro ? AICERT.what : AICERT_CLIENT.intro}</p>
        {pro && <p className="aic-sub">{AICERT.hybrid}</p>}
        <dl className="aic-facts">
          {AICERT.format.map((f) => (
            <div key={f.k}><dt>{f.k}</dt><dd>{f.v}</dd></div>
          ))}
        </dl>
      </header>

      <div className="aic-block">
        <h3>{pro ? "Tu ruta según tu rol" : "Rutas por rol"}</h3>
        <ol className="aic-paths">
          {ROLE_PATHS.map((r) => (
            <li key={r.family}>
              <div className="aic-path-top">
                <strong>{r.family}</strong>
                <span className="aic-profile">{r.profile}</span>
              </div>
              <small>{r.roles}</small>
              <p>{r.focus}</p>
            </li>
          ))}
        </ol>
        <p className="aic-note">La ruta exacta se confirma según tu cargo antes de la inscripción. {AICERT.gate}</p>
        <a className="more-link" href="/certificaciones">Ver todas las certificaciones y sus mallas <Icon name="arrowRight" size={16} /></a>
      </div>

      <div className="aic-block">
        <h3>{pro ? "Al aprobar recibes" : "Lo que recibe cada profesional"}</h3>
        <ul className="aic-rewards">
          {AICERT_REWARDS.map((r) => (
            <li key={r.title}>
              <span className="aic-ico"><Icon name={r.icon} size={22} /></span>
              <span><strong>{r.title}</strong><small>{r.body}</small></span>
            </li>
          ))}
        </ul>
        {!pro && (
          <ul className="aic-checks">
            {AICERT_CLIENT.receives.map((x) => <li key={x}><Icon name="check" size={18} /> {x}</li>)}
          </ul>
        )}
      </div>

      {!compact && (
        <div className="aic-block">
          <h3>{pro ? "Después de certificarte, te seguimos acompañando" : "Acompañamiento después de la certificación"}</h3>
          <ol className="aic-after">
            {AICERT_AFTER.map((a) => (
              <li key={a.title}>
                <span className="when">{a.when}</span>
                <strong>{a.title}</strong>
                <p>{a.body}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="aic-impact">
        <div>
          <span className="aic-eyebrow">Impacto que buscamos</span>
          <strong className="big">{AICERT_IMPACT.headline}</strong>
          <p>{AICERT_IMPACT.body}</p>
        </div>
        <div className="aic-stat" role="note">
          {stat ? (
            <>
              <strong className="big">{stat.rate}%</strong>
              <p>de quienes ingresaron en {stat.waves.join(" y ")} obtuvo su certificación AI CERT ({stat.certified} de {stat.enrolled}).</p>
            </>
          ) : (
            <>
              <strong className="mid">Resultados por Wave</strong>
              <p>Publicaremos aquí el porcentaje de ingresados que obtuvo su certificación, calculado con los resultados reales de las Waves cerradas.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
