import Link from "next/link";
import type { CSSProperties } from "react";
import type { PublicStage } from "@/lib/data/site";
import { Icon } from "./Icon";

/** Tarjeta grande de etapa: foto, número, nombre y una línea. Lleva a su página de detalle. */
export function StageCard({ stage, mini = false }: { stage: PublicStage; mini?: boolean }) {
  return (
    <Link href={`/programa/${stage.slug}`} className={`stage-card ${mini ? "mini" : ""}`} aria-label={`Etapa ${stage.n}: ${stage.name}. Ver detalle`}>
      <span className="photo" style={{ backgroundImage: `url(/images/${stage.image}.webp)`, ...(stage.photoPos ? ({ "--photo-pos": stage.photoPos } as CSSProperties) : {}) }} />
      <span className="num">Etapa {stage.n}</span>
      <span className="ico"><Icon name={stage.icon} size={22} /></span>
      <h3>{stage.name}</h3>
      <p>{stage.tagline}</p>
      <span className="cta">
        <span className="plus"><Icon name="plus" size={18} /></span>
        Ver la etapa
      </span>
    </Link>
  );
}
