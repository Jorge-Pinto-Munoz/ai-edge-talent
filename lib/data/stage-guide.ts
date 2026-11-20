import type { Layer } from "@/lib/journey/rules";

/**
 * «De qué se trata» cada etapa, en el lenguaje del profesional (se muestra en la guía de la etapa en Mi journey).
 * Si Administración cargó una guía propia para la Wave, esa tiene prioridad.
 */
export const STAGE_GUIDE: Partial<Record<Layer, { summary: string; happens: string[]; expect: string[] }>> = {
  ASSESSMENT: {
    summary: "Nos contaste cómo usas IA hoy en tu trabajo y con eso quedaste seleccionado/a para la Wave.",
    happens: ["Respondiste el Assessment con experiencias reales de tu trabajo.", "Una persona del equipo revisó tu postulación y decidió.", "Aceptaste el compromiso de participación."],
    expect: ["Nada más en esta etapa: ya la cerraste."],
  },
  AI_MINDSET: {
    summary: "Cambias la forma de abordar tu trabajo: rediseñas con IA una actividad real que haces hoy.",
    happens: [
      "Módulos cortos con video y material para entender qué es trabajar AI First.",
      "Un reto evaluado: tomas una actividad real de tu trabajo y la rediseñas con IA usando la plantilla.",
      "El equipo revisa tu entrega (con apoyo de IA) y te devuelve puntaje y feedback. Apruebas con 75/100 o más y tienes hasta 3 intentos.",
      "Al aprobar, respondes el pulso de cierre (2 minutos) y pasas a Role Enablement.",
    ],
    expect: ["Ver los módulos y entregar tu reto dentro del plazo.", "Aplicar el feedback si te piden ajustes.", "Responder el pulso de cierre."],
  },
  ROLE_ENABLEMENT: {
    summary: "Te certificas en IA para tu rol con AI CERTs, acompañado/a por tu AI Coach.",
    happens: [
      "4 sesiones, una por semana, de 1 hora y media con tu AI Coach.",
      "Durante la semana tu AI Coach responde consultas en el grupo de la Wave.",
      "Estudias a tu ritmo en tu plataforma de estudiante AI CERT.",
      "Rindes el examen de certificación: Kibernum financia hasta dos intentos.",
    ],
    expect: [
      "Asistir a las sesiones y marcar tu check-in («Fui a la sesión») después de cada una.",
      "Reportar cada semana tu avance AI CERT en Mi journey (curso, tramo y porcentaje).",
      "Registrar tu resultado y subir tu certificado cuando rindas el examen.",
      "Responder el pulso de cierre para pasar al AI Lab.",
    ],
  },
  AI_LAB_SHOWCASE: {
    summary: "Construyes, con el Hub AI, una solución con IA para un problema real de tu cliente.",
    happens: [
      "Clase 1: llegas con el desafío validado con tu cliente.",
      "Entre clases describes tu proyecto en Mi journey (desafío y solución) y subes tus avances.",
      "Clase 2: muestras lo construido. El Hub AI confirma cuándo está listo para el Showcase.",
      "Desde ya tienes la plantilla oficial del Showcase para ir armando tu caso.",
    ],
    expect: ["Asistir a las dos clases del Lab.", "Describir tu proyecto y subir tus avances.", "Cuidar la confidencialidad de la información del cliente."],
  },
  SHOWCASE: {
    summary: "Presentas tu caso al cliente con evidencia del valor que genera.",
    happens: [
      "Preparas tu presentación con la plantilla oficial: problema, solución, demo, impacto medido y próximos pasos.",
      "La presentas al cliente en 15 a 20 minutos, con demo en vivo y máximo 8 slides.",
      "Del Showcase sale una decisión sobre cómo sigue tu caso (continúa, piloto, ajustar o no continúa).",
    ],
    expect: ["Subir tu presentación final en Mi journey antes de presentar.", "Presentar con demo en vivo.", "Responder el pulso de cierre."],
  },
  CLOSURE: {
    summary: "Cierras el programa con resultado, evidencia y próximos pasos.",
    happens: ["Cierre formal con tu resultado y la evidencia de lo que lograste.", "Seguimiento al mes 1 y al mes 3 para medir la adopción real de IA.", "Quedas visible como talento habilitado en IA para nuevas oportunidades."],
    expect: ["Responder el pulso final.", "Acordar con tu Delivery cómo seguirás aplicando lo aprendido."],
  },
};

/** Etapa del journey → página pública del programa (de ahí sale su video). */
export const PUBLIC_SLUG: Partial<Record<Layer, string>> = { ASSESSMENT: "assessment", AI_MINDSET: "mindset", ROLE_ENABLEMENT: "role-enablement", AI_LAB_SHOWCASE: "ai-lab", SHOWCASE: "showcase", CLOSURE: "cierre" };
