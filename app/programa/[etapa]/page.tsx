import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { PUBLIC_STAGES, stageBySlug } from "@/lib/data/site";
import { Icon } from "@/components/site/Icon";
import { Reveal } from "@/components/site/Reveal";
import { Carousel } from "@/components/site/Carousel";
import { cookies } from "next/headers";
import { AUDIENCE, AUDIENCES, AUDIENCE_COOKIE, isAudience, stageRoles, type Audience } from "@/lib/site/audience";

export function generateStaticParams() {
  return PUBLIC_STAGES.map((s) => ({ etapa: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ etapa: string }> }) {
  const s = stageBySlug((await params).etapa);
  return { title: s ? `${s.name} · AI Edge Talent` : "Etapa · AI Edge Talent" };
}

export default async function EtapaPage({ params, searchParams }: { params: Promise<{ etapa: string }>; searchParams: Promise<{ para?: string }> }) {
  const stage = stageBySlug((await params).etapa);
  if (!stage) notFound();
  const para = (await searchParams).para;
  const saved = (await cookies()).get(AUDIENCE_COOKIE)?.value;
  const aud: Audience = isAudience(para) ? para : isAudience(saved) ? saved : "profesional";
  const roles = stageRoles(stage.slug);
  const q = (a: Audience) => (a === "profesional" ? "" : `?para=${a}`);
  const blocks: Record<Audience, { a: { title: string; items: string[]; icon: "check" }; b: { title: string; items: string[]; icon: "star" } }> = {
    profesional: { a: { title: "Lo que haces tú", items: stage.youDo, icon: "check" }, b: { title: "Lo que obtienes", items: stage.youGet, icon: "star" } },
    cliente: { a: { title: "Tu rol como cliente", items: roles.client, icon: "check" }, b: { title: "Lo que recibes", items: ["Avisos al inicio y en cada cambio relevante", "Riesgos y bloqueos, si los hay", "Resultados y evidencia, nunca puntajes ni ranking"], icon: "star" } },
    equipo: { a: { title: "Qué hace Delivery", items: roles.delivery, icon: "check" }, b: { title: "Evidencia que se registra", items: roles.evidence, icon: "star" } },
  };
  const blk = blocks[aud];
  const i = PUBLIC_STAGES.indexOf(stage);
  const prev = PUBLIC_STAGES[i - 1];
  const next = PUBLIC_STAGES[i + 1];

  return (
    <div className="site-main">
      <section className="hero-x stage-hero bleed">
        <div className="photo" role="img" aria-label="Imagen ilustrativa" style={{ backgroundImage: `url(/images/${stage.image}.webp)`, ...(stage.photoPos ? ({ "--photo-pos": stage.photoPos } as CSSProperties) : {}) }} />
        <span className="glow c" aria-hidden="true" />
        <div className="hero-x-body">
          <Reveal>
            <Link href="/programa" className="more-link" style={{ color: "var(--fog)", marginBottom: 20 }}>
              <Icon name="arrowLeft" size={16} /> El programa
            </Link>
            <div className="eyebrow" style={{ marginTop: 20 }}>Etapa {stage.n} de {PUBLIC_STAGES.length}</div>
            <h1 style={{ textTransform: "none", fontSize: "var(--fs-h1)", lineHeight: 1.05 }}>{stage.name}</h1>
          </Reveal>
          <Reveal delay={100}>
            <p className="lead">{stage.tagline}</p>
            <div className="facts">
              {stage.facts.map((f) => (
                <div key={f.label} className="fact">
                  <small>{f.label}</small>
                  <strong>{f.value}</strong>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <nav className="stage-rail bleed" aria-label="Etapas">
        <div className="stage-rail-inner">
          {PUBLIC_STAGES.map((s) => (
            <Link key={s.slug} href={`/programa/${s.slug}${q(aud)}`} aria-current={s.slug === stage.slug ? "page" : undefined}>
              <span className="n">{s.n}</span> {s.name}
            </Link>
          ))}
        </div>
      </nav>

      <section className="sec">
        <div className="sec-inner">
          <Reveal>
            <p className="big-intro">{stage.intro}</p>
          </Reveal>
        </div>
      </section>

      <section className="sec soft bleed" style={{ paddingTop: 0, background: "transparent" }}>
        <div className="sec-inner">
          <Reveal className="sec-head">
            <div>
              <div className="eyebrow">Paso a paso</div>
              <h2>Qué pasa en esta etapa</h2>
            </div>
          </Reveal>
        </div>
        <Reveal delay={80}>
          <Carousel label={`Pasos de ${stage.name}`}>
            {stage.happens.map((h, k) => (
              <article key={h.title} className="step-card">
                <span className="n">{k + 1}</span>
                <h3>{h.title}</h3>
                <p>{h.body}</p>
              </article>
            ))}
          </Carousel>
        </Reveal>
      </section>

      <section className="sec" style={{ paddingTop: 0 }} id="roles">
        <div className="sec-inner">
          <Reveal className="sec-head" style={{ marginBottom: 24 }}>
            <div>
              <div className="eyebrow">Según quién eres</div>
              <h2>{aud === "profesional" ? "Tu parte en esta etapa" : aud === "cliente" ? "La parte de tu empresa" : "La parte del equipo Kibernum"}</h2>
            </div>
            <nav className="tabs-x" aria-label="Ver esta etapa como" style={{ marginBottom: 0 }}>
              {AUDIENCES.map((a) => (
                <Link key={a} href={`/programa/${stage.slug}${q(a)}#roles`} aria-current={a === aud ? "true" : undefined} className={a === aud ? "on" : ""} scroll={false}>
                  {AUDIENCE[a].short}
                </Link>
              ))}
            </nav>
          </Reveal>
          <div className="duo">
            <Reveal key={`${aud}-a`} className="list-card">
              <h3>{blk.a.title}</h3>
              <ul>
                {blk.a.items.map((x) => (
                  <li key={x}><span className="tick"><Icon name="check" size={16} /></span>{x}</li>
                ))}
              </ul>
            </Reveal>
            <Reveal key={`${aud}-b`} delay={100} className="list-card dark">
              <h3>{blk.b.title}</h3>
              <ul>
                {blk.b.items.map((x) => (
                  <li key={x}><span className="tick"><Icon name="star" size={16} /></span>{x}</li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="sec-inner duo">
          <Reveal className="rule-card">
            <div className="k">Cómo avanzas</div>
            <p>{stage.advance}</p>
          </Reveal>
          {stage.ifNot !== "—" && (
            <Reveal delay={100} className="rule-card warn">
              <div className="k">Si no se cumple</div>
              <p>{stage.ifNot}</p>
            </Reveal>
          )}
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 0 }}>
        <div className="sec-inner">
          <Reveal className="video-card">
            <span className="photo" style={{ backgroundImage: `url(/images/${stage.image}.webp)` }} />
            <div>
              <div className="play"><Icon name="play" size={28} /></div>
              <strong style={{ fontSize: "1.25rem" }}>Video de la etapa</strong>
              <p>Al inscribirte, en tu espacio verás un video corto que explica esta etapa.</p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="sec-inner" style={{ paddingBottom: "var(--sp-section)" }}>
        <Reveal className="pager">
          {prev ? (
            <Link href={`/programa/${prev.slug}${q(aud)}`}>
              <span className="photo" style={{ backgroundImage: `url(/images/${prev.image}.webp)` }} />
              <small><Icon name="arrowLeft" size={14} /> Etapa anterior</small>
              <strong>{prev.name}</strong>
            </Link>
          ) : (
            <Link href={AUDIENCE[aud].home === "/" ? "/programa" : AUDIENCE[aud].home}>
              <span className="photo" style={{ backgroundImage: "url(/images/equipo.webp)" }} />
              <small><Icon name="arrowLeft" size={14} /> Volver</small>
              <strong>El programa</strong>
            </Link>
          )}
          {next ? (
            <Link href={`/programa/${next.slug}${q(aud)}`} className="next">
              <span className="photo" style={{ backgroundImage: `url(/images/${next.image}.webp)` }} />
              <small>Siguiente etapa <Icon name="arrowRight" size={14} /></small>
              <strong>{next.name}</strong>
            </Link>
          ) : (
            <Link href={aud === "profesional" ? "/wave-3/postular" : AUDIENCE[aud].home} className="next">
              <span className="photo" style={{ backgroundImage: "url(/images/trabajo-laptop.webp)" }} />
              <small>{aud === "profesional" ? "¿Te interesa?" : "Volver al inicio"} <Icon name="arrowRight" size={14} /></small>
              <strong>{aud === "profesional" ? "Postular a Wave 3" : aud === "cliente" ? "AET para clientes" : "AET para el equipo"}</strong>
            </Link>
          )}
        </Reveal>
      </section>
    </div>
  );
}
