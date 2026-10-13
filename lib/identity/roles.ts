/** Nombres de los roles tal como se ven en la plataforma. */
export const ROLE_LABEL: Record<string, string> = {
  kiber: "Profesional",
  delivery: "Delivery",
  bp: "Business Partner",
  mentor: "AI Coach",
  hub: "Líder Hub AI",
  profesor: "Profesor",
  admin: "Líder de producto (admin)",
  client: "Cliente",
};

/** Roles que una persona puede pedir al crear su cuenta (el admin asigna el definitivo al aprobar). */
export const ACCOUNT_ROLES = ["kiber", "delivery", "bp", "mentor", "hub", "admin"] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];
export const isAccountRole = (r: string): r is AccountRole => (ACCOUNT_ROLES as readonly string[]).includes(r);
