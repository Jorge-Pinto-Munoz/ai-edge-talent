import Link from "next/link";
import type { BrandImage } from "@/components/ui";
import { Icon, type IconName } from "./Icon";
import { Reveal } from "./Reveal";

export interface IndexTile {
  href: string;
  title: string;
  body: string;
  icon: IconName;
  tone?: "dark" | "accent";
  span?: 2;
  mobileFull?: boolean;
  image?: BrandImage;
}

/** Índice de entrada: todo lo que hay en una vista, en tarjetas que llevan a cada sección. */
export function IndexGrid({ tiles }: { tiles: IndexTile[] }) {
  return (
    <div className="idx">
      {tiles.map((t, i) => (
        <Reveal key={t.href + t.title} delay={i * 60} className={`${t.span === 2 ? "span-2" : ""} ${t.mobileFull ? "m-full" : ""}`}>
          <Link href={t.href} className={`idx-tile ${t.tone ?? ""}`} style={{ height: "100%" }}>
            {t.image && <span className="tile-photo" style={{ backgroundImage: `url(/images/${t.image}.webp)` }} aria-hidden="true" />}
            <span className="ico"><Icon name={t.icon} /></span>
            <span className="go"><Icon name="arrowRight" size={18} /></span>
            <h3>{t.title}</h3>
            <p>{t.body}</p>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}

/** Preguntas desplegables con el estilo del sitio. */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="faq-x">
      {items.map((f) => (
        <details key={f.q}>
          <summary>
            {f.q}
            <span className="plus"><Icon name="plus" size={18} /></span>
          </summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  );
}

/** Encabezado de sección: eyebrow, título, bajada y enlace opcional. */
export function SecHead({ eyebrow, title, lead, more }: { eyebrow: string; title: string; lead?: string; more?: { href: string; label: string } }) {
  return (
    <Reveal className="sec-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        {lead && <p>{lead}</p>}
      </div>
      {more && <Link href={more.href} className="more-link">{more.label} <Icon name="arrowRight" size={16} /></Link>}
    </Reveal>
  );
}
