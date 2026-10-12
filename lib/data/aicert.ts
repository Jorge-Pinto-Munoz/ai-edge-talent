/**
 * AI CERTs en AI Edge Talent: qué es, rutas por rol, qué recibes al aprobar y cómo te acompañamos después.
 * Fuente: blueprint del producto (certificación híbrida: Kibernum certifica mindset y ejecución práctica;
 * AI CERTs / AGI Search otorga el respaldo técnico externo). Los nombres de certificación por rol los confirma
 * el líder del servicio: se editan aquí y se actualizan en todas las vistas.
 */
export const AICERT = {
  what: "AI CERTs™ es una certificadora internacional especializada en inteligencia artificial. Sus certificaciones AI+ validan, con examen, el dominio técnico de la IA aplicada a un rol.",
  hybrid: "En AI Edge Talent la certificación es híbrida: Kibernum certifica tu mindset AI First y tu ejecución práctica en el AI Lab; AI CERTs certifica tu dominio técnico con un respaldo externo y verificable.",
  format: [
    { k: "Ruta", v: "8 h de fundamentos + 40 h de especialización por rol" },
    { k: "Ritmo", v: "Normalmente 3 a 4 semanas, con un profesor que acompaña" },
    { k: "Costo", v: "Kibernum financia el 100 %, incluidos hasta dos intentos de examen" },
  ],
  gate: "La certificación aprobada y verificada es la llave del AI Lab.",
};

export interface RolePath {
  family: string;
  roles: string;
  profile: string; // perfil evolucionado
  focus: string;
}

/** Rutas por familia de rol (la ruta exacta se define según tu cargo antes de inscribirte). */
export const ROLE_PATHS: RolePath[] = [
  { family: "Ingeniería de software", roles: "Developer, Backend, Frontend", profile: "AI+ Developer™", focus: "IA en todo el ciclo de desarrollo: generación y revisión de código, refactorización y pruebas." },
  { family: "Calidad y QA", roles: "QA Analyst, QA Automation", profile: "QA aumentado con IA", focus: "Testing generativo, datos sintéticos y calidad preventiva en lugar de validar al final." },
  { family: "Agilidad y gestión", roles: "Scrum Master, Agile Coach, PO", profile: "Velocity Manager™", focus: "Métricas predictivas (throughput, lead time) y automatización de la gobernanza del equipo." },
  { family: "Datos y BI", roles: "Data Analyst, BI, Data Engineer", profile: "Analista aumentado con IA", focus: "Storytelling asistido y detección proactiva de anomalías: de reportes a inteligencia accionable." },
];

/** Lo que recibe el profesional al aprobar. */
export const AICERT_REWARDS = [
  { icon: "badge" as const, title: "Certificado oficial AI CERTs", body: "Diploma digital emitido por AI CERTs, con verificación en línea." },
  { icon: "star" as const, title: "Badge para LinkedIn", body: "Insignia digital verificable para tu perfil. Kibernum celebra públicamente tu logro." },
  { icon: "flask" as const, title: "Acceso al AI Lab", body: "Con la certificación verificada pasas a construir un caso real con tu cliente." },
];

/** Acompañamiento después de certificarte. */
export const AICERT_AFTER = [
  { when: "Mes 1", title: "Adopción", body: "Validamos contigo y con tu cliente qué herramientas de IA ya usas en tu trabajo diario." },
  { when: "Mes 3", title: "Impacto", body: "Medimos el impacto real: si se cumplió el compromiso de agilidad del Showcase y cómo se compara con el punto de partida." },
  { when: "Siempre", title: "Aprendizaje continuo", body: "Acceso al catálogo de Coursera Enterprise (Google, Microsoft, AWS, Meta, IBM) y soporte del Hub AI." },
  { when: "Siempre", title: "Banca de talento", body: "Quedas visible como talento habilitado en IA para nuevas oportunidades dentro de Kibernum." },
];

/** Impacto que buscamos. */
export const AICERT_IMPACT = {
  headline: "Hasta 30 % más productividad",
  body: "Buscamos que la IA reduzca tu carga operativa y mejore tu output mes a mes: con evidencia (un caso funcionando en tu cliente) y un compromiso de agilidad que medimos a los 3 meses.",
};

/** Versión para clientes: qué gana su equipo. */
export const AICERT_CLIENT = {
  intro: "Cada profesional se certifica en IA aplicada a su rol con AI CERTs, una certificadora internacional. Kibernum financia la certificación y la habilitación ocurre en paralelo al servicio, sin descontar horas.",
  receives: [
    "Un profesional con certificación técnica externa y verificable en su rol.",
    "Un caso de IA funcionando en su operación, presentado en el Showcase.",
    "Un compromiso de agilidad con metas medibles, revisado al mes 1 y al mes 3.",
  ],
};
