import Link from "next/link";
import type { CSSProperties } from "react";
import { FAQ_BY_ROLE } from "@/lib/data/program";
import { AUDIENCE_LINES, PUBLIC_STAGES } from "@/lib/data/site";
import { Icon, type IconName } from "@/components/site/Icon";
import { Reveal } from "@/components/site/Reveal";
import { Carousel } from "@/components/site/Carousel";
import { StageCard } from "@/components/site/StageCard";
import { Faq, IndexGrid, SecHead, type IndexTile } from "@/components/site/Blocks";

export const metadata = { title: "Equipo Kibernum · AI Edge Talent" };

const TILES: IndexTile[] = [
  { href: "/inicio", title: "Entrar al portal", body: "Resumen con pendientes, admisión, journey y talento.", icon: "grid", tone: "dark", span: 2, mobileFull: true, image: "trabajo-laptop" },
  { href: "/delivery/playbook", title: "Playbook por etapa", body: "Qué hacer, qué comunicar y cuándo escalar.", icon: "book", tone: "accent", mobileFull: true },
  { href: "/responsabilidades", title: "Responsabilidades", body: "Quién decide qué en cada etapa (RACI).", icon: "users" },
  { href: "/mentor", title: "Mentores", body: "Tus grupos y el feedback semanal.", icon: "chat" },
  { href: "#preguntas", title: "Preguntas frecuentes", body: "Escalamiento, rescates y criticidad.", icon: "help" },
];

const TOOLS: { title: string; body: string; icon: IconName; size?: "wide" | "full" }[] = [
  { title: "Resumen con pendientes", body: "Lo que necesita acción hoy en cada Wave: evaluar, decidir, revisar entregas y verificar certificaciones.", icon: "grid", size: "wide" },
  { title: "Admisión por columnas", body: "Dónde está cada persona, de un vistazo.", icon: "kanban" },
  { title: "Journey y entregas", body: "Avance por etapa, tareas de Mindset y certificaciones.", icon: "route" },
  { title: "Feedback semanal de AI Coaches", body: "Cada AI Coach registra el avance de su grupo desde Role Enablement.", icon: "chat", size: "wide" },
  { title: "Pool de talento", body: "Todas las Waves, por especialidad, con High Talent y seguimiento a 1 y 3 meses.", icon: "star", size: "full" },
];

const DECIDES = [
  "Product Lead: declara la Wave lista, valida documentos y otorga excepciones",
  "Hub AI: evaluación y selección en comité",
  "Cliente: decide la continuidad en el Showcase",
  "Delivery: coordina, acompaña, comunica y escala",
];

export default function EquipoPage() {
  return (
    <div className="site-main">
      <section className="hero-x bleed" style={{ minHeight: "min(700px, 88vh)" }}>
        <div className="photo" role="img" aria-label="Equipo Kibernum (imagen ilustrativa)" style={{ backgroundImage: "url(/images/equipo.webp)" } as CSSProperties} />
        <span className="glow c" aria-hidden="true" />
        <span className="glow m" aria-hidden="true" />
        <div className="hero-x-body">
          <Reveal>
            <div className="eyebrow">AI Edge Talent · Equipo Kibernum</div>
            <h1 style={{ textTransform: "none", fontSize: "var(--fs-h1)", lineHeight: 1.05 }}>Todo para operar<br /><span className="grad">cada Wave.</span></h1>
          </Reveal>
          <Reveal delay={100}>
            <p className="lead">Delivery, AI Coaches, Hub AI y Product Lead: qué hacer en cada etapa, quién decide y dónde registrar la evidencia.</p>
            <div className="actions">
              <Link className="pill accent lg" href="/inicio">Entrar al portal <Icon name="arrowRight" size={18} /></Link>
              <Link className="pill ghost lg" href="/delivery/playbook">Ver el playbook</Link>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="sec tight">
        <div className="sec-inner">
          <SecHead eyebrow="Para el equipo" title="¿Qué necesitas hoy?" />
          <IndexGrid tiles={TILES} />
        </div>
      </section>

      <section className="sec dark bleed" id="etapas">
        <div className="sec-inner">
          <SecHead eyebrow="Etapa por etapa" title="Qué hace Delivery en cada etapa." lead="Desliza y toca una etapa para ver las tareas y la evidencia que se registra." />
        </div>
        <Reveal delay={100}>
          <Carousel label="Etapas desde la vista del equipo" dark>
            {PUBLIC_STAGES.map((s) => (
              <StageCard key={s.slug} stage={s} line={AUDIENCE_LINES.equipo[s.slug]} href={`/programa/${s.slug}?para=equipo`} />
            ))}
          </Carousel>
        </Reveal>
      </section>

      <section className="sec">
        <div className="sec-inner">
          <SecHead eyebrow="El portal" title="Las herramientas que vas a usar." more={{ href: "/inicio", label: "Entrar" }} />
          <div className="bento">
            {TOOLS.map((b, i) => (
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

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="sec-inner duo">
          <Reveal className="list-card">
            <h3>Quién decide qué</h3>
            <ul>{DECIDES.map((x) => <li key={x}><span className="tick"><Icon name="check" size={16} /></span>{x}</li>)}</ul>
            <Link href="/responsabilidades" className="more-link" style={{ marginTop: 16 }}>Ver la matriz completa <Icon name="arrowRight" size={16} /></Link>
          </Reveal>
          <Reveal delay={100} className="list-card dark">
            <h3>Cuándo escalar</h3>
            <ul>
              {["No asistencia a Mindset", "Una semana sin acompañamiento en la certificación", "Segundo intento no aprobado", "Un cliente que bloquea el proceso"].map((x) => (
                <li key={x}><span className="tick"><Icon name="alert" size={16} /></span>{x}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      <section className="sec" id="preguntas" style={{ paddingTop: 0 }}>
        <div className="sec-inner faq-grid">
          <Reveal>
            <div className="eyebrow">Preguntas frecuentes</div>
            <h2 style={{ fontSize: "var(--fs-h2)", margin: "0 0 16px", letterSpacing: "-0.02em" }}>Lo que pregunta el equipo.</h2>
            <Link href="/ayuda?rol=DELIVERY" className="more-link">Ver todas <Icon name="arrowRight" size={16} /></Link>
          </Reveal>
          <Reveal delay={100}><Faq items={FAQ_BY_ROLE.DELIVERY} /></Reveal>
        </div>
      </section>

      <section className="sec-inner" style={{ paddingBottom: "var(--sp-section)" }}>
        <Reveal className="cta-band">
          <div>
            <h2>Todo lo operativo está en el portal.</h2>
            <p>Entra con tu correo de Kibernum. Tu acceso lo habilita un admin.</p>
          </div>
          <Link className="pill accent lg" href="/inicio">Entrar al portal <Icon name="arrowRight" size={18} /></Link>
        </Reveal>
      </section>
    </div>
  );
}
