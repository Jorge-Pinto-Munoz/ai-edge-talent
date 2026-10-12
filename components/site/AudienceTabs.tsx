"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "./Icon";

type Key = "profesional" | "cliente" | "kibernum";

const TABS: { key: Key; label: string; icon: IconName; title: string; lead: string; points: string[]; link: { href: string; label: string } }[] = [
  {
    key: "profesional",
    label: "Profesionales",
    icon: "user",
    title: "Para profesionales TI de Kibernum",
    lead: "Si ya usas IA en tu trabajo y quieres llevarla más lejos, con una oportunidad real de aplicarla en tu cliente.",
    points: [
      "Integras IA a tu rol con método y criterio",
      "Te certificas con financiamiento de Kibernum",
      "Construyes un caso real y lo presentas al cliente",
      "Tienes un mentor que te da feedback cada semana",
    ],
    link: { href: "/wave-3/postular", label: "Postular a Wave 3" },
  },
  {
    key: "cliente",
    label: "Clientes",
    icon: "building",
    title: "Para clientes de Kibernum",
    lead: "Tus profesionales aplican lo aprendido directamente en tu contexto, y tú decides sobre los casos con continuidad.",
    points: [
      "Nominas profesionales junto a Delivery (nominar no garantiza selección)",
      "Habilitas disponibilidad coordinada, normalmente 2 a 3 horas por semana",
      "Ayudas a validar el problema en AI Lab",
      "Decides en el Showcase si el caso continúa como piloto",
    ],
    link: { href: "/clientes", label: "Ver AET para clientes" },
  },
  {
    key: "kibernum",
    label: "Equipo Kibernum",
    icon: "compass",
    title: "Para Delivery, mentores y equipo AET",
    lead: "Coordinas cada etapa, acompañas el avance y registras la evidencia en un solo lugar.",
    points: [
      "Ves el estado de cada participante por Wave",
      "Revisas entregas, certificaciones y feedback semanal",
      "Comunicas resultados sin exponer puntajes",
      "Haces seguimiento de adopción a 1 y 3 meses",
    ],
    link: { href: "/equipo", label: "Ver AET para el equipo" },
  },
];

export function AudienceTabs() {
  const [tab, setTab] = useState<Key>("profesional");
  useEffect(() => {
    const fromHash = () => {
      if (location.hash === "#cliente") setTab("cliente");
      if (location.hash === "#para-quien") setTab("profesional");
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);
  const t = TABS.find((x) => x.key === tab)!;
  return (
    <div>
      <div className="tabs-x" role="tablist" aria-label="Para quién">
        {TABS.map((x) => (
          <button key={x.key} role="tab" id={`tab-${x.key}`} aria-selected={tab === x.key} aria-controls="panel-audiencia" onClick={() => setTab(x.key)}>
            {x.label}
          </button>
        ))}
      </div>
      <div key={t.key} id="panel-audiencia" role="tabpanel" aria-labelledby={`tab-${t.key}`} className="tab-panel split" style={{ alignItems: "stretch" }}>
        <div>
          <span className="aud-ico"><Icon name={t.icon} size={26} /></span>
          <h3 style={{ fontSize: "var(--fs-h3)", margin: "16px 0 10px" }}>{t.title}</h3>
          <p className="muted" style={{ fontSize: "var(--fs-lead)" }}>{t.lead}</p>
          <Link href={t.link.href} className="more-link">{t.link.label} <Icon name="arrowRight" size={16} /></Link>
        </div>
        <div className="list-card">
          <ul>
            {t.points.map((p) => (
              <li key={p}><span className="tick"><Icon name="check" size={16} /></span>{p}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
