"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { CATALOG, LEVEL_LABEL, ROLE_FAMILIES, type CatalogCert } from "@/lib/data/aicert-catalog";
import { Icon } from "@/components/site/Icon";
import { Sheet } from "@/components/site/Sheet";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const familiesOf = (slug: string) => ROLE_FAMILIES.filter((f) => f.certs.includes(slug));

/**
 * Explora el talento que quieres desarrollar: primero el rol (selector con conteo, multi-selección), luego las
 * certificaciones de ese rol en tarjetas de altura uniforme y, al final, el detalle en un panel lateral.
 */
export function CertCatalog({ compact = false }: { compact?: boolean }) {
  const [sel, setSel] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<CatalogCert | null>(null);
  const [all, setAll] = useState(!compact);

  const items = useMemo(() => {
    const allowed = sel.length ? new Set(ROLE_FAMILIES.filter((f) => sel.includes(f.id)).flatMap((f) => f.certs)) : null;
    const t = norm(q.trim());
    return CATALOG.filter((c) => !allowed || allowed.has(c.slug)).filter((c) => !t || norm([c.name, c.learns, c.area, ...c.forWho, ...c.modules].join(" ")).includes(t));
  }, [sel, q]);
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const names = ROLE_FAMILIES.filter((f) => sel.includes(f.id)).map((f) => f.name);
  const filtered = sel.length > 0 || q.trim() !== "";

  return (
    <div className="cx">
      <h2 className="sr-only">Explorar certificaciones por rol</h2>
      <div className="cx-roles" role="group" aria-label="Elige uno o varios roles">
        {ROLE_FAMILIES.map((f) => {
          const on = sel.includes(f.id);
          return (
            <button key={f.id} type="button" className={`cx-role ${on ? "on" : ""}`} aria-pressed={on} onClick={() => toggle(f.id)}>
              <span className="cx-role-ico" aria-hidden="true"><Icon name={f.icon} size={24} /></span>
              <span className="cx-role-txt"><strong>{f.name}</strong>{!compact && <small>{f.roles}</small>}</span>
              <span className="cx-role-n" aria-label={`${f.certs.length} certificaciones`}>{on ? <Icon name="check" size={14} /> : f.certs.length}</span>
            </button>
          );
        })}
      </div>

      <div className="cx-bar">
        <p className="cx-count" aria-live="polite">
          <strong>{items.length}</strong> {items.length === 1 ? "certificación" : "certificaciones"}
          {names.length ? <> para <span className="cx-for">{names.join(" + ")}</span></> : " en el catálogo"}
        </p>
        <div className="cx-actions">
          <label className="help-search cx-search">
            <Icon name="search" size={18} />
            <span className="sr-only">Buscar por tema</span>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar un tema: RAG, testing, riesgos…" />
          </label>
          {filtered && <button type="button" className="btn ghost small" onClick={() => { setSel([]); setQ(""); }}><Icon name="close" size={16} /> Limpiar filtros</button>}
          {sel.length > 0 && <button type="button" className="btn secondary small" onClick={() => { setSel([]); setAll(true); }}>Ver todas las certificaciones</button>}
        </div>
      </div>

      {!filtered && !all ? (
        <div className="cx-prompt">
          <Icon name="target" size={22} />
          <p><strong>Elige un rol para ver sus certificaciones.</strong> Puedes combinar varios.</p>
          <button type="button" className="btn secondary small" onClick={() => setAll(true)}>Ver las {CATALOG.length} certificaciones</button>
        </div>
      ) : items.length === 0 ? (
        <p className="help-none">No hay certificaciones con ese filtro. <button type="button" className="link-btn" onClick={() => { setSel([]); setQ(""); }}>Ver todas</button></p>
      ) : (
        <ul className="cx-grid" key={sel.join(",") + q}>
          {items.map((c, i) => (
            <li key={c.slug} id={`cert-${c.slug}`} className="cx-card" style={{ "--i": Math.min(i, 12) } as CSSProperties}>
              <div className="cx-card-top">
                <span className="cert-area">{c.area}</span>
                <span className={`cert-level l-${c.level.toLowerCase()}`}>{LEVEL_LABEL[c.level]}</span>
              </div>
              <h3>{c.name}</h3>
              <p className="cx-learns">{c.learns}</p>
              <ul className="cx-tags" aria-label="Para">
                {c.forWho.slice(0, 2).map((w) => <li key={w}>{w}</li>)}
                {c.forWho.length > 2 && <li className="more">+{c.forWho.length - 2}</li>}
              </ul>
              <button type="button" className="cx-more" onClick={() => setOpen(c)} aria-haspopup="dialog">
                Ver detalle <span className="muted">· {c.modules.length} módulos</span> <Icon name="arrowRight" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={open !== null} onClose={() => setOpen(null)} eyebrow={open ? `${open.area} · ${LEVEL_LABEL[open.level]}` : undefined} title={open?.name ?? ""}>
        {open && (
          <div className="cx-detail">
            <p className="cx-detail-lead">{open.learns}</p>
            <section>
              <h3>Para quién</h3>
              <ul className="cx-tags">{open.forWho.map((w) => <li key={w}>{w}</li>)}</ul>
              <p className="muted" style={{ margin: "8px 0 0" }}>Familias de rol: {familiesOf(open.slug).map((f) => f.name).join(" · ")}</p>
            </section>
            <section>
              <h3>Competencias que desarrolla · {open.modules.length} módulos</h3>
              <ol className="cx-mods">{open.modules.map((m) => <li key={m}>{m}</li>)}</ol>
            </section>
            <section className="cx-apply">
              <h3>Aplicación en el trabajo</h3>
              <p>En AI Edge Talent la certificación no termina en el examen: el profesional aplica lo aprendido en el AI Lab, sobre un desafío real del negocio, y lo presenta con evidencia de impacto.</p>
            </section>
            <p className="cat-note" style={{ margin: 0 }}>Síntesis en español de la malla oficial de AI CERTs. No reemplaza el material oficial.</p>
          </div>
        )}
      </Sheet>
    </div>
  );
}
