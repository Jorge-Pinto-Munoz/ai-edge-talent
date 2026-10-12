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
    title: "Pulso AI First Mindset",
    when: "Al terminar AI First Mindset",
    intro: "Cuéntanos cómo te fue con el contenido e-learning y el trabajo. Responde de 1 (muy en desacuerdo) a 5 (muy de acuerdo).",
    questions: [
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
    title: "Pulso de cierre de habilitación",
    when: "Al terminar Role Enablement",
    intro: "Cerraste la certificación. Las mismas preguntas del pulso intermedio, para ver cuánto avanzaste.",
    questions: ENABLEMENT,
  },
  {
    key: "LAB",
    respondent: "KIBER",
    title: "Pulso AI Lab & Showcase",
    when: "Después del Showcase",
    intro: "¿Cómo te fue construyendo y presentando tu caso? Responde de 1 a 5.",
    questions: [
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
    title: "Pulso final",
    when: "Al cierre del journey",
    intro: "Último pulso. Repetimos las preguntas del inicio para medir tu antes y después.",
    questions: [
      AI_USE,
      { ...HOURS_BEFORE, label: "Las mismas tareas del inicio: ¿cuántas horas a la semana les dedicas hoy, con IA?", hint: "Una estimación basta." },
      { id: "overall", type: "scale5", label: "En general, ¿cómo evalúas AI Edge Talent?", hint: "1 = muy mal · 5 = excelente" },
      { id: "nps", type: "nps", label: "¿Qué tan probable es que recomiendes AI Edge Talent a un colega?" },
      COMMENT,
    ],
  },
  {
    key: "CLIENTE_INICIO",
    respondent: "CLIENT",
    title: "Pulso de inicio del cliente",
    when: "Cuando sus profesionales comienzan",
    intro: "Para medir el impacto necesitamos su punto de partida. Al cierre le haremos la misma pregunta.",
    questions: [
      { id: "hours", type: "hours", label: "¿Cuántas horas a la semana dedica hoy su equipo a las tareas que espera mejorar con IA?", hint: "Una estimación del equipo que participa basta." },
      { id: "expectation", type: "text", label: "¿Qué resultado espera del programa?", optional: true },
    ],
  },
  {
    key: "CLIENTE_FINAL",
    respondent: "CLIENT",
    title: "Pulso final del cliente",
    when: "Cuando sus profesionales llegan al cierre",
    intro: "Su mirada al cierre, con la misma pregunta de horas del inicio.",
    questions: [
      { id: "hours", type: "hours", label: "Las mismas tareas del inicio: ¿cuántas horas a la semana les dedica hoy su equipo?" },
      { id: "c_valor", type: "scale5", label: "El programa generó valor para nuestra operación.", hint: "1 = muy en desacuerdo · 5 = muy de acuerdo" },
      { id: "c_satisf", type: "scale5", label: "Estoy satisfecho/a con el acompañamiento de Kibernum." },
      { id: "nps", type: "nps", label: "¿Qué tan probable es que recomiende AI Edge Talent a otra organización?" },
      { id: "continuity", type: "choice", label: "¿El caso del AI Lab continúa?", options: CONTINUITY },
      COMMENT,
    ],
  },
];

export const pulseDef = (key: string) => PULSES.find((p) => p.key === key) ?? null;
