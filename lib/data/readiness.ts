import type { ReadinessCategory, ReadinessItem, ReadinessState } from "@/lib/domain/types";

export const READINESS_CATEGORY_LABEL: Record<ReadinessCategory, string> = {
  PRODUCT: "Producto",
  ACTORS: "Actores",
  OPERATION: "Operación",
  CLIENT: "Cliente",
};

export const READINESS_ITEMS: ReadinessItem[] = [
  { id: "p-master", category: "PRODUCT", label: "Product Master vigente" },
  { id: "p-journey", category: "PRODUCT", label: "Journey vigente" },
  { id: "p-evaluators", category: "PRODUCT", label: "Evaluadores vigentes" },
  { id: "p-mindset", category: "PRODUCT", label: "Mindset Experience" },
  { id: "p-cert", category: "PRODUCT", label: "CERT Playbook" },
  { id: "p-lab", category: "PRODUCT", label: "AI Lab" },
  { id: "p-showcase", category: "PRODUCT", label: "Showcase" },
  { id: "p-closure", category: "PRODUCT", label: "Closure" },
  { id: "p-comms", category: "PRODUCT", label: "Communications" },

  { id: "a-pl", category: "ACTORS", label: "Product Lead asignado" },
  { id: "a-wl", category: "ACTORS", label: "Wave Lead asignado" },
  { id: "a-delivery", category: "ACTORS", label: "Delivery asignado" },
  { id: "a-bp", category: "ACTORS", label: "BP (cuando corresponda)", optional: true },
  { id: "a-client", category: "ACTORS", label: "Cliente / sponsor identificado" },
  { id: "a-ita", category: "ACTORS", label: "IT Academy" },
  { id: "a-prof", category: "ACTORS", label: "Profesor" },
  { id: "a-hub", category: "ACTORS", label: "Hub AI" },

  { id: "o-dates", category: "OPERATION", label: "Fechas definidas" },
  { id: "o-avail", category: "OPERATION", label: "Disponibilidad validada" },
  { id: "o-target", category: "OPERATION", label: "Número objetivo de profesionales" },
  { id: "o-channels", category: "OPERATION", label: "Canales definidos" },
  { id: "o-owners", category: "OPERATION", label: "Responsables definidos" },
  { id: "o-templates", category: "OPERATION", label: "Templates de comunicación" },
  { id: "o-data", category: "OPERATION", label: "Data structure" },
  { id: "o-perms", category: "OPERATION", label: "Permisos de plataforma" },

  { id: "c-aet", category: "CLIENT", label: "Cliente conoce AET" },
  { id: "c-journey", category: "CLIENT", label: "Cliente conoce el journey" },
  { id: "c-dedication", category: "CLIENT", label: "Cliente conoce la dedicación" },
  { id: "c-nomination", category: "CLIENT", label: "Cliente comprende que nominación no garantiza ingreso" },
  { id: "c-availability", category: "CLIENT", label: "Cliente acuerda disponibilidad laboral" },
  { id: "c-lab", category: "CLIENT", label: "Cliente conoce su rol en Lab/Showcase" },
];

const allOk = (note: string): ReadinessState["items"] =>
  Object.fromEntries(READINESS_ITEMS.map((i) => [i.id, { status: i.optional ? "NOT_APPLICABLE" : "OK", note }])) as ReadinessState["items"];

/** Estado semilla del checklist por Wave (DEMO: confirmar contra fuente real). */
export const SEED_READINESS: Record<string, ReadinessState> = {
  "wave-3": {
    items: allOk("Estado demo — confirmar con Product Lead"),
    declaredReadyAt: "2026-10-01T10:00:00-03:00",
    declaredReadyBy: "Jorge Pinto (demo)",
  },
  "wave-4": {
    items: {
      "p-master": { status: "OK" },
      "p-journey": { status: "OK" },
      "a-pl": { status: "OK" },
    },
  },
  "special-edition": { items: {} },
};
