"use client";

import { useMemo, useState } from "react";
import { CATALOG, CERT_AREAS, LEVEL_LABEL, type CertArea } from "@/lib/data/aicert-catalog";
import { Icon } from "@/components/site/Icon";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Catálogo filtrable: por área y por texto (nombre, rol o módulo). */
export function CertCatalog() {
  const [area, setArea] = useState<CertArea | null>(null);
  const [q, setQ] = useState("");
  const items = useMemo(() => {
    const t = norm(q.trim());
    return CATALOG.filter((c) => !area || c.area === area).filter((c) => !t || norm([c.name, c.learns, c.area, ...c.forWho, ...c.modules].join(" ")).includes(t));
  }, [area, q]);

  return (
    <div className="cat">
      <h2 className="sr-only">Certificaciones disponibles</h2>
      <div className="cat-tools">
        <label className="help-search cat-search">
          <Icon name="search" size={18} />
          <span className="sr-only">Buscar certificación, rol o tema</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca un rol o tema: QA, datos, agentes, seguridad…" />
        </label>
        <div className="help-topics" role="group" aria-label="Filtrar por área">
          <button type="button" aria-pressed={!area} className={!area ? "on" : ""} onClick={() => setArea(null)}>Todas · {CATALOG.length}</button>
          {CERT_AREAS.map((a) => {
            const n = CATALOG.filter((c) => c.area === a.id).length;
            return <button key={a.id} type="button" aria-pressed={area === a.id} className={area === a.id ? "on" : ""} onClick={() => setArea(area === a.id ? null : a.id)} title={a.blurb}>{a.id} · {n}</button>;
          })}
        </div>
      </div>
      <p className="muted cat-count" aria-live="polite">{items.length === CATALOG.length ? `${items.length} certificaciones` : `${items.length} de ${CATALOG.length} certificaciones`}{area ? ` · ${CERT_AREAS.find((a) => a.id === area)?.blurb}` : ""}</p>
      {items.length === 0 ? (
        <p className="help-none">No encontramos certificaciones para “{q}”. Prueba con otro rol o tema, o escríbenos desde Ayuda.</p>
      ) : (
        <div className="cat-grid">
          {items.map((c) => (
            <article key={c.slug} className="cert-card" id={`cert-${c.slug}`}>
              <div className="cert-top">
                <span className="cert-area">{c.area}</span>
                <span className={`cert-level l-${c.level.toLowerCase()}`}>{LEVEL_LABEL[c.level]}</span>
              </div>
              <h3>{c.name}</h3>
              {c.aet && <span className="cert-aet"><Icon name="check" size={14} /> En uso en AI Edge Talent</span>}
              <p>{c.learns}</p>
              <div className="cert-who">
                <span className="cert-k">Para</span>
                <ul>{c.forWho.map((w) => <li key={w}>{w}</li>)}</ul>
              </div>
              <details className="cert-mods">
                <summary>Malla · {c.modules.length} módulos <Icon name="chevronDown" size={18} /></summary>
                <ol>{c.modules.map((m) => <li key={m}>{m}</li>)}</ol>
              </details>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
