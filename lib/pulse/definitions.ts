/**
 * Pulsos dentro de la plataforma (reemplazan Typeform). Preguntas cortas, mismas escalas que el informe W2,
 * para que los indicadores (NPS, ICAA, GPC, TAE, ICP, TRB, TAI, TRI, TPV, TIIC y eficiencia pre/post) salgan solos.
 */
export type QType = "scale5" | "nps" | "score10" | "choice" | "hours" | "text" | "yesno";
export interface Question {
  id: string;
  type: QType;
  label: string;
  hint?: string;
  options?: readonly string[];
  optional?: boolean;
  /** Respuestas rápidas que la persona puede elegir en vez de escribir (p. ej. "Nada por ahora"). */
  quick?: readonly string[];
  /** Largo mínimo de una respuesta de texto obligatoria. */
  minLength?: number;
}
export type Respondent = "KIBER" | "CLIENT";
export interface PulseDef {
  key: string;
  respondent: Respondent;
  title: string;
  /** Cuándo aparece, en palabras (se muestra en el informe). */
  when: string;
  intro: string;
  questions: Question[];
  /** Pulso obligatorio que cierra esta etapa (ver lib/journey/closure.ts). */
  closes?: "AI_MINDSET" | "ROLE_ENABLEMENT" | "AI_LAB_SHOWCASE" | "CLOSURE";
  /** Minutos estimados para responder. */
  minutes?: number;
}

export const AI_FREQ = ["Casi nunca", "Algunas veces al mes", "Varias veces por semana", "Todos los días"] as const;
export const BARRIERS = ["Ninguna", "Falta de tiempo", "No tengo claro el siguiente paso", "Contenido técnico o lenguaje", "Idioma", "Acceso a la plataforma", "Otra"] as const;
export const BARRIER_CHANGE = ["Se resolvió", "Disminuyó de manera importante", "Disminuyó un poco", "Sigue igual o empeoró"] as const;
export const CONTINUITY = ["Sí, como piloto", "Lo vamos a evaluar", "No por ahora"] as const;

const HOURS_BEFORE: Question = {
  id: "hours",
  type: "hours",
  label: "Piensa en las tareas repetitivas de tu rol que podrían apoyarse con IA. ¿Cuántas horas a la semana les dedicas hoy?",
  hint: "Una estimación basta. Volveremos a preguntarte lo mismo al cierre para medir el antes y el después.",
};
const AI_USE: Question = { id: "ai_freq", type: "choice", label: "¿Con qué frecuencia usas IA en tu trabajo?", options: AI_FREQ };
const COMMENT: Question = { id: "comment", type: "text", label: "¿Algo que quieras contarnos?", optional: true };

export const NOTHING_YET = "Nada por ahora";
/**
 * Las cinco preguntas obligatorias de todo pulso de cierre, contextualizadas a la etapa. Son la fuente de la
 * experiencia declarada (satisfacción, aprendizaje, valor, mejoras, aplicación): no miden adopción real.
 */
export const CORE_IDS = ["satisfaccion", "aprendizaje", "valioso", "mejorar", "aplicacion"] as const;
export function coreQuestions(stage: string): Question[] {
  return [
    { id: "satisfaccion", type: "scale5", label: `¿Qué tan satisfecho/a quedaste con ${stage}?`, hint: "1 = nada satisfecho/a · 5 = muy satisfecho/a" },
    { id: "aprendizaje", type: "text", label: `¿Qué aprendiste en ${stage}?`, minLength: 3 },
    { id: "valioso", type: "text", label: "¿Qué fue lo más valioso para ti?", minLength: 3 },
    { id: "mejorar", type: "text", label: "¿Qué podríamos mejorar?", hint: `Si no se te ocurre nada, elige «${NOTHING_YET}».`, quick: [NOTHING_YET], minLength: 3 },
    { id: "aplicacion", type: "text", label: "¿Cómo vas a aplicar lo aprendido en tu trabajo?", minLength: 3 },
  ];
}

/** Bloque de habilitación: se repite en el pulso intermedio (T0→T1) y en el de cierre. */
const ENABLEMENT: Question[] = [
  { id: "cap_comprender", type: "scale5", label: "Comprendo los contenidos del curso." },
  { id: "cap_aplicar", type: "scale5", label: "Puedo aplicar lo aprendido en ejercicios o en mi trabajo." },
  { id: "cap_corregir", type: "scale5", label: "Detecto y corrijo mis errores sin ayuda." },
  { id: "cap_refuerzo", type: "scale5", label: "Sé qué temas necesito reforzar." },
  { id: "cap_estrategia", type: "scale5", label: "Enfrento actividades y evaluaciones con una estrategia clara." },
  { id: "gpc_before", type: "scale5", label: "Antes del acompañamiento, ¿cómo evaluabas tu capacidad en IA para tu rol?", hint: "1 = muy baja · 5 = muy alta" },
  { id: "gpc_now", type: "scale5", label: "Y hoy, ¿cómo la evalúas?", hint: "1 = muy baja · 5 = muy alta" },
  { id: "progress", type: "yesno", label: "Desde el último pulso, ¿lograste un avance que puedas mostrar?" },
  { id: "evidence", type: "text", label: "Cuéntanos ese avance: qué módulo, actividad o caso, y qué lograste.", hint: "Específico: \"terminé el módulo 3 y automaticé el reporte X\" vale más que \"avancé harto\".", optional: true },
  { id: "icp", type: "score10", label: "¿Cuánto contribuyeron las clases y el acompañamiento a tu avance?", hint: "0 = nada · 10 = muchísimo" },
  { id: "barrier", type: "choice", label: "¿Cuál es tu principal dificultad para avanzar?", options: BARRIERS },
  { id: "barrier_sev", type: "scale5", label: "¿Qué tan fuerte es esa dificultad?", hint: "1 = leve · 5 = me bloquea", optional: true },
  { id: "barrier_change", type: "choice", label: "Con el acompañamiento, esa dificultad…", options: BARRIER_CHANGE, optional: true },
  { id: "auto_org", type: "scale5", label: "Organizo mi avance por mi cuenta (plan, horarios, metas)." },
  { id: "auto_strategy", type: "scale5", label: "Tengo una estrategia propia para preparar la certificación." },
];

export const MINDSET_ITEMS: { id: string; label: string }[] = [
  { id: "m_expectativas", label: "Cumplió mis expectativas" },
  { id: "m_ritmo", label: "El ritmo fue adecuado" },
  { id: "m_relevancia", label: "Es relevante para mi trabajo" },
  { id: "m_ejemplos", label: "Los ejemplos se conectan con mi contexto laboral" },
  { id: "m_oportunidades", label: "Ahora identifico oportunidades de IA en mi trabajo" },
  { id: "m_seguridad", label: "Me siento seguro/a para experimentar con IA" },
  { id: "m_riesgos", label: "Reconozco los riesgos y límites de la IA" },
  { id: "m_materiales", label: "Los materiales fueron útiles" },
  { id: "m_facilitador", label: "El contenido fue claro y bien explicado" },
  { id: "m_equilibrio", label: "Hubo buen equilibrio entre teoría, ejemplos y práctica" },
];

export const PULSES: PulseDef[] = [
  {
    key: "INICIO",
    respondent: "KIBER",
    title: "Pulso de inicio",
    when: "Al comenzar el journey",
    intro: "Dos minutos para tomar tu punto de partida. Al cierre te haremos las mismas preguntas y verás tu antes y después.",
    questions: [AI_USE, HOURS_BEFORE, { id: "tasks", type: "text", label: "¿Qué tareas son?", optional: true }],
  },
  {
    key: "MINDSET",
    respondent: "KIBER",
    title: "Pulso de cierre · AI First Mindset",
    when: "Al cumplir los requisitos de AI First Mindset (cierra la etapa)",
    intro: "Cuéntanos cómo te fue con el contenido e-learning y el desafío evaluado. Al enviarlo se cierra la etapa y se desbloquea Role Enablement.",
    closes: "AI_MINDSET",
    minutes: 5,
    questions: [
      ...coreQuestions("AI First Mindset"),
      ...MINDSET_ITEMS.map((m) => ({ id: m.id, type: "scale5" as const, label: m.label })),
      { id: "nps", type: "nps", label: "¿Qué tan probable es que recomiendes AI First Mindset a un colega?", hint: "0 = nada probable · 10 = muy probable" },
      COMMENT,
    ],
  },
  {
    key: "HAB_INTERMEDIO",
    respondent: "KIBER",
    title: "Pulso intermedio de habilitación",
    when: "Dos semanas después de iniciar Role Enablement",
    intro: "Una foto de cómo vas en tu certificación. No es una evaluación: nos ayuda a darte el apoyo justo.",
    questions: ENABLEMENT,
  },
  {
    key: "HAB_CIERRE",
    respondent: "KIBER",
    title: "Pulso de cierre · Role Enablement",
    when: "Con la certificación AI CERT verificada (cierra la etapa)",
    intro: "Cerraste tu certificación. Primero tu experiencia; después, las mismas preguntas del pulso intermedio para ver cuánto avanzaste. Al enviarlo se desbloquea AI Lab & Showcase.",
    closes: "ROLE_ENABLEMENT",
    minutes: 6,
    questions: [...coreQuestions("Role Enablement y tu certificación AI CERT"), ...ENABLEMENT],
  },
  {
    key: "LAB",
    respondent: "KIBER",
    title: "Pulso de cierre · AI Lab & Showcase",
    when: "Después de presentar en el Showcase (cierra la etapa)",
    intro: "¿Cómo te fue construyendo y presentando tu caso? Al enviarlo se desbloquea el Cierre.",
    closes: "AI_LAB_SHOWCASE",
    minutes: 4,
    questions: [
      ...coreQuestions("el AI Lab y el Showcase"),
      { id: "l_problema", type: "scale5", label: "El problema que trabajé era real y relevante para el cliente." },
      { id: "l_sesiones", type: "scale5", label: "Las sesiones con el Hub AI me ayudaron a avanzar." },
      { id: "l_confianza", type: "scale5", label: "Confío en que mi solución aporta valor." },
      { id: "l_showcase", type: "scale5", label: "Me sentí preparado/a para presentar en el Showcase." },
      { id: "nps", type: "nps", label: "¿Qué tan probable es que recomiendes el AI Lab a un colega?" },
      COMMENT,
    ],
  },
  {
    key: "FINAL",
    respondent: "KIBER",
    title: "Pulso de cierre · AI Edge Talent",
    when: "En la etapa de Cierre (cierra tu journey)",
    intro: "Último pulso. Tu experiencia con todo el programa y las mismas preguntas del inicio para medir tu antes y después.",
    closes: "CLOSURE",
    minutes: 4,
    questions: [
      ...coreQuestions("AI Edge Talent"),
      AI_USE,
      { ...HOURS_BEFORE, label: "Las mismas tareas del inicio: ¿cuántas horas a la semana les dedicas hoy, con IA?", hint: "Una estimación basta." },
      { id: "nps", type: "nps", label: "¿Qué tan probable es que recomiendes AI Edge Talent a un colega?" },
      COMMENT,
    ],
  },
  {
    key: "CLIENTE_INICIO",
    respondent: "CLIENT",
    title: "Pulso de inicio del cliente",
    when: "Cuando tus profesionales comienzan",
    intro: "Para medir el impacto necesitamos tu punto de partida. Al cierre te haremos la misma pregunta.",
    questions: [
      { id: "hours", type: "hours", label: "¿Cuántas horas a la semana dedica hoy tu equipo a las tareas que esperas mejorar con IA?", hint: "Una estimación del equipo que participa basta." },
      { id: "expectation", type: "text", label: "¿Qué resultado esperas del programa?", optional: true },
    ],
  },
  {
    key: "CLIENTE_FINAL",
    respondent: "CLIENT",
    title: "Pulso final del cliente",
    when: "Cuando tus profesionales llegan al cierre",
    intro: "Tu mirada al cierre, con la misma pregunta de horas del inicio.",
    questions: [
      { id: "hours", type: "hours", label: "Las mismas tareas del inicio: ¿cuántas horas a la semana les dedica hoy tu equipo?" },
      { id: "c_valor", type: "scale5", label: "El programa generó valor para nuestra operación.", hint: "1 = muy en desacuerdo · 5 = muy de acuerdo" },
      { id: "c_satisf", type: "scale5", label: "Estoy satisfecho/a con el acompañamiento de Kibernum." },
      { id: "nps", type: "nps", label: "¿Qué tan probable es que recomiendes AI Edge Talent a otra organización?" },
      { id: "continuity", type: "choice", label: "¿El caso del AI Lab continúa?", options: CONTINUITY },
      COMMENT,
    ],
  },
];

export const pulseDef = (key: string) => PULSES.find((p) => p.key === key) ?? null;
