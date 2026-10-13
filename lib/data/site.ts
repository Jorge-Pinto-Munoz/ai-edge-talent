import type { BrandImage } from "@/components/ui";
import type { IconName } from "@/components/site/Icon";

/**
 * Contenido del sitio público (home, /programa, /programa/[etapa]).
 * Las reglas salen de lib/data/journey.ts y lib/data/program.ts; aquí se cuentan para quien recién llega.
 */

export interface PublicStage {
  slug: string;
  n: number;
  name: string;
  /** Una línea: qué logras en esta etapa. */
  tagline: string;
  icon: IconName;
  image: BrandImage;
  /** Foco de la foto en tarjetas verticales (dónde están las caras). */
  photoPos?: string;
  facts: { label: string; value: string }[];
  intro: string;
  happens: { title: string; body: string }[];
  youDo: string[];
  youGet: string[];
  advance: string;
  ifNot: string;
}

export const PUBLIC_STAGES: PublicStage[] = [
  {
    slug: "assessment",
    n: 1,
    name: "Postulación y Assessment",
    tagline: "Cuéntanos cómo usas IA hoy en tu trabajo real.",
    icon: "spark",
    image: "retrato-perfil",
    photoPos: "36% 30%",
    facts: [
      { label: "Duración", value: "Hasta el cierre de postulación" },
      { label: "Formato", value: "Formulario personal en línea" },
      { label: "Resultado", value: "Selección por evidencia" },
    ],
    intro:
      "Postulas con un formulario personal basado en experiencias reales con IA. No buscamos respuestas perfectas: buscamos evidencia de cómo trabajas hoy y de tu disposición a llevarlo más lejos.",
    happens: [
      { title: "Te identificas y conoces las exigencias", body: "Antes de responder ves qué implica el programa y confirmas que quieres postular de forma informada." },
      { title: "Respondes el Assessment", body: "Preguntas sobre usos reales de IA, la profundidad de tus casos y cómo reformulas tu trabajo." },
      { title: "Se evalúa con una rúbrica conocida", body: "Cinco dimensiones: uso real de IA, profundidad del caso, capacidad de reformular el trabajo, aprendizaje autónomo y relación saludable con IA." },
      { title: "Recibes tu resultado", body: "Seleccionado/a, complemento por video, revisión humana o no seleccionado/a. La IA propone y una persona decide." },
    ],
    youDo: ["Responder personalmente, con ejemplos reales", "Leer las condiciones antes de enviar", "Postular antes del cierre"],
    youGet: ["Un resultado claro y trazable", "Si quedas bajo el corte, una instancia de complemento por video", "Tu puntaje nunca se comparte con el cliente"],
    advance: "Si eres seleccionado/a, aceptas formalmente tu compromiso y quedas inscrito/a en la Wave.",
    ifNot: "Postular no garantiza selección. Puedes volver a postular en una próxima Wave.",
  },
  {
    slug: "mindset",
    n: 2,
    name: "AI First Mindset",
    tagline: "Rediseñas una actividad real de tu trabajo integrando IA con criterio.",
    icon: "brain",
    image: "profesional-tablet",
    photoPos: "84% 30%",
    facts: [
      { label: "Formato", value: "Contenido e-learning + trabajo evaluado" },
      { label: "Evaluación", value: "Desafío sobre un caso real" },
      { label: "Estándar", value: "≥ 75/100" },
    ],
    intro:
      "Accedes al contenido e-learning (cápsulas cortas, a tu ritmo) y luego realizas un pequeño trabajo evaluado: tomar una actividad real de tu rol y rediseñarla con IA. Descargas el material, practicas y subes tu entrega.",
    happens: [
      { title: "Accedes al contenido e-learning", body: "Cápsulas breves con material descargable, como en un curso online, ordenadas para avanzar sin perderte." },
      { title: "Eliges una actividad real", body: "Algo que haces todas las semanas y que puede mejorar con IA." },
      { title: "Haces el trabajo evaluado", body: "Una entrega corta con evidencia propia: antes, después y por qué funciona." },
      { title: "Recibes feedback", body: "Se revisa con criterios conocidos de antemano y te decimos qué fortalecer." },
    ],
    youDo: ["Ver las cápsulas y descargar el material", "Entregar un rediseño con evidencia propia", "Conocer los criterios antes de entregar"],
    youGet: ["Un método para integrar IA a tu trabajo", "Feedback concreto sobre tu entrega", "Acceso a la certificación de tu rol"],
    advance: "Con tu tarea aprobada pasas a Role Enablement.",
    ifNot: "Si tu entrega aún no alcanza el estándar, recibes feedback concreto para fortalecerla. Las reglas de continuidad están en tu compromiso de participación.",
  },
  {
    slug: "role-enablement",
    n: 3,
    name: "Role Enablement",
    tagline: "Te certificas en IA aplicada a tu rol, con profesor y AI Coach.",
    icon: "badge",
    image: "trabajo-laptop",
    photoPos: "30% 30%",
    facts: [
      { label: "Ruta", value: "Introductorio + especialista" },
      { label: "Avance", value: "Por tramos (1 a 5)" },
      { label: "Acompañamiento", value: "Profesor y AI Coach" },
    ],
    intro:
      "Es la etapa de certificación técnica (AI CERTs) alineada a tu rol. Combinas autoestudio con un profesor y un canal de cohorte, y un AI Coach te acompaña con feedback semanal.",
    happens: [
      { title: "Estudias a tu ritmo", body: "Curso introductorio y luego el especialista de tu rol (por ejemplo, AI+ Developer Practitioner™), avanzando por tramos en la plataforma AI CERTs." },
      { title: "Te acompañan", body: "Profesor y canal de cohorte para dudas; AI Coach asignado que deja feedback cada semana." },
      { title: "Rindes tu examen", body: "Kibernum financia tu certificación." },
      { title: "Registras tu certificación", body: "Subes el certificado a la plataforma y se verifica." },
    ],
    youDo: ["Mantener un avance semanal", "Participar del acompañamiento", "Rendir el examen con seriedad"],
    youGet: ["Una certificación reconocida en IA para tu rol", "Feedback semanal de tu AI Coach", "El pase a AI Lab"],
    advance: "Con la certificación aprobada y verificada entras a AI Lab.",
    ifNot: "Tu profesor y tu AI Coach te ayudan a prepararte. Las reglas de continuidad están en tu compromiso de participación.",
  },
  {
    slug: "ai-lab-showcase",
    n: 4,
    name: "AI Lab & Showcase",
    tagline: "Construyes una solución para una necesidad real y la presentas al cliente.",
    icon: "flask",
    image: "colaboracion",
    photoPos: "60% 30%",
    facts: [
      { label: "Clases", value: "Dos con el Hub AI" },
      { label: "Entregable", value: "Demo sobre el caso real" },
      { label: "Showcase", value: "15–20 min · máx. 8 slides" },
    ],
    intro:
      "Aplicas lo aprendido a un problema validado con tu cliente. Entre dos sesiones guiadas construyes un prototipo con evidencia de valor y, cuando está listo, lo presentas en el Showcase.",
    happens: [
      { title: "Validas el problema", body: "Junto al cliente defines una necesidad real, su usuario y la fricción que quieres resolver." },
      { title: "Construyes", body: "Trabajo autónomo entre dos sesiones obligatorias de 90 minutos." },
      { title: "Llegas a READY FOR SHOWCASE", body: "Con un prototipo demostrable y evidencia suficiente." },
      { title: "Presentas", body: "El problema del negocio, tu enfoque con IA, la demo en vivo, el impacto en tiempo y el contraste: qué hubiese pasado sin esta mejora." },
    ],
    youDo: ["Asistir a las dos sesiones", "Construir entre sesiones", "Cuidar la confidencialidad del cliente"],
    youGet: ["Un caso real en tu portafolio", "Una conversación de continuidad con el cliente", "Visibilidad como talento AET"],
    advance: "Muestras un resultado con impacto real para el negocio. Si genera valor, el caso puede continuar como piloto.",
    ifNot: "Ajustas y mejoras tu solución con el Hub AI hasta que esté lista para mostrar su impacto.",
  },
  {
    slug: "cierre",
    n: 5,
    name: "Cierre y continuidad",
    tagline: "Cierras con evidencia y, si corresponde, tu caso sigue como piloto.",
    icon: "flag",
    image: "equipo",
    photoPos: "70% 30%",
    facts: [
      { label: "Cierre", value: "Formal, con acciones" },
      { label: "Seguimiento", value: "Mes 1 y Mes 3" },
      { label: "Continuidad", value: "Piloto en el cliente" },
    ],
    intro:
      "El programa termina con un cierre formal: resultado, evidencia y próximos pasos. Después hacemos seguimiento para medir la adopción real de IA y el impacto en tu servicio.",
    happens: [
      { title: "Cierre formal", body: "Resultado, evidencia y acciones con responsables." },
      { title: "Seguimiento Mes 1", body: "Cómo estás usando lo aprendido y cómo lo percibe el cliente." },
      { title: "Seguimiento Mes 3", body: "Impacto real y siguiente experimento." },
      { title: "Banca de talento AET", body: "Tu perfil queda visible como talento habilitado en IA." },
    ],
    youDo: ["Cerrar formalmente tu proceso", "Sostener el experimento acordado"],
    youGet: ["Reconocimiento como talento AET", "Seguimiento de tu impacto", "Posibles casos con continuidad"],
    advance: "Tu caso puede continuar como piloto en el cliente.",
    ifNot: "—",
  },
];

export const stageBySlug = (slug: string) => PUBLIC_STAGES.find((s) => s.slug === slug);

/** Cómo se evalúa y cómo avanzas en cada etapa (home y /programa). */
export const STAGE_GATES: { stage: string; slug: string; how: string; dims?: string[]; pass: string }[] = [
  { stage: "Postulación y Assessment", slug: "assessment", how: "Rúbrica de madurez en IA, conocida de antemano, aplicada a tus casos reales.", dims: ["Uso real de IA", "Profundidad del caso", "Reformulación del trabajo", "Aprendizaje autónomo", "Disposición"], pass: "Selección por evidencia, no por seniority. Si quedas bajo el corte, una segunda oportunidad con video." },
  { stage: "AI First Mindset", slug: "mindset", how: "Contenido e-learning y un desafío evaluado sobre un caso real de tu trabajo.", pass: "Rediseñas con IA una actividad real, con criterio y evidencia propia." },
  { stage: "Role Enablement", slug: "role-enablement", how: "Ruta AI CERTs de tu rol: estudio autónomo en la plataforma y acompañamiento de tu AI Coach.", pass: "Certificación AI CERT aprobada y verificada." },
  { stage: "AI Lab & Showcase", slug: "ai-lab-showcase", how: "Construyes algo real y de impacto para el negocio: puedes levantarlo antes con tu cliente y lo desarrollas con el Hub AI.", pass: "Lo presentas con evidencia de impacto. La habilitación no queda en un curso y una certificación: genera valor real que devuelve la inversión." },
  { stage: "Cierre y continuidad", slug: "cierre", how: "Cierre formal con evidencia y seguimiento al mes 1 y al mes 3.", pass: "Adopción sostenida e impacto medido antes y después." },
];

/** Qué se espera de ti, en concreto, y qué recibes a cambio. */
export const EXPECTATIONS: { commit: { title: string; body: string; icon: IconName }[]; get: { title: string; body: string; icon: IconName }[] } = {
  commit: [
    { title: "2 a 3 horas por semana", body: "Espacios coordinados con tu Delivery dentro de la jornada, más tu tiempo de estudio.", icon: "clock" },
    { title: "Completar tu proceso formativo", body: "Estudio autodidacta en la plataforma AI CERTs y trabajo con tu AI Coach, a tu ritmo.", icon: "book" },
    { title: "Asistir y participar", body: "Clases con tu profesor y las dos sesiones del AI Lab con el Hub AI.", icon: "users" },
    { title: "Entregar con evidencia propia", body: "Tu trabajo de Mindset y tu caso del AI Lab, con antes, después y por qué funciona.", icon: "upload" },
    { title: "Equilibrar trabajo y estudio", body: "Cumples con tu cliente mientras avanzas. Como todo proceso formativo de alto nivel, puede requerir tiempo propio.", icon: "target" },
    { title: "Contarnos cómo vas", body: "Pulsos de 2 minutos al cerrar cada etapa. No son evaluaciones.", icon: "chat" },
  ],
  get: [
    { title: "100 % financiado", body: "Habilitación, certificación AI CERT y AI Lab.", icon: "check" },
    { title: "Certificado AI CERTs y badge", body: "Diploma oficial verificable y badge para LinkedIn.", icon: "badge" },
    { title: "AI Coach y profesor", body: "Feedback semanal y apoyo para destrabarte.", icon: "chat" },
    { title: "Un caso real en tu portafolio", body: "Presentado al cliente en el Showcase.", icon: "presentation" },
    { title: "Banca de talento", body: "Quedas visible como talento habilitado en IA.", icon: "star" },
  ],
};

/** Mi espacio: el portal del profesional, contado en el home. */
export const MI_ESPACIO: { title: string; body: string; icon: IconName }[] = [
  { title: "Siempre sabes tu siguiente paso", body: "Tu camino por etapas, con lo que está listo, lo que viene y lo que está en revisión.", icon: "route" },
  { title: "Materiales y entregas en un lugar", body: "Descargas guías y plantillas, ves los videos y subes tus entregas desde el celular.", icon: "download" },
  { title: "Tu avance AI CERT por tramos", body: "Ves en qué curso y tramo vas, y la fecha de tu examen.", icon: "badge" },
  { title: "Ayuda en un clic", body: "Preguntas frecuentes y un canal directo con el equipo.", icon: "help" },
];

export const BENEFITS: { title: string; body: string; icon: IconName; size?: "wide" | "full" }[] = [
  { title: "IA aplicada a tu rol real", body: "No es un curso genérico: todo termina en tu trabajo, con tu cliente.", icon: "target", size: "wide" },
  { title: "Certificación AI CERTs", body: "Financiada 100 % por Kibernum.", icon: "badge" },
  { title: "AI Coach con feedback semanal", body: "Alguien que sigue tu avance y te ayuda a destrabarte.", icon: "chat" },
  { title: "Showcase con el cliente", body: "Presentas un caso real con evidencia de valor.", icon: "presentation", size: "wide" },
  { title: "Banca de talento", body: "Al cerrar, quedas visible como talento habilitado en IA para nuevas oportunidades.", icon: "star", size: "full" },
];

export const WAVE3_TIMELINE: { when: string; title: string; body: string; done?: boolean }[] = [
  { when: "Ahora", title: "Postulación abierta", body: "Responde el Assessment con tus experiencias reales." },
  { when: "Vie 16 oct · 12:00", title: "Cierre de postulación", body: "Después de esa hora no se reciben postulaciones." },
  { when: "Después del cierre", title: "Resultados", body: "Recibes tu resultado por correo y en tu espacio." },
  { when: "Al inscribirte", title: "Compromiso y onboarding", body: "Aceptas formalmente tus condiciones y se activa tu espacio personal." },
  { when: "Semana 1", title: "Comienza AI First Mindset", body: "Accedes al contenido e-learning y preparas tu primer trabajo con IA." },
];

export const WAVE3_DEADLINE = "2026-10-16T12:00:00-03:00";

export const HOME_FAQ: { q: string; a: string }[] = [
  { q: "¿Cuánto dura el programa?", a: "De 30 a 45 días, según tu ritmo: depende de la velocidad con que avances en cada etapa, sobre todo en la certificación." },
  { q: "¿Cuánto tiempo debo dedicar?", a: "Espacios coordinados dentro de jornada, normalmente 2 a 3 horas por semana según la etapa, más tu estudio autónomo en la plataforma y con tu AI Coach. Como todo proceso formativo de alto nivel, puede requerir tiempo propio." },
  { q: "¿Postular significa quedar seleccionado/a?", a: "No. La selección depende de la evidencia de tu Assessment y de la capacidad de la Wave." },
  { q: "¿Quién me acompaña?", a: "Tu Delivery primero, un AI Coach con feedback semanal desde Role Enablement y el profesor de la certificación." },
];

/** Una línea por etapa según quién mira (tarjetas de los homes de clientes y equipo). */
export const AUDIENCE_LINES: Record<"cliente" | "equipo", Record<string, string>> = {
  cliente: {
    assessment: "Nominas junto a Delivery. Cada profesional decide postular y responde personalmente.",
    mindset: "Habilitas tiempo: tu profesional rediseña una actividad real de su trabajo.",
    "role-enablement": "Recibes el inicio, el avance relevante y el resultado de su certificación.",
    "ai-lab-showcase": "Validas un problema real y decides en el Showcase si el caso continúa.",
    cierre: "Recibes resultado, evidencia y próximos pasos. Decides la continuidad.",
  },
  equipo: {
    assessment: "Alineas al cliente, coordinas invitaciones y acompañas la postulación.",
    mindset: "Aseguras tiempo, detectas bloqueos y comunicas el inicio y el cierre.",
    "role-enablement": "Revisas progreso, gestionas criticidades y activas recovery si hace falta.",
    "ai-lab-showcase": "Verificas el gate, coordinas sesiones y aseguras al stakeholder del cliente.",
    cierre: "Comunicas el cierre, aseguras acciones con responsable y coordinas seguimientos.",
  },
};
