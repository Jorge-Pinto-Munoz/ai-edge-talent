import { LIFECYCLE, type LifecycleStageId } from "@/lib/data/journey";

/**
 * Vistas del sitio público por tipo de persona (patrón "Para personas / Para empresas").
 * Lo común (programa y etapas) se comparte; cambia el menú, el home y la parte de cada etapa que se destaca.
 */
export type Audience = "profesional" | "cliente" | "equipo";
export const AUDIENCE_COOKIE = "aet_vista";
export const AUDIENCES: Audience[] = ["profesional", "cliente", "equipo"];

export const AUDIENCE: Record<
  Audience,
  { label: string; short: string; home: string; navBefore?: { href: string; label: string }[]; nav: { href: string; label: string }[]; cta: { href: string; label: string } }
> = {
  profesional: {
    label: "Soy profesional",
    short: "Profesional",
    home: "/",
    navBefore: [{ href: "/#wave-3", label: "Wave 3" }],
    nav: [
      { href: "/#que-se-espera", label: "Qué se espera" },
      { href: "/#mi-espacio", label: "Mi espacio" },
      { href: "/#preguntas", label: "Preguntas" },
    ],
    cta: { href: "/wave-3/postular", label: "Postular" },
  },
  cliente: {
    label: "Soy cliente",
    short: "Cliente",
    home: "/clientes",
    nav: [
      { href: "/clientes#como-funciona", label: "Cómo funciona" },
      { href: "/clientes#informacion", label: "Qué información recibes" },
      { href: "/certificaciones", label: "Certificaciones" },
      { href: "/ayuda?rol=CLIENT", label: "Preguntas" },
    ],
    cta: { href: "/clientes#nominar", label: "Nominar" },
  },
  equipo: {
    label: "Equipo Kibernum",
    short: "Equipo",
    home: "/equipo",
    nav: [
      { href: "/delivery/playbook", label: "Playbook" },
      { href: "/responsabilidades", label: "Responsabilidades" },
      { href: "/ayuda?rol=DELIVERY", label: "Preguntas" },
    ],
    cta: { href: "/inicio", label: "Entrar al portal" },
  },
};

export function isAudience(x: unknown): x is Audience {
  return typeof x === "string" && (AUDIENCES as string[]).includes(x);
}

/** Vista que corresponde a una ruta propia; null si la ruta es compartida (programa, etapas, ayuda). */
export function audienceOfPath(path: string): Audience | null {
  if (path === "/") return "profesional";
  if (path.startsWith("/clientes")) return "cliente";
  if (path.startsWith("/equipo")) return "equipo";
  return null;
}

/** Portales con sesión: llevan su propia navegación y no muestran la del sitio público. */
const PORTALS = ["/admin", "/mi-journey", "/mentor", "/cliente", "/inicio", "/sin-acceso"];
export function isPortalPath(path: string): boolean {
  return PORTALS.some((p) => path === p || path.startsWith(`${p}/`));
}

/** Etapas del ciclo completo que cubre cada etapa pública. */
const STAGE_MAP: Record<string, LifecycleStageId[]> = {
  assessment: ["NOMINATION", "APPLICATION", "ASSESSMENT", "SELECTION", "CONDITIONS"],
  mindset: ["ENROLLMENT", "MINDSET"],
  "role-enablement": ["AI_CERTS"],
  "ai-lab-showcase": ["AI_LAB", "SHOWCASE"],
  cierre: ["CLOSURE", "PILOT_ADOPTION"],
};

/** Qué hace cada actor en una etapa pública, reunido desde la fuente única del ciclo (lib/data/journey). */
export function stageRoles(slug: string) {
  const stages = LIFECYCLE.filter((s) => (STAGE_MAP[slug] ?? []).includes(s.id));
  const uniq = (xs: string[]) => [...new Set(xs)];
  return {
    client: uniq(stages.flatMap((s) => s.expectations.client)),
    delivery: uniq(stages.flatMap((s) => s.expectations.delivery)),
    evidence: uniq(stages.flatMap((s) => s.expectations.aetEvidence)),
  };
}
