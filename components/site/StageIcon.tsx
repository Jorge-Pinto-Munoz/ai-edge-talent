import { Icon, type IconName } from "@/components/site/Icon";

/**
 * Ícono de etapa: un solo punto para toda la plataforma (menú, tarjetas, programa, portal).
 * Cuando llegue la iconografía oficial, se deja cada SVG en /public/icons/etapas/<slug>.svg y se
 * registra aquí: se pinta con el color del texto (máscara CSS), así funciona en claro, oscuro y sobre fotos.
 */
const OFFICIAL: Partial<Record<StageSlug, string>> = {
  // assessment: "/icons/etapas/assessment.svg",
};

export type StageSlug = "assessment" | "mindset" | "role-enablement" | "ai-lab-showcase" | "cierre";

export function StageIcon({ slug, fallback, size = 22, label }: { slug: string; fallback: IconName; size?: number; label?: string }) {
  const src = OFFICIAL[slug as StageSlug];
  if (!src) return <Icon name={fallback} size={size} />;
  return (
    <span
      className="stage-icon"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ width: size, height: size, WebkitMaskImage: `url(${src})`, maskImage: `url(${src})` }}
    />
  );
}
