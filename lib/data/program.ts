import { PENDING_DEFINITION } from "./journey";

export interface QA {
  q: string;
  a: string;
}

/** Portal permanente /programa: responde el programa sin depender de correos. */
export const PROGRAM_QA: { section: string; items: QA[] }[] = [
  {
    section: "El programa",
    items: [
      {
        q: "¿Qué es AI Edge Talent?",
        a: "Una experiencia de desarrollo de Kibernum para profesionales TI que quieren integrar inteligencia artificial de manera más profunda a su rol, desarrollar criterio y llevar ese aprendizaje a desafíos reales de su trabajo. No es solo un curso ni solo una certificación.",
      },
      {
        q: "¿Para qué existe?",
        a: "Para que el profesional evolucione mientras presta servicios: integra IA en su forma de trabajar y demuestra valor real frente al cliente con evidencia concreta.",
      },
      {
        q: "¿A quién está dirigido?",
        a: "A profesionales TI de Kibernum que prestan servicios en clientes y quieren integrar IA en su rol.",
      },
      {
        q: "¿Qué perfiles se priorizan?",
        a: "Profesionales que ya usan IA en su trabajo (no solo la conocen), con actitud genuina de aprendizaje y una oportunidad real de aplicación en su cliente. La selección no es abierta: depende del Assessment y de la capacidad de la Wave.",
      },
      {
        q: "¿Cuánto dura?",
        a: "De 30 a 45 días según tu ritmo.",
      },
      {
        q: "¿Cuánta dedicación requiere?",
        a: "Espacios coordinados dentro de jornada (normalmente 2–3 horas por semana según etapa) más dedicación personal de estudio, práctica y construcción. AI CERTs por sí solo contempla aproximadamente 40 horas.",
      },
      {
        q: "¿Qué partes ocurren dentro de jornada?",
        a: "Los espacios que Delivery coordina con el cliente según la etapa: sesiones, acompañamientos, AI Lab y Showcase. La cantidad exacta varía por etapa; no es un número fijo garantizado cada semana.",
      },
      {
        q: "¿Qué dedicación personal se espera?",
        a: "Como en cualquier certificación o diplomado exigente: estudio, práctica, preparación, construcción y avance autónomo. La disponibilidad laboral no reemplaza ese compromiso personal.",
      },
    ],
  },
  {
    section: "Etapas y evaluación",
    items: [
      {
        q: "¿Cuáles son las etapas?",
        a: "Assessment → AI First Mindset → AI CERTs → AI Lab → Showcase → Cierre. Antes de eso existen etapas de preparación y admisión (nominación, invitación, postulación, selección, aceptación de condiciones e inscripción) que no son parte del journey pedagógico.",
      },
      {
        q: "¿Qué evalúa cada etapa?",
        a: "Assessment: evidencia real de uso de IA en cinco dimensiones (25/30/25/12/8). Mindset: rediseño de una actividad real con IA, ≥75/100 + hard gates. AI CERTs: examen de certificación técnica por rol. AI Lab: una solución real y de impacto para el negocio, con evidencia. Showcase: presentas ese impacto; la habilitación se convierte en valor real.",
      },
      {
        q: "¿Qué pasa si no apruebo?",
        a: "Cada etapa tiene criterios conocidos de antemano y recibes feedback para avanzar. Las reglas de continuidad están en tu compromiso de participación, que lees y aceptas antes de comenzar. Un atraso operacional activa alerta y acompañamiento: no es una expulsión automática.",
      },
      {
        q: "¿Qué significa certificarse?",
        a: "Aprobar el examen AI CERTs de la ruta alineada a tu rol. Es una etapa del proceso y el gate de entrada a AI Lab. No es el final del programa.",
      },
      {
        q: "¿Qué ocurre después de certificarse?",
        a: "Continúas a AI Lab, donde aplicas lo aprendido a una necesidad real del cliente.",
      },
      {
        q: "¿Qué es AI Lab?",
        a: "La etapa de aplicación real: dos sesiones obligatorias de 90 minutos y trabajo autónomo entre ellas, para producir una solución/prototipo demostrable con evidencia suficiente para optar a Showcase.",
      },
      {
        q: "¿Qué es Showcase?",
        a: "La presentación al cliente de problema, usuario, fricción, solución, demo, evidencia, valor, aprendizajes y siguiente experimento. El cliente valida el problema, valora la evidencia y toma una decisión de continuidad.",
      },
      {
        q: "¿Qué ocurre al cierre?",
        a: "Se comunica el resultado, la evidencia, los próximos pasos y los casos con continuidad. Cuando corresponde, el caso sigue como adopción piloto.",
      },
    ],
  },
  {
    section: "Personas y responsabilidades",
    items: [
      {
        q: "¿Quién me acompaña?",
        a: "Tu Delivery (primer punto de contacto), el Hub AI (Mindset y AI Lab), IT Academy (enrolamiento AI CERTs), tu profesor de certificación y Product Lead para decisiones de producto y excepciones.",
      },
      {
        q: "¿Qué espera AET del profesional?",
        a: "Cumplir hitos y plazos, aprender de forma autónoma, tomarse en serio la certificación, participar en acompañamientos, cumplir Mindset, completar AI Lab, participar en Showcase, ser responsable con el cliente y proteger el espacio que el cliente habilita.",
      },
      {
        q: "¿Qué espera del cliente?",
        a: "Participar en la identificación de profesionales, entender que nominar no garantiza selección, coordinar disponibilidad con Delivery (normalmente 2–3 horas semanales según etapa), facilitar contexto real, validar necesidades en AI Lab y participar en Showcase con una contraparte capaz de conversar sobre continuidad.",
      },
      {
        q: "¿Qué hace Delivery?",
        a: "Coordina y asegura cada etapa: alinea al cliente, coordina candidatos e invitaciones, monitorea avances, resuelve bloqueos, activa recovery, comunica al cliente y escala cuando corresponde. Ver /delivery/playbook.",
      },
      {
        q: "¿Qué decisiones toma Product Lead?",
        a: "Declara WAVE READY, valida los documentos de condiciones y compromiso, y es quien puede otorgar excepciones explícitas (p.ej. tras un segundo intento no aprobado en Mindset o AI CERTs).",
      },
      {
        q: "¿Dónde pedir ayuda?",
        a: "Primero a tu Delivery. Para AI CERTs, también a tu profesor y al canal de cohorte. Los canales específicos de cada Wave se muestran en tu panel. Canal de soporte general: " + PENDING_DEFINITION + ".",
      },
    ],
  },
];

export type FaqRole = "KIBER" | "CLIENT" | "DELIVERY";

export const FAQ_BY_ROLE: Record<FaqRole, QA[]> = {
  KIBER: [
    { q: "¿Cuánto dura?", a: "De 30 a 45 días según tu ritmo." },
    { q: "¿Cuánto tiempo debo dedicar?", a: "Los espacios coordinados dentro de jornada (normalmente 2–3 h/semana según etapa) más tu tiempo personal de estudio y práctica. AI CERTs contempla ~40 horas en 3–4 semanas." },
    { q: "¿Qué pasa si no apruebo?", a: "Mindset: segundo intento no aprobado impide avanzar a AI CERTs salvo excepción de Product Lead. AI CERTs: segundo intento no aprobado cierra el journey salvo excepción. AI Lab: se ajusta hasta readiness. Un atraso activa alerta y recovery, no expulsión automática." },
    { q: "¿Cuántos intentos tengo?", a: "Mindset: dos (REVISIÓN HUMANA no consume intento). AI CERTs: dos intentos financiados por Kibernum. AI Lab: sin máximo fijo vigente." },
    { q: "¿Qué es un hard gate?", a: "Un criterio que debe cumplirse sí o sí, independiente del puntaje total. En Mindset necesitas ≥75/100 y además cumplir los hard gates. Los hard gates específicos se comunican antes de la evaluación." },
    { q: "¿Quién me ayuda?", a: "Tu Delivery primero. Profesor y canal de cohorte en AI CERTs. Hub AI en Mindset y AI Lab." },
    { q: "¿Qué ocurre después de certificarme?", a: "Sigues a AI Lab. La certificación no es el final del programa." },
    { q: "¿Debo construir algo?", a: "Sí. En AI Lab construyes una solución/prototipo demostrable sobre una necesidad real, con evidencia." },
    { q: "¿Qué es Showcase?", a: "Tu presentación al cliente de problema, solución, demo, evidencia, valor y siguiente experimento, cuando alcanzas READY FOR SHOWCASE." },
  ],
  CLIENT: [
    { q: "¿Cuánto tiempo debe dedicar mi profesional?", a: "Disponibilidad coordinada con Delivery, normalmente 2–3 horas por semana según etapa, más dedicación personal del profesional." },
    { q: "¿Tengo que participar?", a: "Sí, en momentos clave: nominación, habilitación de disponibilidad, validación del problema en AI Lab y decisión en Showcase." },
    { q: "¿Qué información recibiré?", a: "Estado de postulación (pendiente/completada), avance/no avance/rescate, inicio y progreso relevante, riesgos, resultados, evidencia y próximos pasos." },
    { q: "¿Qué información no recibiré?", a: "Ranking, puntajes ni evaluación detallada del Assessment." },
    { q: "¿Por qué puede no ser seleccionado?", a: "Porque la selección depende de la evidencia del Assessment y de la capacidad de la Wave. Nominar no significa seleccionar." },
    { q: "¿Qué ocurre en Lab?", a: "El profesional aplica lo aprendido a una necesidad real. Usted ayuda a validar el problema y entrega contexto." },
    { q: "¿Qué decidimos en Showcase?", a: "Si el caso tiene continuidad y cuál es el siguiente paso." },
    { q: "¿La certificación significa que el programa terminó?", a: "No. Después vienen AI Lab, Showcase y Cierre." },
  ],
  DELIVERY: [
    { q: "¿Quién toma decisiones?", a: "Product Lead: WAVE READY, documentos y excepciones. Hub AI: evaluación y selección en comité. Cliente: decisión de continuidad en Showcase. Ver la matriz RACI." },
    { q: "¿Cuándo escalo?", a: "Ver 'Cuándo escalar' en cada etapa del playbook. Ejemplos: no asistencia a Mindset, una semana completa sin acompañamiento en AI CERTs, segundo intento no aprobado, cliente que bloquea el proceso." },
    { q: "¿Qué comunico?", a: "Ver 'Qué comunicar' en cada etapa del playbook." },
    { q: "¿Cómo manejo un rescate?", a: "Comunícalo como complemento del Assessment, no como castigo. Explica que el video no garantiza selección. Al cliente solo se informa que la persona complementa su postulación." },
    { q: "¿Qué constituye criticidad?", a: "Señales que ponen en riesgo la continuidad: falta de avance, ausencia de acompañamiento, bloqueos del cliente, intentos fallidos. Umbral canónico de criticidad: " + PENDING_DEFINITION + "." },
    { q: "¿Qué gate necesita evidencia?", a: "Mindset (rediseño + hard gates), AI CERTs (examen aprobado como gate a Lab), AI Lab (prototipo para READY FOR SHOWCASE) y Showcase (decisión registrada)." },
    { q: "¿Qué información puede ver el cliente?", a: "Estado agregado: pendiente/completada, avance/no avance/rescate, progreso relevante y riesgos. Nunca puntajes, ranking ni evaluación detallada." },
  ],
};

export interface ClientPhase {
  n: number;
  name: string;
  whatHappens: string;
  canExpect: string;
  weNeed: string;
  willReceive: string;
  nextContact: string;
  notice?: string;
}

export const CLIENT_PHASES: ClientPhase[] = [
  {
    n: 0,
    name: "Conocer AET",
    whatHappens: "Delivery presenta el propósito, la población objetivo, el journey, la dedicación y las responsabilidades.",
    canExpect: "Claridad completa sobre qué es y qué no es AI Edge Talent.",
    weNeed: "Tiempo para conocer el programa y resolver dudas.",
    willReceive: "Acceso a /programa y a su onboarding de cliente.",
    nextContact: "Cuando se inicie la preparación de la Wave.",
  },
  {
    n: 1,
    name: "Preparar Wave",
    whatHappens: "Cliente y Delivery alinean cantidad y perfiles, disponibilidad, candidatos y expectativas.",
    canExpect: "Una propuesta de participación coherente con su operación.",
    weNeed: "Confirmar disponibilidad coordinada según etapa y su rol en Lab/Showcase.",
    willReceive: "Confirmación de la Wave y fechas clave.",
    nextContact: "Cuando la Wave sea declarada WAVE READY y se abran nominaciones.",
  },
  {
    n: 2,
    name: "Nominar",
    whatHappens: "Usted identifica profesionales potenciales con datos mínimos.",
    canExpect: "Que Delivery revise cada caso e invite a postular a quienes correspondan.",
    weNeed: "Nombre, rol, unidad, motivo, oportunidad de aplicación y disponibilidad estimada.",
    willReceive: "Estado de cada nominación.",
    nextContact: "Cuando sus nominados sean invitados a postular.",
    notice: "Nominar no significa seleccionar.",
  },
  {
    n: 3,
    name: "Assessment",
    whatHappens: "Cada profesional postula personalmente y responde el Assessment.",
    canExpect: "Visibilidad de postulación pendiente/completada y de avance/no avance/rescate.",
    weNeed: "No completar el Assessment por la persona.",
    willReceive: "Resultado agregado por profesional. No ve ranking ni evaluación detallada.",
    nextContact: "Al comunicar resultados después del cierre de postulación.",
  },
  {
    n: 4,
    name: "Mindset",
    whatHappens: "El profesional demuestra que puede rediseñar una actividad real integrando IA.",
    canExpect: "Un profesional capaz de rediseñar una actividad real antes de pasar a certificación.",
    weNeed: "Habilitar la disponibilidad coordinada.",
    willReceive: "Inicio y cierre de Mindset.",
    nextContact: "Al cierre de Mindset.",
  },
  {
    n: 5,
    name: "AI CERTs",
    whatHappens: "Certificación técnica alineada al rol, con estudio autónomo y AI Coach.",
    canExpect: "Seguimiento activo de Delivery.",
    weNeed: "Habilitar tiempo según lo coordinado.",
    willReceive: "Inicio, progreso relevante, riesgo y resultado.",
    nextContact: "Ante riesgos y al obtener el resultado.",
  },
  {
    n: 6,
    name: "AI Lab",
    whatHappens: "El profesional aplica lo aprendido sobre una necesidad real de su operación.",
    canExpect: "Una solución/prototipo demostrable con evidencia.",
    weNeed: "Ayudar a validar el problema, entregar contexto y habilitar la conversación.",
    willReceive: "Avance del caso y solicitud de validación.",
    nextContact: "Cuando el caso alcance READY FOR SHOWCASE.",
  },
  {
    n: 7,
    name: "Showcase",
    whatHappens: "El profesional presenta problema, solución, demo, evidencia y valor.",
    canExpect: "Una conversación concreta sobre continuidad.",
    weNeed: "Una contraparte capaz de reconocer el problema y tomar una decisión.",
    willReceive: "Registro de la decisión y siguiente paso.",
    nextContact: "Al cierre de la Wave.",
  },
  {
    n: 8,
    name: "Cierre",
    whatHappens: "Se cierra formalmente el proceso.",
    canExpect: "Resultado, evidencia, próximos pasos y casos con continuidad.",
    weNeed: "Confirmar los casos que continúan.",
    willReceive: "Resumen de cierre.",
    nextContact: "Si hay adopción piloto, al iniciar el piloto.",
  },
  {
    n: 9,
    name: "Adopción piloto",
    whatHappens: "Cuando corresponde, el caso continúa como piloto.",
    canExpect: "Seguimiento de continuidad, bloqueos, experimento siguiente y evidencia.",
    weNeed: "Habilitar el siguiente experimento.",
    willReceive: "Evidencia de adopción.",
    nextContact: PENDING_DEFINITION + " (cadencia de seguimiento de pilotos).",
  },
];

/** Compromisos bilaterales mostrados antes de postular. */
export const KIBER_COMMITMENTS: { title: string; body: string; bullets?: string[] }[] = [
  { title: "Cumplas los plazos", body: "Cada etapa tiene hitos y entregables. La continuidad depende de completar la evidencia requerida dentro de las condiciones definidas para cada etapa." },
  { title: "Aprendas de forma autónoma", body: "AI Edge Talent requiere iniciativa. No es una experiencia donde todo el aprendizaje ocurre durante clases o acompañamientos. Debes estudiar, practicar, experimentar y avanzar también de manera autónoma." },
  {
    title: "Te tomes seriamente la certificación",
    body: "AI CERTs contempla aproximadamente 40 horas de dedicación y normalmente ocurre durante 3–4 semanas. Kibernum financia hasta dos intentos de examen. Si el segundo intento no es aprobado, Kibernum no financia un nuevo intento y el journey AET se cierra para ese participante, salvo una excepción explícita. Un eventual intento adicional no se presenta como automáticamente financiado ni automáticamente cobrado al profesional.",
  },
  { title: "Participes activamente de los acompañamientos", body: "Debes asistir y participar en las actividades, sesiones y acompañamientos obligatorios definidos para tu etapa. Para AI CERTs debes mantener vínculo con el profesor y el canal/grupo definido para la cohorte. Una semana completa sin acompañamiento es una señal de riesgo." },
  { title: "Cumplas AI First Mindset", body: "Mindset no es una formalidad previa a la certificación. Debes demostrar que puedes rediseñar una actividad real integrando IA con criterio. La aprobación exige ≥75/100 + hard gates. Existen dos intentos. REVISIÓN HUMANA no consume intento. Un segundo intento no aprobado impide avanzar a AI CERTs salvo excepción explícita de Product Lead." },
  { title: "Completes AI Lab", body: "Después de certificarte todavía continúa el programa. Debes aplicar el aprendizaje sobre una necesidad real. AI Lab contempla dos sesiones obligatorias de 90 minutos y trabajo autónomo entre ellas. La meta es producir una solución/prototipo demostrable y con suficiente evidencia para optar a Showcase." },
  { title: "Participes en Showcase", body: "AI Edge Talent busca conectar aprendizaje con trabajo real. Si alcanzas READY FOR SHOWCASE, deberás presentar al cliente:", bullets: ["problema", "usuario", "fricción", "solución", "demo", "evidencia", "valor", "aprendizajes", "siguiente experimento"] },
  { title: "Seas responsable con tu cliente", body: "Participas mientras prestas servicios a un cliente. Debes:", bullets: ["coordinar adecuadamente tiempos", "cuidar confidencialidad", "utilizar información y herramientas de manera responsable", "mantener los controles humanos necesarios", "comunicar oportunamente impedimentos", "respetar las condiciones y políticas aplicables del cliente"] },
  { title: "Protejas el espacio que el cliente habilita", body: "El cliente coordinará con Delivery disponibilidad laboral para el programa, normalmente del orden de 2 a 3 horas por semana según la etapa. Ese espacio debe utilizarse responsablemente." },
  { title: "Inviertas también tiempo propio", body: "AI Edge Talent representa una inversión de Kibernum en tu desarrollo profesional. Al igual que en una certificación, diplomado u otro proceso exigente, puede ser necesario complementar las horas coordinadas con estudio, práctica, preparación, construcción y avance autónomo. La disponibilidad laboral no reemplaza ese compromiso personal." },
];

export const KIBERNUM_COMMITMENTS = [
  "diseño del journey",
  "Assessment",
  "experiencia AI First Mindset",
  "ruta AI CERTs alineada al rol",
  "financiamiento de certificación bajo las condiciones vigentes",
  "acompañamiento docente",
  "AI Lab",
  "facilitación",
  "evaluación y feedback",
  "Showcase",
  "seguimiento operacional",
  "coordinación con cliente",
  "soporte ante bloqueos",
  "claridad previa sobre criterios relevantes",
];

export const CLIENT_COMMITMENTS = [
  "participa en la identificación de profesionales",
  "conoce que nominación no garantiza selección",
  "coordina con Delivery disponibilidad laboral",
  "normalmente habilita aproximadamente 2–3 horas semanales según etapa",
  "facilita contexto de trabajo real",
  "ayuda a validar necesidades en AI Lab cuando corresponde",
  "participa en Showcase con una contraparte capaz de reconocer el problema y conversar sobre continuidad",
  "recibe hitos y criticidades relevantes",
];

export const CLIENT_ONBOARDING_QA: QA[] = [
  { q: "¿Qué es AET?", a: "Una experiencia de desarrollo para que profesionales TI integren IA en su rol y la apliquen a desafíos reales de su operación." },
  { q: "¿Por qué participa?", a: "Porque sus profesionales pueden aplicar el aprendizaje directamente en su contexto y usted puede decidir sobre casos con continuidad." },
  { q: "¿Qué profesionales son candidatos?", a: "Los que usted y Delivery identifiquen como nominados. Cada uno decide postular y responde personalmente el Assessment." },
  { q: "¿Qué rol tendrá?", a: "Nominar, habilitar disponibilidad, entregar contexto en AI Lab y decidir en Showcase." },
  { q: "¿Qué disponibilidad debe habilitar?", a: "Disponibilidad coordinada con Delivery, normalmente 2–3 horas por semana según etapa. No es un número fijo todas las semanas." },
  { q: "¿Qué información recibirá?", a: "Estado de postulación, avance/no avance/rescate, inicio, progreso relevante, riesgos, resultados y evidencia." },
  { q: "¿Qué información no recibirá?", a: "Ranking, puntajes o evaluación detallada." },
  { q: "¿Cuándo será contactado?", a: "En cada cambio de fase del Client Journey (ver /client/journey)." },
  { q: "¿Qué ocurrirá en Lab?", a: "El profesional construye una solución sobre una necesidad real; usted ayuda a validar el problema." },
  { q: "¿Qué ocurrirá en Showcase?", a: "El profesional presenta evidencia y valor; usted decide continuidad." },
  { q: "¿Cómo se cierra?", a: "Con resultado, evidencia, próximos pasos y casos con continuidad." },
];
