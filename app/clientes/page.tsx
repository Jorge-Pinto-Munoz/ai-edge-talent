import Link from "next/link";
import { AiCertSection } from "@/components/site/AiCertSection";
import { certifiedRate } from "@/lib/aicert/stats";
import type { CSSProperties } from "react";
import { FAQ_BY_ROLE } from "@/lib/data/program";
import { AUDIENCE_LINES, PUBLIC_STAGES } from "@/lib/data/site";
import { Icon } from "@/components/site/Icon";
import { Reveal } from "@/components/site/Reveal";
import { Carousel } from "@/components/site/Carousel";
import { StageCard } from "@/components/site/StageCard";
import { Faq, IndexGrid, SecHead, type IndexTile } from "@/components/site/Blocks";

export const metadata = { title: "Para clientes · AI Edge Talent" };

const TILES: IndexTile[] = [
  { href: "#como-funciona", title: "Cómo funciona", body: "Cinco etapas y lo que se espera de tu empresa en cada una.", icon: "compass", tone: "dark", span: 2, mobileFull: true, image: "colaboracion" },
  { href: "#nominar", title: "Nominar profesionales", body: "Cómo identificar a quién invitar junto a tu Delivery.", icon: "users", tone: "accent", mobileFull: true },
  { href: "#informacion", title: "Qué información recibes", body: "Estado, avance, riesgos y resultados.", icon: "chat" },
  { href: "#tiempo", title: "Tiempo que se necesita", body: "Disponibilidad coordinada, 2 a 3 horas por semana.", icon: "clock" },
  { href: "#preguntas", title: "Preguntas frecuentes", body: "Lo que suelen preguntar los clientes.", icon: "help" },
];

const RECEIVE = [
  "Estado de la postulación de cada persona nominada (pendiente o completada)",
  "Si avanza, no avanza o complementa su postulación",
  "Inicio y avance relevante en cada etapa",
  "Riesgos o bloqueos que necesiten tu ayuda",
  "Resultados, evidencia y próximos pasos",
];
const NOT_RECEIVE = ["Ranking entre profesionales", "Puntajes del Assessment", "Evaluación detallada de cada persona"];
const NOMINATE = [
  { when: "Paso 1", title: "Conversas con tu Delivery", body: "Te explica el programa y acuerdan la disponibilidad de tu equipo." },
  { when: "Paso 2", title: "Identifican profesionales", body: "Personas que ya usan IA y tienen un desafío real que abordar en tu operación." },
  { when: "Paso 3", title: "Cada persona recibe una invitación", body: "Decide postular y responde personalmente el Assessment." },
  { when: "Paso 4", title: "Se selecciona por evidencia", body: "Nominar no significa seleccionar: depende del Assessment y de la capacidad de la Wave." },
];

export const revalidate = 600;

export default async function ClientesPage() {
  return (
    <div className="site-main">
      <section className="hero-x bleed" style={{ minHeight: "min(700px, 88vh)" }}>
        <div className="photo" role="img" aria-label="Equipo trabajando con un cliente (imagen ilustrativa)" style={{ backgroundImage: "url(/images/colaboracion.webp)", "--photo-pos": "70% center" } as CSSProperties} />
        <span className="glow c" aria-hidden="true" />
        <div className="hero-x-body">
          <Reveal>
            <div className="eyebrow">AI Edge Talent · Para clientes</div>
            <h1 style={{ textTransform: "none", fontSize: "var(--fs-h1)", lineHeight: 1.05 }}>Tus profesionales,<br /><span className="grad">con IA aplicada a tu operación.</span></h1>
          </Reveal>
          <Reveal delay={100}>
            <p className="lead">Los profesionales de Kibernum que te prestan servicios se certifican en IA y la llevan a un desafío real de tu empresa. Tú decides qué casos continúan.</p>
            <div className="actions">
              <a className="pill accent lg" href="#como-funciona">Cómo funciona <Icon name="arrowRight" size={18} /></a>
              <Link className="pill ghost lg" href="/inicio">Entrar como cliente</Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="sec tight">
        <div className="sec-inner">
          <SecHead eyebrow="Para tu empresa" title="¿Qué necesitas saber?" />
          <IndexGrid tiles={TILES} />
        </div>
      </section>

      <section className="sec dark bleed" id="como-funciona">
        <div className="sec-inner">
          <SecHead eyebrow="Tu rol en cada etapa" title="Participas en los momentos que importan." lead="Desliza para ver qué pasa en cada etapa y qué se espera de tu empresa." more={{ href: "/programa?para=cliente", label: "Ver el programa" }} />
        </div>
        <Reveal delay={100}>
          <Carousel label="Etapas desde la vista del cliente" dark>
            {PUBLIC_STAGES.map((s) => (
              <StageCard key={s.slug} stage={s} line={AUDIENCE_LINES.cliente[s.slug]} href={`/programa/${s.slug}?para=cliente`} />
            ))}
          </Carousel>
        </Reveal>
      </section>

      <section className="sec" id="informacion">
        <div className="sec-inner">
          <SecHead eyebrow="Información" title="Qué recibes y qué no." lead="Te mantenemos al tanto de lo que necesitas para decidir, cuidando la evaluación individual de cada persona." />
          <div className="duo">
            <Reveal className="list-card">
              <h3>Lo que recibes</h3>
              <ul>{RECEIVE.map((x) => <li key={x}><span className="tick"><Icon name="check" size={16} /></span>{x}</li>)}</ul>
            </Reveal>
            <Reveal delay={100} className="list-card dark">
              <h3>Lo que no recibes</h3>
              <ul>{NOT_RECEIVE.map((x) => <li key={x}><span className="tick"><Icon name="close" size={16} /></span>{x}</li>)}</ul>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="sec" id="certificacion">
        <div className="sec-inner">
          <AiCertSection id="aic-clientes" audience="cliente" stat={await certifiedRate()} />
        </div>
      </section>

      <section className="sec dark bleed" id="nominar">
        <div className="sec-inner w3-grid">
          <Reveal>
            <div className="eyebrow">Nominar profesionales</div>
            <h2 style={{ fontSize: "var(--fs-h2)", color: "#fff", margin: "0 0 16px", letterSpacing: "-0.02em" }}>Nominar no es seleccionar.</h2>
            <p className="muted" style={{ fontSize: "var(--fs-lead)", marginBottom: 28 }}>Junto a tu Delivery identifican a quienes tienen más potencial. Cada persona decide postular y la selección se hace por evidencia.</p>
            <p className="muted">Para nominar, conversa con tu Delivery de Kibernum.</p>
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

      <section className="sec" id="tiempo">
        <div className="sec-inner split">
          <Reveal>
            <div className="eyebrow">Tiempo</div>
            <h2 style={{ fontSize: "var(--fs-h2)", margin: "0 0 16px", letterSpacing: "-0.02em" }}>Un esfuerzo acotado, coordinado con tu equipo.</h2>
            <p className="muted" style={{ fontSize: "var(--fs-lead)" }}>Delivery coordina contigo los espacios dentro de jornada según la etapa. No es un número fijo todas las semanas.</p>
            <div className="stat-row">
              <div className="stat"><strong>2–3 h</strong><small>por semana, según etapa</small></div>
              <div className="stat"><strong>30–45</strong><small>días de recorrido</small></div>
              <div className="stat"><strong>1</strong><small>caso real por persona</small></div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="media" style={{ backgroundImage: "url(/images/trabajo-laptop.webp)" }} role="img" aria-label="Profesional trabajando (imagen ilustrativa)" />
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
            <p>Entra con tu correo para ver cómo avanzan tus profesionales.</p>
          </div>
          <Link className="pill accent lg" href="/inicio">Entrar como cliente <Icon name="arrowRight" size={18} /></Link>
        </Reveal>
      </section>
    </div>
  );
}
