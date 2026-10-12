/**
 * Plantillas de correo de admisión. Tono CX, español de Chile.
 * Nunca incluyen puntajes ni ranking (regla AET). Una sola acción principal por correo.
 */
export type EmailTemplate = "INVITATION" | "SELECTED" | "RESCUE_REQUIRED" | "NOT_SELECTED" | "REMINDER";

export const TEMPLATE_LABEL: Record<EmailTemplate, string> = {
  INVITATION: "Invitación a postular",
  REMINDER: "Recordatorio de postulación",
  SELECTED: "Seleccionado/a · aceptar compromiso",
  RESCUE_REQUIRED: "Repechaje · video",
  NOT_SELECTED: "Todavía no · próximos grupos",
};

/** Qué plantilla corresponde a cada estado (para envío masivo por etapa). */
export const TEMPLATE_FOR_STATUS: Partial<Record<string, EmailTemplate>> = {
  INVITED: "INVITATION",
  IDENTIFIED: "REMINDER",
  APPLICATION_STARTED: "REMINDER",
  SELECTED: "SELECTED",
  CONDITIONS_PENDING: "SELECTED",
  RESCUE_REQUIRED: "RESCUE_REQUIRED",
  NOT_SELECTED: "NOT_SELECTED",
};

export interface EmailContext {
  firstName: string;
  waveName: string;
  link: string;
  deadline: string | null;
  senderName: string;
}

export function renderEmail(t: EmailTemplate, c: EmailContext): { subject: string; text: string } {
  const sign = `\n\nUn saludo,\n${c.senderName}\nAI Edge Talent · Kibernum`;
  const deadline = c.deadline ? ` Tienes plazo hasta el ${c.deadline}.` : "";
  switch (t) {
    case "INVITATION":
      return {
        subject: `${c.firstName}, te invitamos a postular a ${c.waveName}`,
        text: `Hola ${c.firstName}:\n\nQueremos invitarte a postular a ${c.waveName}, una experiencia de desarrollo para profesionales TI que quieren integrar inteligencia artificial de manera más profunda a su rol, desarrollar criterio y llevar ese aprendizaje a desafíos reales de su trabajo.\n\nEsta invitación no significa que ya estés seleccionado/a.${deadline}\n\nComenzar mi postulación: ${c.link}${sign}`,
      };
    case "REMINDER":
      return {
        subject: `Tu postulación a ${c.waveName} sigue abierta`,
        text: `Hola ${c.firstName}:\n\nVimos que tu postulación a ${c.waveName} aún no está enviada.${deadline} Puedes retomarla donde la dejaste:\n\n${c.link}${sign}`,
      };
    case "SELECTED":
      return {
        subject: `${c.firstName}, fuiste seleccionado/a para continuar en ${c.waveName}`,
        text: `Hola ${c.firstName}:\n\n¡Buenas noticias! Fuiste seleccionado/a para continuar en ${c.waveName}.\n\nAntes de comenzar, necesitamos que revises y aceptes las condiciones de participación. Tu inscripción se confirma al aceptar el compromiso.\n\nRevisar y aceptar condiciones: ${c.link}${sign}`,
      };
    case "RESCUE_REQUIRED":
      return {
        subject: `Queremos complementar tu postulación a ${c.waveName}`,
        text: `Hola ${c.firstName}:\n\nGracias por postular. El formulario escrito no nos permitió observar suficientemente parte de tu experiencia, así que queremos darte una instancia para complementarla: un video breve (máximo 2 minutos) contándonos por qué te interesa participar, qué te motiva y qué compromiso estás dispuesto/a a asumir.\n\nNo es un castigo y no garantiza selección: es una oportunidad para mostrar lo que el formulario no alcanzó a captar.${deadline}\n\nInstrucciones: ${c.link}${sign}`,
      };
    case "NOT_SELECTED":
      return {
        subject: `Sobre tu postulación a ${c.waveName}`,
        text: `Hola ${c.firstName}:\n\nGracias por tu interés y por el tiempo que dedicaste a postular. En esta ola partimos con un grupo acotado y por ahora no continuarás el proceso.\n\nEsto es un "todavía no": podrás participar en próximos grupos cuando se abra la oportunidad, y tu Delivery puede conversar contigo sobre los próximos pasos.${sign}`,
      };
  }
}
