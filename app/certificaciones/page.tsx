import Link from "next/link";
import { CATALOG, CATALOG_SOURCE, ROLE_ROUTES, certBySlug } from "@/lib/data/aicert-catalog";
import { Icon } from "@/components/site/Icon";
import { Reveal } from "@/components/site/Reveal";
import { CertCatalog } from "@/components/site/CertCatalog";

export const metadata = {
  title: "Certificaciones AI CERTs · AI Edge Talent",
  description: "Las certificaciones AI CERTs que ofrece AI Edge Talent: qué aprende cada una, para qué roles sirve y su malla por módulos.",
};

/** Catálogo para clientes (y profesionales): consultar qué certificaciones hay y qué se aprende en cada una. */
export default function Certificaciones() {
  return (
    <div className="site-main">
      <section className="sec dark bleed cat-hero">
        <div className="sec-inner">
          <Reveal>
            <div className="eyebrow">AI CERTs · Catálogo</div>
            <h1>Certificaciones en IA para cada rol de su equipo.</h1>
            <p className="lead">{CATALOG.length} certificaciones internacionales AI CERTs, con su malla validada. Filtre por área o busque un rol para ver qué aprende cada profesional y cómo lo aplica en su operación.</p>
            <div className="cat-hero-stats">
              <span><b>{CATALOG.length}</b> certificaciones con malla</span>
              <span><b>{new Set(CATALOG.map((c) => c.area)).size}</b> áreas</span>
              <span><b>{CATALOG.filter((c) => c.aet).length}</b> en uso hoy en AI Edge Talent</span>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="sec">
        <div className="sec-inner">
          <CertCatalog />
        </div>
      </section>

      <section className="sec dark bleed" id="rutas">
        <div className="sec-inner">
          <Reveal className="sec-head">
            <div>
              <div className="eyebrow">Rutas por rol</div>
              <h2>De los fundamentos a la especialidad.</h2>
              <p>Una referencia para conversar con su Delivery: primero alfabetización y prompting, luego la certificación del oficio. La ruta final se acuerda según el rol y el desafío real.</p>
            </div>
          </Reveal>
          <div className="routes">
            {ROLE_ROUTES.map((r, i) => (
              <Reveal key={r.role} delay={i * 40} className="route-card">
                <h3>{r.role}</h3>
                <ol>
                  {r.steps.map((s) => {
                    const c = certBySlug(s)!;
                    return <li key={s}><a href={`#cert-${s}`}>{c.name.replace("™", "")}</a></li>;
                  })}
                </ol>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="sec-inner" style={{ padding: "var(--sp-section) 24px" }}>
        <Reveal className="cta-band">
          <div>
            <h2>¿Qué certificación necesita su equipo?</h2>
            <p>Su Delivery le ayuda a elegir la ruta según el rol de cada profesional y el desafío de su operación.</p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="pill accent lg" href="/clientes#nominar">Nominar profesionales <Icon name="arrowRight" size={18} /></Link>
            <Link className="pill ghost lg" href="/clientes">Cómo funciona</Link>
          </div>
        </Reveal>
        <p className="cat-note">
          Fuente: catálogo oficial de AI CERTs (aicerts.ai) y resúmenes ejecutivos de cada malla, al {CATALOG_SOURCE.date}. El catálogo oficial tiene {CATALOG_SOURCE.officialTotal} entradas en {CATALOG_SOURCE.officialAreas} áreas; aquí mostramos las que tienen malla validada.
          Los módulos son una síntesis en español: no reemplazan el material oficial y AI CERTs puede actualizarlos.
        </p>
      </section>
    </div>
  );
}
