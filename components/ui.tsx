import type { CSSProperties, ReactNode } from "react";
import type { Health, VersionedDocument } from "@/lib/domain/types";
import { PENDING_DEFINITION } from "@/lib/data/journey";

export function Badge({ tone, children }: { tone?: "ok" | "warn" | "bad" | "brand" | "review"; children: ReactNode }) {
  return <span className={`badge ${tone ?? ""}`}>{children}</span>;
}

export function Callout({ tone, title, children }: { tone?: "warn" | "ok" | "bad"; title?: string; children?: ReactNode }) {
  return (
    <div className={`callout ${tone ?? ""}`} role="note">
      {title && <strong>{title}</strong>}
      {children}
    </div>
  );
}

export function DraftBanner({ text }: { text?: string }) {
  return <div className="draft">{text ?? "BORRADOR — REQUIERE APROBACIÓN PRODUCT LEAD / LEGAL SI CORRESPONDE"}</div>;
}

export function Pending({ what }: { what?: string }) {
  return <span className="pending-def">{PENDING_DEFINITION}{what ? ` · ${what}` : ""}</span>;
}

/** Muestra un dato o "Sin dato" — nunca inventa. */
export function Val({ v, fmt }: { v: string | number | null | undefined; fmt?: (x: string) => string }) {
  if (v === null || v === undefined || v === "") return <span className="muted">Sin dato</span>;
  return <>{typeof v === "string" && fmt ? fmt(v) : v}</>;
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/**
 * Partes de fecha en hora de Chile. Se usan solo componentes numéricos de Intl y nombres propios,
 * para que el texto sea idéntico en servidor y navegador (evita errores de hidratación por ICU).
 */
function santiagoParts(iso: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const y = get("year"), m = get("month"), d = get("day");
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const hh = String(get("hour") % 24).padStart(2, "0");
  const mm = String(get("minute")).padStart(2, "0");
  return { y, m, d, weekday, time: `${hh}:${mm}` };
}

export function fmtDate(iso: string) {
  const p = santiagoParts(iso);
  return `${p.d} de ${MONTHS[p.m - 1]} de ${p.y}, ${p.time}`;
}

export function fmtDay(iso: string) {
  const p = santiagoParts(iso);
  return `${WEEKDAYS[p.weekday]}, ${p.d} de ${MONTHS[p.m - 1]} de ${p.y}`;
}

/** "viernes, 16 de octubre de 2026 · 12:00 hrs" */
export function fmtDeadline(iso: string) {
  return `${fmtDay(iso)} · ${santiagoParts(iso).time} hrs`;
}

export function HealthBadge({ h }: { h: Health }) {
  const map: Record<Health, [string, "ok" | "warn" | "bad" | undefined]> = {
    GREEN: ["Saludable", "ok"],
    AMBER: ["Atención", "warn"],
    RED: ["En riesgo", "bad"],
    UNKNOWN: ["Sin medición", undefined],
  };
  const [label, tone] = map[h];
  return <Badge tone={tone}>{label}</Badge>;
}

export function Progress({ pct }: { pct: number }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${pct}%` }} />
    </div>
  );
}

export function DocumentView({ doc }: { doc: VersionedDocument }) {
  return (
    <div className="stack">
      {doc.approvalStatus === "DRAFT" && <DraftBanner text={doc.draftNotice} />}
      {doc.sections.map((s) => (
        <section key={s.heading}>
          <h3>{s.heading}</h3>
          {s.body?.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
          {s.bullets && (
            <ul>
              {s.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
      <p className="muted">
        <small>
          Documento {doc.id} · versión {doc.version}
        </small>
      </p>
    </div>
  );
}

export type BrandImage = "equipo" | "colaboracion" | "trabajo-laptop" | "retrato-perfil" | "profesional-tablet";

/**
 * Hero expresivo AET: fotografía protagonista, texto en zona tranquila, desplazamiento cyan/magenta.
 * Las fotografías son referencias generadas e ilustrativas: no representan participantes ni resultados.
 */
export function BrandHero({
  image,
  eyebrow,
  title,
  display,
  lead,
  children,
  photoLeft,
  photoPos,
  showLogo = false,
}: {
  image: BrandImage;
  eyebrow?: string;
  title: ReactNode;
  display?: boolean;
  lead?: ReactNode;
  children?: ReactNode;
  photoLeft?: boolean;
  photoPos?: string;
  showLogo?: boolean;
}) {
  return (
    <section className={`brand-hero ${photoLeft ? "photo-left" : ""}`}>
      <div
        className="photo"
        role="img"
        aria-label="Fotografía ilustrativa de profesionales TI"
        style={{ backgroundImage: `url(/images/${image}.webp)`, ...(photoPos ? ({ "--photo-pos": photoPos } as CSSProperties) : {}) }}
      />
      <div className="stripes" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="hero-body">
        {showLogo && <img className="logo" src="/brand/kibernum-blanco.svg" alt="Kibernum" />}
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className={display ? "display" : undefined}>{title}</h1>
        <div className="rule" />
        {lead && <p className="lead">{lead}</p>}
        {children}
      </div>
      <span className="photo-credit">Imagen ilustrativa</span>
    </section>
  );
}

/** Tono semántico de un estado de admisión (siempre acompañado de su etiqueta). */
export function admissionTone(s: string): "ok" | "warn" | "bad" | "brand" | "review" | undefined {
  if (["SELECTED", "CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"].includes(s)) return "ok";
  if (["RESCUE_REQUIRED", "CONDITIONS_PENDING"].includes(s)) return "warn";
  if (s === "HUMAN_REVIEW") return "review";
  if (s === "NOT_SELECTED") return undefined;
  return "brand";
}
