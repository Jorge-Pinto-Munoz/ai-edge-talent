/** Preguntas frecuentes: respuestas cortas y precisas. `aud` define a quién se muestran primero. */
export type HelpAudience = "profesional" | "cliente";
export interface HelpItem {
  q: string;
  a: string;
  aud: HelpAudience[];
  topic: "Postulación" | "Selección" | "Certificación" | "AI Lab" | "Después" | "Cliente" | "Plataforma";
}

export const HELP: HelpItem[] = [
  { topic: "Postulación", aud: ["profesional"], q: "¿Cómo postulo?", a: "Con el link de postulación de tu Wave. Completas el Assessment (unos 20 minutos) con casos reales de tu trabajo. Puedes guardar y seguir después hasta el cierre." },
  { topic: "Postulación", aud: ["profesional"], q: "¿Tiene algún costo para mí?", a: "Ninguno. Kibernum financia el 100 %: habilitación, certificación AI CERT (hasta dos intentos) y AI Lab. Lo único que pedimos es compromiso." },
  { topic: "Selección", aud: ["profesional", "cliente"], q: "¿Cómo se evalúa la postulación?", a: "Con una rúbrica conocida de cinco dimensiones: uso real de IA, profundidad del caso, mindset de reformulación, aprendizaje autónomo y disposición. Se evalúa evidencia, no seniority ni nombres de herramientas." },
  { topic: "Selección", aud: ["profesional", "cliente"], q: "¿Y si no quedo seleccionado? (video de rescate)", a: "Tienes una segunda oportunidad: el video de rescate. Si tu postulación queda bajo el corte, te pediremos un video breve (máximo 3 minutos) respondiendo cuatro preguntas sobre tu compromiso, tu uso de IA y tu interés. El Product Lead lo revisa y decide. Si aun así no entras, quedas en la banca para la próxima Wave." },
  { topic: "Selección", aud: ["profesional"], q: "¿Cuándo sé el resultado?", a: "Después del cierre de postulación. Te avisamos por correo y lo ves en tu enlace personal: avanzas, video de rescate o próxima Wave." },
  { topic: "Certificación", aud: ["profesional", "cliente"], q: "¿Qué es AI CERT?", a: "AI CERTs™ es una certificadora internacional de inteligencia artificial. Su certificación AI+ valida con examen tu dominio técnico de la IA aplicada a tu rol. En AI Edge Talent es el respaldo externo; Kibernum certifica tu mindset y tu ejecución práctica." },
  { topic: "Certificación", aud: ["profesional"], q: "¿Qué certificación me corresponde?", a: "Depende de tu rol: ingeniería (AI+ Developer™), QA, agilidad (Velocity Manager™) o datos. La ruta exacta se confirma según tu cargo antes de inscribirte: 8 h de fundamentos y 40 h de especialización." },
  { topic: "Certificación", aud: ["profesional"], q: "¿Qué recibo al aprobar?", a: "El certificado oficial de AI CERTs con verificación en línea y un badge digital para LinkedIn. La certificación aprobada y verificada te da paso al AI Lab." },
  { topic: "Certificación", aud: ["profesional"], q: "¿Y si no apruebo el examen AI CERT?", a: "Tienes un segundo intento, también financiado por Kibernum. Avisa a tu Delivery para preparar ese intento con tu profesor." },
  { topic: "AI Lab", aud: ["profesional", "cliente"], q: "¿Qué pasa en el AI Lab y el Showcase?", a: "Dos clases con el Hub AI: en la primera llegas con un desafío real de tu cliente; en la segunda, con lo que construiste. Luego lo presentas en el Showcase con evidencia de valor, de forma individual o en grupo." },
  { topic: "Después", aud: ["profesional", "cliente"], q: "¿Qué pasa después de certificarme?", a: "Te seguimos acompañando: al mes 1 validamos la adopción de herramientas y al mes 3 medimos el impacto real. Tienes acceso a Coursera Enterprise y quedas visible como talento habilitado en IA." },
  { topic: "Cliente", aud: ["cliente"], q: "¿Cuánto tiempo del profesional requiere?", a: "Normalmente 2 a 3 horas por semana dentro de la jornada, coordinadas con Delivery según la etapa. La habilitación es una inversión en la productividad de su propio equipo." },
  { topic: "Cliente", aud: ["cliente"], q: "¿Qué información recibo como cliente?", a: "El avance de sus profesionales por etapa, riesgos o bloqueos si los hay, y los resultados con evidencia. No recibe puntajes ni rankings de evaluación." },
  { topic: "Cliente", aud: ["cliente"], q: "¿Qué impacto buscamos?", a: "Hasta 30 % más productividad, con un caso de IA funcionando en su operación y un compromiso de agilidad que se mide al mes 1 y al mes 3." },
  { topic: "Plataforma", aud: ["profesional", "cliente"], q: "No puedo ingresar a la plataforma", a: "Ingresa en /login con tu correo corporativo y abre el enlace que te enviamos (revisa spam). El enlace vence en una hora; si caducó, pide uno nuevo. Si sigue sin funcionar, escríbenos aquí abajo." },
];

export const SUPPORT_TOPICS = ["Postulación", "Selección y resultados", "Certificación AI CERT", "AI Lab y Showcase", "Acceso a la plataforma", "Otro"] as const;
