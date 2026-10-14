import Link from "next/link";
import { CATALOG, CATALOG_SOURCE, ROLE_FAMILIES } from "@/lib/data/aicert-catalog";
import { programAdoption } from "@/lib/aicert/adoption";
import { Icon } from "@/components/site/Icon";
import { Reveal } from "@/components/site/Reveal";
import { CertCatalog } from "@/components/site/CertCatalog";
import { AdoptionSection } from "@/components/site/AdoptionSection";

export const metadata = {
  title: "Certificaciones AI CERTs · AI Edge Talent",
  description: "Explora por rol las certificaciones AI CERTs de AI Edge Talent: qué aprende cada profesional, sus competencias y cómo se aplica en el trabajo.",
};
export const revalidate = 600;

/** Explora el talento que quieres desarrollar: rol → certificaciones → detalle, y la evidencia del programa. */
export default async function Certificaciones() {
  const adoption = await programAdoption();
  return (
    <div className="site-main">
      <section className="sec dark bleed cat-hero">
        <div className="sec-inner">
          <Reveal>
            <div className="eyebrow">AI CERTs · Catálogo</div>
            <h1>Explora el talento que quieres desarrollar.</h1>
            <p className="lead">Elige uno o varios roles de tu equipo y descubre qué certificación internacional AI CERTs corresponde, qué aprende cada profesional y cómo lo aplica en tu operación.</p>
            <div className="cat-hero-stats">
              <span><b>{CATALOG.length}</b> certificaciones con malla validada</span>
              <span><b>{ROLE_FAMILIES.length}</b> familias de rol</span>
              <span><b>100 %</b> financiadas por Kibernum</span>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="sec" style={{ paddingTop: 48 }}>
        <div className="sec-inner">
          <CertCatalog />
        </div>
      </section>

      <section className="sec bleed adopt-sec" id="talento" style={{ paddingTop: 0 }}>
        <div className="sec-inner">
          <Reveal className="sec-head">
            <div>
              <div className="eyebrow">Evidencia del programa</div>
              <h2>Talento que estamos desarrollando.</h2>
              <p>Cifras reales y agregadas de AI Edge Talent. Se actualizan solas a medida que avanzan las Waves.</p>
            </div>
          </Reveal>
          <AdoptionSection data={adoption} />
        </div>
      </section>

      <section className="sec-inner" style={{ paddingBottom: "var(--sp-section)" }}>
        <Reveal className="cta-band">
          <div>
            <h2>¿Qué certificación necesita tu equipo?</h2>
            <p>Tu Delivery te ayuda a elegir la ruta según el rol de cada profesional y el desafío de tu operación.</p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link className="pill accent lg" href="/clientes#nominar">Nominar profesionales <Icon name="arrowRight" size={18} /></Link>
            <Link className="pill ghost lg" href="/clientes">Cómo funciona</Link>
          </div>
        </Reveal>
        <p className="cat-note">
          Fuente: catálogo oficial de AI CERTs (aicerts.ai) y resúmenes ejecutivos de cada malla, al {CATALOG_SOURCE.date}. El catálogo oficial tiene {CATALOG_SOURCE.officialTotal} entradas en {CATALOG_SOURCE.officialAreas} áreas; aquí mostramos las que tienen malla validada. Los niveles corresponden al nombre oficial de cada certificación.
        </p>
      </section>
    </div>
  );
}
