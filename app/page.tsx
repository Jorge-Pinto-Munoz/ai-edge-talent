import Link from "next/link";
import Image from "next/image";
import { EXPECTATIONS, HOME_FAQ, MI_ESPACIO, PUBLIC_STAGES, STAGE_GATES, WAVE3_DEADLINE, WAVE3_TIMELINE } from "@/lib/data/site";
import { Icon } from "@/components/site/Icon";
import { Reveal } from "@/components/site/Reveal";
import { Carousel } from "@/components/site/Carousel";
import { Countdown } from "@/components/site/Countdown";
import { StageCard } from "@/components/site/StageCard";

/**
 * Home del profesional, en el orden en que se decide:
 * portada → Wave 3 (qué pasa al inicio) → el programa (etapas y cómo se evalúa) → qué se espera de ti →
 * Mi espacio (el portal) → preguntas → cierre.
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
            <Link href="#wave-3" className="hero-chip">
              <span className="dot">Wave 3</span>
              <Countdown to={WAVE3_DEADLINE} compact openPrefix="Postulación abierta · " />
            </Link>
          </Reveal>
          <Reveal delay={80}>
            <div className="eyebrow">Kibernum · Programa de habilitación</div>
            <h1>
              AI Edge <span className="grad">Talent</span>
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="lead">IA integrada a tu trabajo real. Cinco etapas, de 30 a 45 días según tu ritmo, para desarrollar criterio, certificarte y llevar lo aprendido a un desafío concreto con tu cliente.</p>
            <div className="actions">
              <Link className="pill accent lg" href="/wave-3/postular">Postular a Wave 3 <Icon name="arrowRight" size={18} /></Link>
              <Link className="pill ghost lg" href="#programa">Conocer el programa</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 1 · Wave 3: qué pasa al inicio */}
      <section className="sec dark bleed anchor" id="wave-3">
        <div className="sec-inner w3-grid">
          <Reveal>
            <div className="eyebrow">Wave 3 · Postulación abierta</div>
            <h2 style={{ fontSize: "var(--fs-h2)", color: "#fff", margin: "0 0 16px", letterSpacing: "-0.02em" }}>Así comienza Wave 3.</h2>
            <p className="muted" style={{ fontSize: "var(--fs-lead)", marginBottom: 28 }}>Postulas hasta el viernes 16 de octubre a las 12:00. Postular no significa quedar seleccionado/a: si te seleccionan, aceptas formalmente tu compromiso y empiezas.</p>
            <Countdown to={WAVE3_DEADLINE} />
            <div className="actions" style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link className="pill accent lg" href="/wave-3/postular">Postular ahora <Icon name="arrowRight" size={18} /></Link>
              <Link className="pill ghost lg" href="/programa/assessment">Cómo es la postulación</Link>
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

      {/* 2 · El programa: etapas y cómo se evalúa */}
      <section className="sec bleed anchor" id="programa">
        <div className="sec-inner">
          <Reveal className="sec-head">
            <div>
              <div className="eyebrow">El programa</div>
              <h2>Cinco etapas. Un caso real al final.</h2>
              <p>Desliza para ver cada etapa. Toca una para conocer qué pasa, qué haces tú y cómo avanzas.</p>
            </div>
            <Link href="/programa" className="more-link">Ver el programa completo <Icon name="arrowRight" size={16} /></Link>
          </Reveal>
        </div>
        <Reveal delay={120}>
          <Carousel label="Etapas del programa">
            {PUBLIC_STAGES.map((s) => (
              <StageCard key={s.slug} stage={s} />
            ))}
          </Carousel>
        </Reveal>
        <div className="sec-inner" style={{ marginTop: 48 }}>
          <Reveal className="sec-head">
            <div>
              <div className="eyebrow">Cómo se evalúa</div>
              <h3 className="sub-h">Criterios conocidos desde el primer día.</h3>
            </div>
          </Reveal>
          <ol className="gates">
            {STAGE_GATES.map((g, i) => (
              <Reveal as="li" key={g.slug} delay={i * 60}>
                <span className="gate-n" aria-hidden="true">{i + 1}</span>
                <div>
                  <Link href={`/programa/${g.slug}`}><strong>{g.stage}</strong></Link>
                  <p>{g.how}</p>
                  {g.dims && <ul className="gate-dims" aria-label="Qué se evalúa">{g.dims.map((d) => <li key={d}>{d}</li>)}</ul>}
                </div>
                <p className="gate-pass"><Icon name="check" size={18} /> {g.pass}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* 3 · Qué se espera de ti */}
      <section className="sec dark bleed anchor" id="que-se-espera">
        <div className="sec-inner">
          <Reveal className="sec-head">
            <div>
              <div className="eyebrow">Qué se espera de ti</div>
              <h2>Tu compromiso, en concreto.</h2>
              <p>Lo que te pedimos y lo que recibes a cambio. Sin letra chica.</p>
            </div>
          </Reveal>
          <div className="expect">
            <Reveal className="expect-col">
              <h3>Tú te comprometes a</h3>
              <ul>
                {EXPECTATIONS.commit.map((c) => (
                  <li key={c.title}><span className="ico"><Icon name={c.icon} size={22} /></span><div><strong>{c.title}</strong><p>{c.body}</p></div></li>
                ))}
              </ul>
            </Reveal>
            <Reveal className="expect-col get" delay={120}>
              <h3>Y recibes</h3>
              <ul>
                {EXPECTATIONS.get.map((c) => (
                  <li key={c.title}><span className="ico"><Icon name={c.icon} size={22} /></span><div><strong>{c.title}</strong><p>{c.body}</p></div></li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 4 · Mi espacio */}
      <section className="sec anchor" id="mi-espacio">
        <div className="sec-inner me-grid">
          <Reveal>
            <div className="eyebrow">Mi espacio · Diseñado para profesionales</div>
            <h2 style={{ fontSize: "var(--fs-h2)", margin: "0 0 16px", letterSpacing: "-0.02em" }}>Todo tu recorrido, en tu bolsillo.</h2>
            <p className="muted" style={{ fontSize: "var(--fs-lead)" }}>Al aceptar tu compromiso se activa tu espacio personal. Es una app web pensada para el celular: sabes qué sigue, tienes tus materiales a mano y nadie te pregunta por correo en qué vas.</p>
            <ul className="me-list">
              {MI_ESPACIO.map((f) => (
                <li key={f.title}><span className="ico"><Icon name={f.icon} size={22} /></span><div><strong>{f.title}</strong><p>{f.body}</p></div></li>
              ))}
            </ul>
            <Link className="pill dark lg" href="/ingresar">Entrar a Mi espacio <Icon name="arrowRight" size={18} /></Link>
          </Reveal>
          <Reveal delay={120}>
            <div className="phones" role="region" aria-label="Pantallas de Mi espacio (datos de ejemplo)" tabIndex={0}>
            {[
              ["/images/mi-espacio/inicio.webp", "Inicio de Mi espacio: saludo, avance y tu siguiente paso"],
              ["/images/mi-espacio/camino.webp", "El camino por etapas, con hitos logrados y pendientes"],
              ["/images/mi-espacio/aicert.webp", "Tu avance AI CERT por tramos"],
            ].map(([src, alt], i) => (
              <figure key={src} className={`phone p${i}`}>
                <Image src={src} alt={alt} width={390} height={780} sizes="(max-width: 760px) 60vw, 260px" />
              </figure>
            ))}
            </div>
            <p className="phones-note">Pantallas reales de Mi espacio con datos de ejemplo.</p>
          </Reveal>
        </div>
      </section>

      {/* 5 · Preguntas */}
      <section className="sec anchor" id="preguntas" style={{ paddingTop: 0 }}>
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
