/** Nombres de los roles tal como se ven en la plataforma. ("profesor" ya no se asigna: solo para registros antiguos.) */
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

/** Todos los roles que Administración puede asignar. */
export const ASSIGNABLE_ROLES = ["kiber", "delivery", "bp", "mentor", "hub", "admin", "client"] as const;
export type Role = (typeof ASSIGNABLE_ROLES)[number];
export const isRole = (r: string): r is Role => (ASSIGNABLE_ROLES as readonly string[]).includes(r);

/**
 * Roles internos: solo los crea o asigna Administración (nunca un formulario público). La base de datos aplica la
 * misma regla: una cuenta con rol interno no tiene permisos hasta activarse con un código enviado a su correo.
 */
export const INTERNAL_ROLES = ["admin", "delivery", "hub", "mentor", "profesor", "bp"] as const;
export const isInternalRole = (r: string) => (INTERNAL_ROLES as readonly string[]).includes(r);

/**
 * Lo único que una persona puede pedir al crear su cuenta desde el sitio. Business Partner es una solicitud: el
 * rol definitivo lo decide Administración al aprobar.
 */
export const PUBLIC_REQUEST_ROLES = ["kiber", "bp"] as const;
export type PublicRequestRole = (typeof PUBLIC_REQUEST_ROLES)[number];
export const isPublicRequestRole = (r: string): r is PublicRequestRole => (PUBLIC_REQUEST_ROLES as readonly string[]).includes(r);

/** Roles que Administración puede crear directamente desde Usuarios y accesos. */
export const CREATABLE_ROLES = ["kiber", "delivery", "hub", "mentor", "bp", "admin"] as const;
export type CreatableRole = (typeof CREATABLE_ROLES)[number];
