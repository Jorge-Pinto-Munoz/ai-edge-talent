import { DELIVERY_STAGES } from "@/lib/data/delivery-guide";
import type { IconName } from "@/components/site/Icon";
import type { Layer } from "./rules";

/**
 * Etapas del journey para el seguimiento de la Wave (portal interno). Nombres y orden oficiales del programa
 * (lib/journey/rules.ts → LAYERS; "AI First Mindset" es el nombre público de la capa AI_MINDSET).
 * Propósito e hitos salen de la guía de Delivery: no se agregan reglas nuevas.
 */
export type StageSlug = "assessment" | "mindset" | "role-enablement" | "ai-lab" | "showcase" | "cierre";
export interface StageTab { key: string; label: string; adminOnly?: boolean }
export interface JourneyStage {
  slug: StageSlug;
  layer: Layer;
  n: number;
  name: string;
  icon: IconName;
  purpose: string;
  milestones: string[];
  tabs: StageTab[];
}

const guide = (...ids: string[]) => DELIVERY_STAGES.filter((s) => ids.includes(s.id));
const purposeOf = (id: string) => guide(id)[0]?.purpose ?? "";
const milestonesOf = (...ids: string[]) => guide(...ids).flatMap((s) => s.milestones);

export const JOURNEY_STAGES: JourneyStage[] = [
  {
    slug: "assessment", layer: "ASSESSMENT", n: 1, name: "Assessment", icon: "target",
    purpose: purposeOf("assessment"), milestones: milestonesOf("assessment"),
    tabs: [{ key: "resumen", label: "Postulaciones y decisiones" }, { key: "criterios", label: "Criterios de evaluación", adminOnly: true }],
  },
  {
    slug: "mindset", layer: "AI_MINDSET", n: 2, name: "AI First Mindset", icon: "brain",
    purpose: purposeOf("mindset"), milestones: milestonesOf("mindset"),
    tabs: [{ key: "entregas", label: "Participantes y entregas" }, { key: "contenido", label: "Contenido (módulos)", adminOnly: true }],
  },
  {
    slug: "role-enablement", layer: "ROLE_ENABLEMENT", n: 3, name: "Role Enablement", icon: "badge",
    purpose: purposeOf("certs"), milestones: milestonesOf("certs"),
    tabs: [
      { key: "participantes", label: "Participantes" },
      { key: "aicert", label: "Avance AI CERT" },
      { key: "certificaciones", label: "Certificaciones" },
      { key: "entregas", label: "Entregas" },
      { key: "clases", label: "Sesiones (4 semanas)" },
      { key: "contenido", label: "Contenido (módulos)", adminOnly: true },
    ],
  },
  {
    slug: "ai-lab", layer: "AI_LAB_SHOWCASE", n: 4, name: "AI Lab", icon: "flask",
    purpose: purposeOf("lab"), milestones: milestonesOf("lab"),
    tabs: [
      { key: "participantes", label: "Participantes" },
      { key: "pase", label: "Pase al Lab" },
      { key: "clases", label: "Clases del Lab" },
      { key: "proyectos", label: "Proyectos y avances" },
      { key: "contenido", label: "Contenido (módulos)", adminOnly: true },
    ],
  },
  {
    slug: "showcase", layer: "SHOWCASE", n: 5, name: "Showcase", icon: "presentation",
    purpose: purposeOf("showcase"), milestones: milestonesOf("showcase"),
    tabs: [
      { key: "showcase", label: "Presentaciones y resultados" },
      { key: "participantes", label: "Participantes" },
      { key: "contenido", label: "Contenido (módulos)", adminOnly: true },
    ],
  },
  {
    slug: "cierre", layer: "CLOSURE", n: 6, name: "Cierre", icon: "flag",
    purpose: purposeOf("closure"), milestones: milestonesOf("closure"),
    tabs: [{ key: "participantes", label: "Participantes" }, { key: "resultados", label: "Resultados" }, { key: "contenido", label: "Contenido (módulos)", adminOnly: true }],
  },
];

export const stageBySlug = (slug: string) => JOURNEY_STAGES.find((s) => s.slug === slug) ?? null;
export const stageByLayer = (layer: Layer) => JOURNEY_STAGES.find((s) => s.layer === layer)!;

/** Pestañas de Journey (rutas históricas con ?tab=) → su lugar nuevo dentro de una etapa. */
export const LEGACY_JOURNEY_TAB: Record<string, string> = {
  entregas: "mindset?tab=entregas",
  aicert: "role-enablement?tab=aicert",
  certificaciones: "role-enablement?tab=certificaciones",
};
