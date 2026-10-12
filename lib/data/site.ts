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
    photoPos: "70% center",
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
    facts: [
      { label: "Formato", value: "Micro-cápsulas grabadas + tarea" },
      { label: "Aprobación", value: "≥ 75/100 y hard gates" },
      { label: "Intentos", value: "Dos" },
    ],
    intro:
      "Una serie de cápsulas cortas, a tu ritmo, que terminan en una tarea concreta: tomar una actividad real de tu rol y rediseñarla con IA. Descargas el material, practicas y subes tu entrega.",
    happens: [
      { title: "Ves las cápsulas", body: "Videos breves con material descargable, como en un curso online, ordenados para avanzar sin perderte." },
      { title: "Eliges una actividad real", body: "Algo que haces todas las semanas y que puede mejorar con IA." },
      { title: "Subes tu rediseño", body: "Con evidencia propia: antes, después y por qué funciona." },
      { title: "Recibes feedback", body: "Se revisa con criterios conocidos de antemano. Una revisión humana no consume intento." },
    ],
    youDo: ["Ver las cápsulas y descargar el material", "Entregar un rediseño con evidencia propia", "Conocer los criterios antes de entregar"],
    youGet: ["Un método para integrar IA a tu trabajo", "Feedback concreto sobre tu entrega", "Acceso a la certificación de tu rol"],
    advance: "Con tu tarea aprobada pasas a Role Enablement.",
    ifNot: "Tienes dos intentos. Si el segundo no se aprueba, no avanzas a certificación, salvo excepción explícita.",
  },
  {
    slug: "role-enablement",
    n: 3,
    name: "Role Enablement",
    tagline: "Te certificas en IA aplicada a tu rol, con profesor y mentor.",
    icon: "badge",
    image: "trabajo-laptop",
    facts: [
      { label: "Dedicación", value: "~40 horas" },
      { label: "Duración", value: "3 a 4 semanas" },
      { label: "Intentos financiados", value: "Hasta dos" },
    ],
    intro:
      "Es la etapa de certificación técnica (AI CERTs) alineada a tu rol. Combinas autoestudio con un profesor y un canal de cohorte, y un mentor te acompaña con feedback semanal.",
    happens: [
      { title: "Estudias a tu ritmo", body: "Contenido de certificación alineado a tu rol, con avance semanal visible." },
      { title: "Te acompañan", body: "Profesor y canal de cohorte para dudas; mentor asignado que deja feedback cada semana." },
      { title: "Rindes tu examen", body: "Kibernum financia hasta dos intentos." },
      { title: "Registras tu certificación", body: "Subes el certificado a la plataforma y se verifica." },
    ],
    youDo: ["Mantener un avance semanal", "Participar del acompañamiento", "Rendir el examen con seriedad"],
    youGet: ["Una certificación reconocida en IA para tu rol", "Feedback semanal de tu mentor", "El pase a AI Lab"],
    advance: "Con la certificación aprobada y verificada entras a AI Lab.",
    ifNot: "Si el segundo intento no se aprueba, el journey se cierra, salvo excepción explícita.",
  },
  {
    slug: "ai-lab-showcase",
    n: 4,
    name: "AI Lab & Showcase",
    tagline: "Construyes una solución para una necesidad real y la presentas al cliente.",
    icon: "flask",
    image: "colaboracion",
    facts: [
      { label: "Sesiones", value: "Dos de 90 minutos" },
      { label: "Entregable", value: "Prototipo demostrable" },
      { label: "Cierre", value: "Presentación al cliente" },
    ],
    intro:
      "Aplicas lo aprendido a un problema validado con tu cliente. Entre dos sesiones guiadas construyes un prototipo con evidencia de valor y, cuando está listo, lo presentas en el Showcase.",
    happens: [
      { title: "Validas el problema", body: "Junto al cliente defines una necesidad real, su usuario y la fricción que quieres resolver." },
      { title: "Construyes", body: "Trabajo autónomo entre dos sesiones obligatorias de 90 minutos." },
      { title: "Llegas a READY FOR SHOWCASE", body: "Con un prototipo demostrable y evidencia suficiente." },
      { title: "Presentas", body: "Problema, usuario, solución, demo, evidencia, valor, aprendizajes y siguiente experimento." },
    ],
    youDo: ["Asistir a las dos sesiones", "Construir entre sesiones", "Cuidar la confidencialidad del cliente"],
    youGet: ["Un caso real en tu portafolio", "Una conversación de continuidad con el cliente", "Visibilidad como talento AET"],
    advance: "El cliente valora la evidencia y decide si el caso continúa como piloto.",
    ifNot: "No hay un máximo de intentos: ajustas y rediseñas hasta estar listo/a o hasta una decisión explícita.",
  },
  {
    slug: "cierre",
    n: 5,
    name: "Cierre y continuidad",
    tagline: "Cierras con evidencia y, si corresponde, tu caso sigue como piloto.",
    icon: "flag",
    image: "equipo",
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

/** Índice inicial del home: todo lo que hay en la plataforma, de un vistazo. */
export const SITE_INDEX: { href: string; title: string; body: string; icon: IconName; tone?: "dark" | "accent"; span?: 2; mobileFull?: boolean; image?: BrandImage }[] = [
  { href: "/programa", title: "El programa", body: "Qué es AI Edge Talent, para quién es y cómo se evalúa.", icon: "compass", tone: "dark", span: 2, mobileFull: true, image: "colaboracion" },
  { href: "/wave-3/postular", title: "Postular a Wave 3", body: "Cierra el viernes 16 de octubre a las 12:00.", icon: "spark", tone: "accent", mobileFull: true },
  { href: "#etapas", title: "Las etapas", body: "Cinco pasos, de la postulación al cierre.", icon: "route" },
  { href: "/programa#para-quien", title: "Qué se espera de ti", body: "Tu compromiso y lo que obtienes.", icon: "user" },
  { href: "/programa#evaluacion", title: "Cómo se evalúa", body: "Una rúbrica conocida, con cinco dimensiones.", icon: "target" },
  { href: "/ayuda", title: "Preguntas", body: "Lo que más nos preguntan los profesionales.", icon: "help" },
  { href: "/inicio", title: "Mi espacio", body: "Tu etapa, tus tareas, tu certificación y lo que viene.", icon: "grid", span: 2, mobileFull: true },
];

export const BENEFITS: { title: string; body: string; icon: IconName; size?: "wide" | "full" }[] = [
  { title: "IA aplicada a tu rol real", body: "No es un curso genérico: todo termina en tu trabajo, con tu cliente.", icon: "target", size: "wide" },
  { title: "Certificación AI CERTs", body: "Financiada por Kibernum, hasta dos intentos.", icon: "badge" },
  { title: "Mentor con feedback semanal", body: "Alguien que sigue tu avance y te ayuda a destrabarte.", icon: "chat" },
  { title: "Showcase con el cliente", body: "Presentas un caso real con evidencia de valor.", icon: "presentation", size: "wide" },
  { title: "Banca de talento", body: "Al cerrar, quedas visible como talento habilitado en IA para nuevas oportunidades.", icon: "star", size: "full" },
];

export const WAVE3_TIMELINE: { when: string; title: string; body: string; done?: boolean }[] = [
  { when: "Ahora", title: "Postulación abierta", body: "Responde el Assessment con tus experiencias reales." },
  { when: "Vie 16 oct · 12:00", title: "Cierre de postulación", body: "Después de esa hora no se reciben postulaciones." },
  { when: "Después del cierre", title: "Resultados", body: "Recibes tu resultado por correo y en tu espacio." },
  { when: "Al inscribirte", title: "Compromiso y onboarding", body: "Aceptas tus condiciones y comienza AI First Mindset." },
];

export const WAVE3_DEADLINE = "2026-10-16T12:00:00-03:00";

export const HOME_FAQ: { q: string; a: string }[] = [
  { q: "¿Cuánto dura el programa?", a: "Entre 30 y 45 días como referencia, según tu avance en cada etapa." },
  { q: "¿Cuánto tiempo debo dedicar?", a: "Espacios coordinados dentro de jornada, normalmente 2 a 3 horas por semana según la etapa, más tu tiempo de estudio. La certificación contempla unas 40 horas en 3 a 4 semanas." },
  { q: "¿Postular significa quedar seleccionado/a?", a: "No. La selección depende de la evidencia de tu Assessment y de la capacidad de la Wave." },
  { q: "¿Quién me acompaña?", a: "Tu Delivery primero, un mentor con feedback semanal desde Role Enablement y el profesor de la certificación." },
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
