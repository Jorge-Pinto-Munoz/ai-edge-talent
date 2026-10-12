import Link from "next/link";
import { PROGRAM_QA, FAQ_BY_ROLE } from "@/lib/data/program";
import { ASSESSMENT_DIMENSIONS, LIFECYCLE, TRACK_LABEL } from "@/lib/data/journey";
import { FaqList, LifecycleRail } from "./journey";
import { BrandHero } from "./ui";

/** Portal de información permanente. Reutilizado en /programa y /kiber/programa. */
export function ProgramPortal({ intro }: { intro?: React.ReactNode }) {
  return (
    <div className="stack">
      <BrandHero
        image="retrato-perfil"
        photoLeft
        eyebrow="Portal del programa"
        title={<>AI EDGE<br />TALENT</>}
        display
        lead="Una experiencia de desarrollo para profesionales TI que quieren integrar inteligencia artificial de manera más profunda a su rol, desarrollar criterio y llevar ese aprendizaje a desafíos reales de su trabajo."
      >
        {intro}
      </BrandHero>

      <nav className="row" aria-label="Secciones">
        {PROGRAM_QA.map((s) => (
          <a key={s.section} className="btn ghost small" href={`#${encodeURIComponent(s.section)}`}>
            {s.section}
          </a>
        ))}
        <a className="btn ghost small" href="#etapas">Etapas</a>
        <a className="btn ghost small" href="#faq">Preguntas frecuentes</a>
      </nav>

      {PROGRAM_QA.map((s) => (
        <section key={s.section} id={encodeURIComponent(s.section)} className="card">
          <h2 style={{ marginTop: 0 }}>{s.section}</h2>
          {s.items.map((x) => (
            <div key={x.q} style={{ marginBottom: 14 }}>
              <h3 style={{ marginBottom: 4 }}>{x.q}</h3>
              <p className="muted" style={{ margin: 0 }}>{x.a}</p>
            </div>
          ))}
        </section>
      ))}

      <section id="etapas">
        <h2>Etapas del ciclo completo</h2>
        <LifecycleRail />
        <div className="table-wrap" tabIndex={0} style={{ marginTop: 12 }}>
          <table>
            <thead>
              <tr>
                <th>Etapa</th>
                <th>Tipo</th>
                <th>Qué evalúa</th>
                <th>Si no se cumple</th>
              </tr>
            </thead>
            <tbody>
              {LIFECYCLE.map((s) => (
                <tr key={s.id}>
                  <td>
                    <strong>{s.name}</strong>
                    <br />
                    <small className="muted">{s.summary}</small>
                  </td>
                  <td>{TRACK_LABEL[s.track]}</td>
                  <td>{s.evaluates}</td>
                  <td>{s.ifNotPassed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card" style={{ marginTop: 12 }}>
          <h3>Dimensiones del Assessment</h3>
          <ul>
            {ASSESSMENT_DIMENSIONS.map((d) => (
              <li key={d.id}>
                {d.label} — <strong>{d.weight}%</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="faq" className="card">
        <h2 style={{ marginTop: 0 }}>Preguntas frecuentes</h2>
        <FaqList items={[...FAQ_BY_ROLE.KIBER, ...FAQ_BY_ROLE.CLIENT.slice(0, 4)]} />
        <p style={{ marginTop: 12 }}>
          Más preguntas por rol en <Link href="/ayuda">Ayuda</Link>. Responsabilidades por etapa en <Link href="/responsabilidades">RACI</Link>.
        </p>
      </section>
    </div>
  );
}
