import Link from "next/link";
import { BENEFITS, HOME_FAQ, PUBLIC_STAGES, SITE_INDEX, WAVE3_DEADLINE, WAVE3_TIMELINE } from "@/lib/data/site";
import { Icon } from "@/components/site/Icon";
import { Reveal } from "@/components/site/Reveal";
import { Carousel } from "@/components/site/Carousel";
import { Countdown } from "@/components/site/Countdown";
import { StageCard } from "@/components/site/StageCard";
import { IndexGrid } from "@/components/site/Blocks";

/**
 * Home: de menos a más. Portada → índice de todo lo que hay → etapas (deslizables) →
 * por qué AET → Wave 3 → preguntas → cierre. Cada bloque resume y lleva a su página de detalle.
 */
export default function Home() {
  return (
    <div className="site-main">
      {/* Portada */}
      <section className="hero-x bleed">
        <div className="photo" role="img" aria-label="Profesionales TI trabajando en equipo (imagen ilustrativa)" style={{ backgroundImage: "url(/images/equipo.webp)" }} />
        <span className="glow c" aria-hidden="true" />
        <span className="glow m" aria-hidden="true" />
        <div className="hero-x-body">
          <Reveal>
            <Link href="/wave-3/postular" className="hero-chip">
              <span className="dot">Wave 3</span>
              Postulación abierta · <Countdown to={WAVE3_DEADLINE} compact />
            </Link>
          </Reveal>
          <Reveal delay={80}>
            <div className="eyebrow">Kibernum · Programa de habilitación</div>
            <h1>
              AI Edge <span className="grad">Talent</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="lead">IA integrada a tu trabajo real. Un recorrido de cinco etapas para desarrollar criterio, certificarte y llevar lo aprendido a un desafío concreto con tu cliente.</p>
            <div className="actions">
              <Link className="pill accent lg" href="/wave-3/postular">Postular a Wave 3 <Icon name="arrowRight" size={18} /></Link>
              <Link className="pill ghost lg" href="/programa">Conocer el programa</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Índice: todo lo que encuentras aquí */}
      <section className="sec tight">
        <div className="sec-inner">
          <Reveal className="sec-head">
            <div>
              <div className="eyebrow">Todo en un lugar</div>
              <h2>¿Qué estás buscando?</h2>
            </div>
          </Reveal>
          <IndexGrid tiles={SITE_INDEX} />
        </div>
      </section>

      {/* Etapas: deslizables */}
      <section className="sec dark bleed" id="etapas">
        <div className="sec-inner">
          <Reveal className="sec-head">
            <div>
              <div className="eyebrow">El recorrido</div>
              <h2>Cinco etapas. Un caso real al final.</h2>
              <p>Desliza para ver cada etapa. Toca una para conocer qué pasa, qué haces tú y cómo avanzas.</p>
            </div>
            <Link href="/programa" className="more-link">Ver el programa <Icon name="arrowRight" size={16} /></Link>
          </Reveal>
        </div>
        <Reveal delay={120}>
          <Carousel label="Etapas del programa" dark>
            {PUBLIC_STAGES.map((s) => (
              <StageCard key={s.slug} stage={s} />
            ))}
          </Carousel>
        </Reveal>
      </section>

      {/* Por qué AET */}
      <section className="sec">
        <div className="sec-inner">
          <Reveal className="sec-head">
            <div>
              <div className="eyebrow">Por qué AET</div>
              <h2>Aprendes haciendo, con acompañamiento y un resultado que se ve.</h2>
            </div>
          </Reveal>
          <div className="bento">
            {BENEFITS.map((b, i) => (
              <Reveal key={b.title} delay={i * 70} className={`bento-tile ${b.size ?? ""}`}>
                <span className="orb" aria-hidden="true" />
                <span className="ico"><Icon name={b.icon} size={28} /></span>
                <h3>{b.title}</h3>
                <p>{b.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Wave 3 */}
      <section className="sec dark bleed">
        <div className="sec-inner w3-grid">
          <Reveal>
            <div className="eyebrow">Wave 3 · Postulación abierta</div>
            <h2 style={{ fontSize: "var(--fs-h2)", color: "#fff", margin: "0 0 16px", letterSpacing: "-0.02em" }}>Tienes hasta el viernes 16 de octubre a las 12:00.</h2>
            <p className="muted" style={{ fontSize: "var(--fs-lead)", marginBottom: 28 }}>Postular no significa quedar seleccionado/a. Si te seleccionan, antes de comenzar aceptas formalmente tu compromiso.</p>
            <Countdown to={WAVE3_DEADLINE} />
            <div className="actions" style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link className="pill accent lg" href="/wave-3/postular">Postular ahora <Icon name="arrowRight" size={18} /></Link>
              <Link className="pill ghost lg" href="/programa/assessment">Cómo se evalúa</Link>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <ol className="timeline vertical">
              {WAVE3_TIMELINE.map((t) => (
                <li key={t.title}>
                  <div className="when">{t.when}</div>
                  <h3>{t.title}</h3>
                  <p>{t.body}</p>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>

      {/* Preguntas */}
      <section className="sec">
        <div className="sec-inner faq-grid">
          <Reveal>
            <div className="eyebrow">Preguntas frecuentes</div>
            <h2 style={{ fontSize: "var(--fs-h2)", margin: "0 0 16px", letterSpacing: "-0.02em" }}>Lo que más nos preguntan.</h2>
            <Link href="/ayuda" className="more-link">Ver todas las preguntas <Icon name="arrowRight" size={16} /></Link>
          </Reveal>
          <Reveal delay={100} className="faq-x">
            {HOME_FAQ.map((f) => (
              <details key={f.q}>
                <summary>
                  {f.q}
                  <span className="plus"><Icon name="plus" size={18} /></span>
                </summary>
                <p>{f.a}</p>
              </details>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Cierre */}
      <section className="sec-inner" style={{ paddingBottom: "var(--sp-section)" }}>
        <Reveal className="cta-band">
          <div>
            <h2>¿Listo/a para llevar la IA a tu trabajo real?</h2>
            <p>Postula a Wave 3 o recorre el programa con calma antes de decidir.</p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="pill accent lg" href="/wave-3/postular">Postular a Wave 3</Link>
            <Link className="pill ghost lg" href="/programa">Ver el programa</Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
