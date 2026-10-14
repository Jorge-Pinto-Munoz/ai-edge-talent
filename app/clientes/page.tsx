import Link from "next/link";
import { programAdoption } from "@/lib/aicert/adoption";
import { AICERT_AFTER_CLIENT, AICERT_IMPACT, AICERT_REWARDS_CLIENT } from "@/lib/data/aicert";
import { CertCatalog } from "@/components/site/CertCatalog";
import { AdoptionSection } from "@/components/site/AdoptionSection";
import type { CSSProperties } from "react";
import { FAQ_BY_ROLE } from "@/lib/data/program";
import { AUDIENCE_LINES, PUBLIC_STAGES } from "@/lib/data/site";
import { Icon } from "@/components/site/Icon";
import { Reveal } from "@/components/site/Reveal";
import { Carousel } from "@/components/site/Carousel";
import { StageCard } from "@/components/site/StageCard";
import { Faq, SecHead } from "@/components/site/Blocks";

export const metadata = { title: "Para clientes · AI Edge Talent" };


const RECEIVE = [
  "Estado de la postulación de cada persona nominada (pendiente o completada)",
  "Si avanza, no avanza o complementa su postulación",
  "Inicio y avance relevante en cada etapa",
  "Riesgos o bloqueos que necesiten tu ayuda",
  "Resultados, evidencia y próximos pasos",
];
/** Lo que gana tu empresa: tres ideas, en orden de importancia. Al cliente se le habla de tú. */
const VALUE = [
  { icon: "flask" as const, title: "Un caso real con impacto", body: "Cada profesional construye una solución con IA para un desafío de tu operación y la presenta con evidencia." },
  { icon: "badge" as const, title: "Certificación internacional por rol", body: "AI CERTs valida con examen el dominio técnico de la IA aplicada al rol de cada persona." },
  { icon: "clock" as const, title: "En paralelo al servicio", body: "Kibernum financia la certificación y la habilitación ocurre sin descontar horas, con tiempo coordinado contigo." },
];

const NOMINATE = [
  { when: "Paso 1", title: "Conversas con tu Delivery", body: "Te explica el programa y acuerdan la disponibilidad de tu equipo." },
  { when: "Paso 2", title: "Identifican profesionales", body: "Personas que ya usan IA y tienen un desafío real que abordar en tu operación." },
  { when: "Paso 3", title: "Cada persona recibe una invitación", body: "Decide postular y responde personalmente el Assessment." },
  { when: "Paso 4", title: "Se selecciona por evidencia", body: "Nominar no significa seleccionar: depende del Assessment y de la capacidad de la Wave." },
];

export const revalidate = 600;

export default async function ClientesPage() {
  const adoption = await programAdoption();
  return (
    <div className="site-main">
      <section className="hero-x bleed">
        <div className="photo" role="img" aria-label="Equipo trabajando con un cliente (imagen ilustrativa)" style={{ backgroundImage: "url(/images/colaboracion.webp)" } as CSSProperties} />
        <span className="glow c" aria-hidden="true" />
        <div className="hero-x-body">
          <Reveal>
            <div className="eyebrow">AI Edge Talent · Para clientes</div>
            <h1 style={{ textTransform: "none", fontSize: "var(--fs-h1)", lineHeight: 1.05 }}>Tus profesionales,<br /><span className="grad">con IA aplicada a tu operación.</span></h1>
          </Reveal>
          <Reveal delay={100}>
            <p className="lead">Los profesionales de Kibernum que trabajan contigo se certifican en IA y la llevan a un desafío real de tu empresa, con impacto medible.</p>
            <div className="actions">
              <a className="pill accent lg" href="#talento">Explorar el talento <Icon name="arrowRight" size={18} /></a>
              <a className="pill ghost lg" href="#como-funciona">Cómo funciona</a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 1 · Valor: lo primero que debe entender */}
      <section className="sec tight" id="valor">
        <div className="sec-inner">
          <SecHead eyebrow="Lo que gana tu empresa" title="La habilitación no termina en un curso." lead={`${AICERT_IMPACT.headline}: la meta es un caso funcionando en tu operación y un compromiso de agilidad que medimos al mes 1 y al mes 3.`} />
          <div className="value-grid">
            {VALUE.map((v, i) => (
              <Reveal key={v.title} delay={i * 80} className="value-card">
                <span className="value-ico"><Icon name={v.icon} size={24} /></span>
                <h3>{v.title}</h3>
                <p>{v.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 2 · Cómo funciona */}
      <section className="sec dark bleed" id="como-funciona">
        <div className="sec-inner">
          <SecHead eyebrow="Cómo funciona" title="Participa en los momentos que importan." lead="Cinco etapas. Desliza para ver qué pasa en cada una y qué se espera de tu empresa." more={{ href: "/programa?para=cliente", label: "Ver el programa" }} />
        </div>
        <Reveal delay={100}>
          <Carousel label="Etapas desde la vista del cliente" dark>
            {PUBLIC_STAGES.map((s) => (
              <StageCard key={s.slug} stage={s} line={AUDIENCE_LINES.cliente[s.slug]} href={`/programa/${s.slug}?para=cliente`} />
            ))}
          </Carousel>
        </Reveal>
      </section>

      {/* 3 · Explorar el talento */}
      <section className="sec" id="talento">
        <div className="sec-inner">
          <SecHead eyebrow="Explora el talento" title="¿Qué rol quieres potenciar en tu equipo?" lead="Elige uno o varios roles y mira las certificaciones AI CERTs que corresponden. Abre cualquiera para ver sus competencias." more={{ href: "/certificaciones", label: "Catálogo completo" }} />
          <CertCatalog compact />
        </div>
      </section>

      {/* 4 · Evidencia */}
      <section className="sec" id="evidencia" style={{ paddingTop: 0 }}>
        <div className="sec-inner">
          <SecHead eyebrow="Evidencia del programa" title="Talento que estamos desarrollando." lead="Cifras reales y agregadas. Se actualizan a medida que avanzan las Waves." />
          <AdoptionSection data={adoption} />
        </div>
      </section>

      {/* 5 · Qué recibes */}
      <section className="sec dark bleed" id="informacion">
        <div className="sec-inner">
          <SecHead eyebrow="Qué recibes" title="Información clara para decidir." />
          <div className="recv">
            <Reveal className="recv-col">
              <h3>Tú recibes</h3>
              <ul>{RECEIVE.map((x) => <li key={x}><Icon name="check" size={18} />{x}</li>)}</ul>
            </Reveal>
            <Reveal delay={100} className="recv-col">
              <h3>Cada profesional certificado obtiene</h3>
              <ul>{AICERT_REWARDS_CLIENT.map((r) => <li key={r.title}><Icon name={r.icon} size={18} /><span><strong>{r.title}.</strong> {r.body}</span></li>)}</ul>
              <h3>Y lo seguimos acompañando</h3>
              <ol className="ds-milestones">{AICERT_AFTER_CLIENT.map((a) => <li key={a.title}><strong>{a.when} · {a.title}.</strong> {a.body}</li>)}</ol>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="sec" id="nominar">
        <div className="sec-inner w3-grid light">
          <Reveal>
            <div className="eyebrow">Nominar profesionales</div>
            <h2 style={{ fontSize: "var(--fs-h2)", margin: "0 0 16px", letterSpacing: "-0.02em" }}>Nominar no es seleccionar.</h2>
            <p className="muted" style={{ fontSize: "var(--fs-lead)", marginBottom: 20 }}>Junto a tu Delivery identifican a quienes tienen más potencial. Cada persona decide postular y la selección se hace por evidencia.</p>
            <div className="stat-row">
              <div className="stat"><strong>2–3 h</strong><small>por semana, según etapa</small></div>
              <div className="stat"><strong>30–45</strong><small>días de recorrido</small></div>
              <div className="stat"><strong>1</strong><small>caso real por persona</small></div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <ol className="timeline vertical">
              {NOMINATE.map((t) => (
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

      <section className="sec" id="preguntas" style={{ paddingTop: 0 }}>
        <div className="sec-inner faq-grid">
          <Reveal>
            <div className="eyebrow">Preguntas frecuentes</div>
            <h2 style={{ fontSize: "var(--fs-h2)", margin: "0 0 16px", letterSpacing: "-0.02em" }}>Lo que preguntan los clientes.</h2>
            <Link href="/ayuda?rol=CLIENT" className="more-link">Ver todas <Icon name="arrowRight" size={16} /></Link>
          </Reveal>
          <Reveal delay={100}><Faq items={FAQ_BY_ROLE.CLIENT} /></Reveal>
        </div>
      </section>

      <section className="sec-inner" style={{ paddingBottom: "var(--sp-section)" }}>
        <Reveal className="cta-band">
          <div>
            <h2>¿Ya participas en una Wave?</h2>
            <p>Ingresa con tu correo para ver cómo avanzan tus profesionales.</p>
          </div>
          <Link className="pill accent lg" href="/inicio">Ingresar como cliente <Icon name="arrowRight" size={18} /></Link>
        </Reveal>
      </section>
    </div>
  );
}
