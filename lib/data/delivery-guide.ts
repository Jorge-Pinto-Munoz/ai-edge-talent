import type { IconName } from "@/components/site/Icon";

/**
 * Guía de acompañamiento de Delivery, etapa por etapa, escrita para quien supervisa (no para el participante).
 * Se arma con las reglas canónicas de lib/data/playbook.ts y lib/data/journey.ts: no agrega plazos, criterios ni
 * responsabilidades nuevas. Donde el programa aún no define un plazo, se dice "según el calendario de la Wave".
 */
export interface DeliveryStage {
  id: string;
  /** Capa del journey en la plataforma (para contar profesionales en esta etapa). */
  layer: "ADMISSION" | "AI_MINDSET" | "ROLE_ENABLEMENT" | "AI_LAB_SHOWCASE" | "SHOWCASE" | "CLOSURE";
  n: number;
  name: string;
  icon: IconName;
  /** Una línea: para qué sirve esta etapa. */
  purpose: string;
  /** Qué vivirá o hará el profesional (breve). */
  professional: string[];
  /** Tu gestión como Delivery: acciones concretas. */
  actions: string[];
  /** Qué comunicar y a quién. */
  communicate: { to: "Profesional" | "Cliente" | "Equipo AET"; what: string }[];
  /** Hitos que debes ver cumplidos. */
  milestones: string[];
  /** Riesgos a anticipar y cómo mitigarlos. */
  risks: { risk: string; mitigation: string }[];
  /** Cuándo escalar (y a quién, cuando el programa lo define). */
  escalate: string[];
  /** Lo que no debes hacer (reglas del producto). */
  never: string[];
  /** Dónde lo ves en la plataforma ({wave} = Wave elegida). */
  where?: { label: string; href: string }[];
}

export const DELIVERY_STAGES: DeliveryStage[] = [
  {
    id: "assessment",
    layer: "ADMISSION",
    n: 1,
    name: "Selección y Assessment",
    icon: "spark",
    purpose: "Que las personas nominadas postulen a tiempo y entiendan el proceso, sin prometer ingreso.",
    professional: [
      "Recibe la invitación oficial con su enlace personal.",
      "Lee las exigencias del programa y decide si postula.",
      "Responde el Assessment personalmente, con ejemplos reales, antes del cierre.",
      "Conoce su resultado: avanza, video de rescate o próxima Wave.",
    ],
    actions: [
      "Avisar con anticipación a cada profesional que será invitado/a y explicar el propósito del Assessment.",
      "Confirmar que recibió el enlace y que puede ingresar.",
      "Coordinar con el cliente la disponibilidad para postular.",
      "Hacer seguimiento a quienes no han completado su postulación antes del cierre.",
      "Resolver bloqueos de acceso o técnicos.",
      "Cuando un resultado pida video de rescate, explicarlo como una segunda oportunidad, no como un castigo.",
      "Comunicar el resultado y el siguiente paso según la decisión oficial.",
    ],
    communicate: [
      { to: "Profesional", what: "Que es una invitación a postular, no una selección; plazo de cierre; resultado y próximo paso." },
      { to: "Cliente", what: "Estado de cada nominación (pendiente o completada) y si avanza, no avanza o complementa con video." },
    ],
    milestones: ["Invitaciones enviadas", "Postulaciones completadas antes del cierre", "Resultados comunicados al profesional y al cliente"],
    risks: [
      { risk: "Postulaciones pendientes cerca del cierre", mitigation: "Recordatorio personal y ayuda con el acceso unos días antes." },
      { risk: "Expectativa de ingreso garantizado", mitigation: "Reforzar que la selección es por evidencia y depende de la capacidad de la Wave." },
    ],
    escalate: ["Error técnico que impide postular cerca del cierre", "Solicitud de extensión de plazo", "Nominaciones que superan la capacidad de la Wave"],
    never: ["Completar el Assessment por la persona", "Compartir puntajes, ranking o evaluación detallada con el cliente", "Prometer ingreso o garantizar selección tras el rescate"],
    where: [{ label: "Admisión de la Wave", href: "/admin/admision/{wave}" }],
  },
  {
    id: "mindset",
    layer: "AI_MINDSET",
    n: 2,
    name: "AI First Mindset",
    icon: "brain",
    purpose: "Que cada profesional tenga el tiempo y el contexto para rediseñar con IA una actividad real.",
    professional: [
      "Acepta formalmente su compromiso y se activa su espacio personal.",
      "Accede al contenido e-learning.",
      "Resuelve un desafío evaluado sobre un caso real de su trabajo.",
      "Recibe feedback con criterios conocidos de antemano.",
    ],
    actions: [
      "Si ya cumplió los requisitos y su pulso de cierre sigue pendiente, recuérdaselo: sin el pulso no avanza (te avisamos por correo si se atrasa).",
      "Dar la bienvenida y confirmar el calendario inicial.",
      "Asegurar con el cliente el tiempo coordinado para la etapa.",
      "Ayudar a elegir una actividad real y adecuada para el desafío.",
      "Detectar bloqueos (tiempo, acceso, contexto) y destrabarlos.",
      "Comunicar el inicio y el cierre de la etapa al cliente.",
    ],
    communicate: [
      { to: "Profesional", what: "Calendario, dónde está el contenido y a quién pedir ayuda; resultado y siguiente paso." },
      { to: "Cliente", what: "Inicio y cierre de la etapa y la disponibilidad que se necesita." },
    ],
    milestones: ["Pulso de cierre respondido: cierra la etapa y desbloquea la siguiente", "Compromiso aceptado", "Contenido revisado", "Desafío entregado y evaluado"],
    risks: [
      { risk: "No asiste o no avanza con el contenido", mitigation: "Conversación temprana y acuerdo de un bloque de tiempo protegido." },
      { risk: "Elige una actividad sin relación con su trabajo", mitigation: "Revisar la elección con el profesional antes de entregar." },
    ],
    escalate: ["No asistencia a Mindset", "Desafío no aprobado según las reglas de continuidad (solo Product Lead puede hacer excepciones)"],
    never: ["Responder el pulso por el profesional o sugerirle qué contestar: es su experiencia personal", "Saltar Mindset para ir directo a la certificación", "Prometer intentos adicionales"],
    where: [{ label: "Journey · AI First Mindset", href: "/admin/journey/{wave}/mindset" }],
  },
  {
    id: "certs",
    layer: "ROLE_ENABLEMENT",
    n: 3,
    name: "Role Enablement · AI CERTs",
    icon: "badge",
    purpose: "Que el avance en la certificación sea constante y los riesgos se detecten a tiempo.",
    professional: [
      "Estudia el curso introductorio y el especialista de su rol, por tramos.",
      "Asiste a las clases del profesor y trabaja con su AI Coach.",
      "Rinde el examen AI CERT y registra su certificado.",
    ],
    actions: [
      "Si ya cumplió los requisitos y su pulso de cierre sigue pendiente, recuérdaselo: sin el pulso no avanza (te avisamos por correo si se atrasa).",
      "Revisar cada semana el avance por tramo y la asistencia a clases.",
      "Actuar sobre las alertas: conversar, acordar un microplan y validar la disponibilidad.",
      "Activar un plan de recuperación cuando el avance se atrasa.",
      "Informar al cliente el inicio, el avance relevante, los riesgos y el resultado.",
      "Preparar la transición al AI Lab cuando la certificación quede verificada.",
    ],
    communicate: [
      { to: "Profesional", what: "Seguimiento de su avance y acuerdos de la semana." },
      { to: "Cliente", what: "Inicio, progreso relevante, riesgos y resultado de la certificación." },
    ],
    milestones: ["Pulso de cierre respondido: cierra la etapa y desbloquea la siguiente", "Ruta AI CERT asignada", "Avance constante por tramos", "Examen rendido", "Certificación verificada"],
    risks: [
      { risk: "Sin avance en la plataforma", mitigation: "Contacto la misma semana y microplan con metas por tramo." },
      { risk: "Inasistencia a clases", mitigation: "Acordar cómo recupera lo visto y revisar su disponibilidad con el cliente." },
      { risk: "Falta de tiempo con capacidad alta", mitigation: "Acordar fecha de examen y bloquear tiempo protegido." },
    ],
    escalate: ["Una semana completa sin acompañamiento", "Sin avance en la plataforma por más de 2 semanas", "Examen no aprobado según las reglas de continuidad"],
    never: ["Responder el pulso por el profesional o sugerirle qué contestar: es su experiencia personal", "Presentar un intento adicional como financiado o cobrado al profesional", "Transformar un atraso en una sanción no definida por el programa"],
    where: [
      { label: "Avance AI CERT", href: "/admin/journey/{wave}/role-enablement?tab=aicert" },
      { label: "Clases y asistencia", href: "/admin/journey/{wave}?vista=clases#seguimiento" },
      { label: "Experiencia de tus profesionales", href: "/equipo?wave={wave}" },
    ],
  },
  {
    id: "lab",
    layer: "AI_LAB_SHOWCASE",
    n: 4,
    name: "AI Lab",
    icon: "flask",
    purpose: "Que el profesional construya algo real y de impacto para el negocio del cliente.",
    professional: [
      "Llega con un desafío real que puede levantar con su cliente.",
      "Asiste a las dos clases con el Hub AI y construye entre ellas.",
      "Prepara evidencia: antes, después y el impacto en tiempo.",
    ],
    actions: [
      "Verificar que la certificación esté aprobada antes de entrar al Lab.",
      "Conectar al profesional con el contexto del cliente para validar el problema.",
      "Coordinar la asistencia a las dos sesiones.",
      "Monitorear la construcción y destrabar acceso a información o herramientas.",
      "Cuidar la confidencialidad del cliente en todo el proceso.",
    ],
    communicate: [
      { to: "Cliente", what: "La necesidad de validar el problema y entregar el contexto necesario." },
      { to: "Equipo AET", what: "Riesgos de acceso, confidencialidad o alcance del caso." },
    ],
    milestones: ["Certificación aprobada", "Problema validado", "Asistencia a las 2 sesiones", "Prototipo con evidencia"],
    risks: [
      { risk: "El cliente no habilita contexto", mitigation: "Acordar una contraparte y un caso alternativo con el Hub AI." },
      { risk: "Caso demasiado grande", mitigation: "Acotar a un resultado demostrable con el Hub AI." },
    ],
    escalate: ["El cliente no habilita contexto o validación del problema", "Riesgo de confidencialidad o uso indebido de información"],
    never: ["Admitir al Lab sin certificación aprobada", "Imponer un máximo de intentos no vigente"],
    where: [{ label: "AI Lab & Showcase", href: "/admin/journey/{wave}/ai-lab" }],
  },
  {
    id: "showcase",
    layer: "SHOWCASE",
    n: 5,
    name: "Showcase",
    icon: "presentation",
    purpose: "Que el impacto se presente a la persona correcta del cliente y quede un siguiente paso claro.",
    professional: [
      "Presenta en 15 a 20 minutos el problema, su enfoque con IA, la demo y el impacto.",
      "Muestra el contraste: qué hubiese pasado sin la mejora.",
    ],
    actions: [
      "Si ya cumplió los requisitos y su pulso de cierre sigue pendiente, recuérdaselo: sin el pulso no avanza (te avisamos por correo si se atrasa).",
      "Confirmar que la solución está lista para mostrarse (READY FOR SHOWCASE).",
      "Asegurar que asista la contraparte del cliente capaz de reconocer el problema.",
      "Coordinar la agenda.",
      "Registrar el resultado y el siguiente paso con un responsable.",
    ],
    communicate: [{ to: "Cliente", what: "Agenda y contenido esperado del Showcase." }],
    milestones: ["Pulso de cierre respondido: cierra la etapa y desbloquea la siguiente", "READY FOR SHOWCASE", "Showcase realizado", "Siguiente paso registrado con responsable"],
    risks: [{ risk: "Contraparte sin contexto del problema", mitigation: "Confirmar asistentes con el cliente antes de agendar." }],
    escalate: ["El cliente no dispone de una contraparte que reconozca el problema"],
    never: ["Responder el pulso por el profesional o sugerirle qué contestar: es su experiencia personal", "Agendar Showcase sin READY FOR SHOWCASE", "Cerrar sin siguiente paso registrado"],
    where: [{ label: "AI Lab & Showcase", href: "/admin/journey/{wave}/ai-lab" }],
  },
  {
    id: "closure",
    layer: "CLOSURE",
    n: 6,
    name: "Cierre y seguimiento de adopción",
    icon: "flag",
    purpose: "Que el cierre deje acciones con responsable y se mida la adopción después.",
    professional: ["Cierra su proceso con evidencia y responde el pulso final.", "Participa del seguimiento al mes 1 y al mes 3."],
    actions: [
      "Si ya cumplió los requisitos y su pulso de cierre sigue pendiente, recuérdaselo: sin el pulso no avanza (te avisamos por correo si se atrasa).",
      "Comunicar el cierre a profesional y cliente.",
      "Asegurar que cada acción tenga responsable.",
      "Coordinar los seguimientos de adopción al mes 1 y al mes 3.",
    ],
    communicate: [{ to: "Cliente", what: "Resultado, evidencia, próximos pasos y casos con continuidad." }],
    milestones: ["Pulso de cierre respondido: cierra el journey", "Cierre comunicado", "Acciones con responsable", "Seguimiento mes 1", "Seguimiento mes 3"],
    risks: [{ risk: "Dar por terminado el programa con la certificación", mitigation: "Recordar que el valor se mide con el caso real y su adopción." }],
    escalate: ["Según el criterio que defina el programa para continuidad"],
    never: ["Responder el pulso por el profesional o sugerirle qué contestar: es su experiencia personal", "Dar por cerrado el programa solo con la certificación"],
    where: [{ label: "Banca de talento", href: "/admin/talento" }],
  },
];

/** Preguntas frecuentes de Delivery (respuestas del producto). */
export const DELIVERY_FAQ: { q: string; a: string }[] = [
  { q: "¿Puedo completar algo por el profesional?", a: "No. Las postulaciones, entregas y evaluaciones son personales. Tu rol es coordinar, destrabar y hacer seguimiento." },
  { q: "¿Qué información puede recibir el cliente?", a: "Estado, avance relevante, riesgos y resultados. Nunca puntajes, rankings ni la evaluación detallada de una persona." },
  { q: "¿Un atraso significa salir del programa?", a: "No. Un atraso activa alerta, plan de recuperación y revisión. No hay expulsión automática por atraso." },
  { q: "¿Quién puede hacer excepciones?", a: "Solo el Product Lead, de forma explícita." },
  { q: "¿Qué es el pulso de cierre de cada etapa?", a: "Cinco preguntas sobre la experiencia del profesional que se habilitan al cumplir los requisitos académicos de la etapa. Es obligatorio: sin él la etapa no se cierra ni se desbloquea la siguiente. Lo responde solo el profesional; tú haces seguimiento y el Líder de Servicio lo supervisa." },
  { q: "¿Puedo ver lo que respondieron?", a: "Ves el avance y si el pulso está pendiente para quienes tienes asignados. Sus respuestas, solo si el Líder de Servicio comparte la experiencia de la Wave. Nunca condicionan sus evaluaciones." },
  { q: "¿Cuánto tiempo del profesional coordino con el cliente?", a: "Normalmente 2 a 3 horas por semana según la etapa. No es una cantidad fija garantizada todas las semanas." },
];

/** Traspasos entre responsables en cada etapa (cómo funciona la plataforma hoy). */
export const HANDOFFS: Record<string, string[]> = {
  assessment: ["Postulación enviada → la evalúa el equipo AET: la IA propone y una persona decide.", "Decisión oficial → Delivery comunica el resultado y el siguiente paso."],
  mindset: ["Compromiso aceptado → se activa Mi espacio del profesional.", "Desafío entregado → revisión con criterios conocidos; aprobado → ruta AI CERT."],
  certs: ["Profesor y AI Coach acompañan el estudio; el líder del programa actualiza el avance por tramos.", "Certificación verificada → pasa al AI Lab con el Hub AI."],
  lab: ["El Hub AI guía las dos clases y marca el proyecto como listo (READY FOR SHOWCASE)."],
  showcase: ["Showcase con el cliente → siguiente paso registrado con responsable."],
  closure: ["Cierre → seguimiento de adopción al mes 1 y al mes 3; el profesional queda en la banca de talento."],
};
