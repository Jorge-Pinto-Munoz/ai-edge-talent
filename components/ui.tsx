import type { ReactNode } from "react";
import type { Health, VersionedDocument } from "@/lib/domain/types";
import { PENDING_DEFINITION } from "@/lib/data/journey";

export function Badge({ tone, children }: { tone?: "ok" | "warn" | "bad" | "brand"; children: ReactNode }) {
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
