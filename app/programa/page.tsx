import Link from "next/link";
import type { CSSProperties } from "react";
import { PROGRAM_QA } from "@/lib/data/program";
import { ASSESSMENT_DIMENSIONS } from "@/lib/data/journey";
import { PUBLIC_STAGES } from "@/lib/data/site";
import { Icon } from "@/components/site/Icon";
import { Reveal } from "@/components/site/Reveal";
import { Carousel } from "@/components/site/Carousel";
import { StageCard } from "@/components/site/StageCard";
import { AudienceTabs } from "@/components/site/AudienceTabs";
import { FaqTabs } from "@/components/site/FaqTabs";

export const metadata = { title: "El programa · AI Edge Talent" };

/** Hub del programa: qué es → etapas → para quién → cómo se evalúa → preguntas. Cada etapa tiene su página. */
export default function ProgramaPage() {
  return (
    <div className="site-main">
      <section className="hero-x bleed" style={{ minHeight: "min(680px, 86vh)" }}>
        <div className="photo" role="img" aria-label="Profesional TI (imagen ilustrativa)" style={{ backgroundImage: "url(/images/retrato-perfil.webp)", "--photo-pos": "75% center" } as CSSProperties} />
        <span className="glow c" aria-hidden="true" />
        <span className="glow m" aria-hidden="true" />
        <div className="hero-x-body">
          <Reveal>
            <div className="eyebrow">El programa</div>
            <h1 style={{ textTransform: "none", fontSize: "var(--fs-h1)", lineHeight: 1.05 }}>IA en tu rol.<br /><span className="grad">Evidencia real.</span></h1>
          </Reveal>
          <Reveal delay={100}>
            <p className="lead">Una experiencia de desarrollo para profesionales TI que quieren integrar inteligencia artificial de forma más profunda a su trabajo. No es solo un curso ni solo una certificación.</p>
            <div className="actions">
              <a className="pill accent lg" href="#etapas">Ver las etapas <Icon name="arrowRight" size={18} /></a>
              <Link className="pill ghost lg" href="/wave-3/postular">Postular a Wave 3</Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="sec" id="que-es">
        <div className="sec-inner split">
          <Reveal>
            <div className="eyebrow">Qué es</div>
            <h2 style={{ fontSize: "var(--fs-h2)", margin: "0 0 16px", letterSpacing: "-0.02em" }}>Evolucionas mientras prestas servicios.</h2>
            <p className="muted" style={{ fontSize: "var(--fs-lead)" }}>Integras IA a tu forma de trabajar y demuestras valor frente a tu cliente con evidencia concreta. Se prioriza a quienes ya usan IA, tienen ganas genuinas de aprender y una oportunidad real de aplicarla.</p>
            <div className="stat-row">
              <div className="stat"><strong>30–45</strong><small>días de recorrido</small></div>
              <div className="stat"><strong>5</strong><small>etapas</small></div>
              <div className="stat"><strong>1</strong><small>caso real con impacto</small></div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="media" style={{ backgroundImage: "url(/images/colaboracion.webp)" }} role="img" aria-label="Equipo colaborando (imagen ilustrativa)" />
          </Reveal>
        </div>
      </section>

      <section className="sec dark bleed" id="etapas">
        <div className="sec-inner">
          <Reveal className="sec-head">
            <div>
              <div className="eyebrow">Las etapas</div>
              <h2>Un recorrido que va de menos a más.</h2>
              <p>Cada etapa tiene un objetivo, una evidencia y una regla para avanzar. Desliza y toca para ver el detalle.</p>
            </div>
          </Reveal>
        </div>
        <Reveal delay={100}>
          <Carousel label="Etapas del programa" dark>
            {PUBLIC_STAGES.map((s) => <StageCard key={s.slug} stage={s} />)}
          </Carousel>
        </Reveal>
      </section>

      <section className="sec" id="para-quien">
        <div className="sec-inner">
          <span id="cliente" style={{ position: "relative", top: -96 }} />
          <Reveal className="sec-head">
            <div>
              <div className="eyebrow">Para quién</div>
              <h2>Cada persona tiene un rol claro.</h2>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <AudienceTabs />
          </Reveal>
        </div>
      </section>

      <section className="sec dark bleed" id="evaluacion">
        <div className="sec-inner split" style={{ alignItems: "start" }}>
          <Reveal>
            <div className="eyebrow">Cómo se evalúa el ingreso</div>
            <h2 style={{ fontSize: "var(--fs-h2)", color: "#fff", margin: "0 0 16px", letterSpacing: "-0.02em" }}>Una rúbrica conocida, con cinco dimensiones.</h2>
            <p className="muted" style={{ fontSize: "var(--fs-lead)" }}>La IA propone una evaluación y una persona decide. Tu puntaje nunca se comparte con el cliente ni con otros participantes.</p>
            <Link href="/programa/assessment" className="more-link" style={{ marginTop: 12 }}>Cómo funciona el Assessment <Icon name="arrowRight" size={16} /></Link>
          </Reveal>
          <Reveal delay={120}>
            <div className="dims">
              {ASSESSMENT_DIMENSIONS.map((d) => (
                <div key={d.id} className="dim-row">
                  <strong>{d.label}</strong>
                  <em>{d.weight}%</em>
                  <div className="bar"><span style={{ "--w": d.weight / 30 } as CSSProperties} /></div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <section className="sec" id="preguntas">
        <div className="sec-inner faq-grid">
          <Reveal>
            <div className="eyebrow">Preguntas frecuentes</div>
            <h2 style={{ fontSize: "var(--fs-h2)", margin: "0 0 16px", letterSpacing: "-0.02em" }}>Todo lo que necesitas saber antes de postular.</h2>
            <Link href="/ayuda" className="more-link">Más preguntas por rol <Icon name="arrowRight" size={16} /></Link>
          </Reveal>
          <Reveal delay={80}>
            <FaqTabs groups={PROGRAM_QA} />
          </Reveal>
        </div>
      </section>

      <section className="sec-inner" style={{ paddingBottom: "var(--sp-section)" }}>
        <Reveal className="cta-band">
          <div>
            <h2>¿Te hace sentido?</h2>
            <p>La postulación a Wave 3 cierra el viernes 16 de octubre a las 12:00 del mediodía (hora de Chile).</p>
          </div>
          <Link className="pill accent lg" href="/wave-3/postular">Postular a Wave 3 <Icon name="arrowRight" size={18} /></Link>
        </Reveal>
      </section>
    </div>
  );
}
