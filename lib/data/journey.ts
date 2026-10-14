import type { JourneyStageId } from "@/lib/domain/types";

/**
 * FUENTE ÚNICA del ciclo completo AET.
 * ExpectationCard, Client Journey, Delivery Playbook y RACI leen de aquí.
 *
 * Cada etapa declara su "track" para no confundir etapas comerciales,
 * administrativas, de evaluación y pedagógicas.
 */
export type Track = "PREPARACION" | "COMERCIAL" | "ADMISION" | "EVALUACION" | "PEDAGOGICO" | "CONTINUIDAD";

export const TRACK_LABEL: Record<Track, string> = {
  PREPARACION: "Preparación",
  COMERCIAL: "Comercial / cliente",
  ADMISION: "Admisión",
  EVALUACION: "Evaluación de ingreso",
  PEDAGOGICO: "Journey pedagógico",
  CONTINUIDAD: "Continuidad",
};

export type LifecycleStageId =
  | "WAVE_PREP"
  | "CLIENT_ENABLED"
  | "NOMINATION"
  | "INVITATION"
  | "APPLICATION"
  | "ASSESSMENT"
  | "SELECTION"
  | "CONDITIONS"
  | "ENROLLMENT"
  | JourneyStageId;

export interface LifecycleStage {
  id: LifecycleStageId;
  name: string;
  track: Track;
  summary: string;
  evaluates: string;
  ifNotPassed: string;
  expectations: {
    kiber: string[];
    delivery: string[];
    client: string[];
    aetEvidence: string[];
  };
}

export const PENDING_DEFINITION = "PENDIENTE DE DEFINICIÓN";

export const LIFECYCLE: LifecycleStage[] = [
  {
    id: "WAVE_PREP",
    name: "Preparación de Wave",
    track: "PREPARACION",
    summary: "Se verifica que producto, actores, operación y cliente estén listos antes de abrir nominaciones.",
    evaluates: "Wave Readiness Checklist. Solo Product Lead declara WAVE READY.",
    ifNotPassed: "No se abren nominaciones hasta completar el checklist.",
    expectations: {
      kiber: ["Aún no participas: esta etapa ocurre antes de tu invitación."],
      delivery: ["Alinear cliente y explicar el producto", "Validar disponibilidad", "Comprobar readiness"],
      client: ["Conocer AET, su journey y la dedicación que implica", "Saber que nominar no garantiza ingreso"],
      aetEvidence: ["Checklist de readiness completo", "Declaración WAVE READY de Product Lead"],
    },
  },
  {
    id: "CLIENT_ENABLED",
    name: "Cliente habilitado",
    track: "COMERCIAL",
    summary: "El cliente conoce el programa, confirma su rol y acuerda disponibilidad coordinada.",
    evaluates: "Confirmación operacional del cliente (no es contrato).",
    ifNotPassed: "Sin cliente habilitado no se nomina en ese cliente.",
    expectations: {
      kiber: ["Aún no participas."],
      delivery: ["Completar onboarding del cliente", "Acordar disponibilidad según etapa", "No prometer ingreso"],
      client: ["Confirmar las condiciones operativas de participación de tus profesionales"],
      aetEvidence: ["Confirmación de onboarding del cliente registrada"],
    },
  },
  {
    id: "NOMINATION",
    name: "Nominación",
    track: "COMERCIAL",
    summary: "Cliente y Delivery identifican profesionales potenciales. Nominar no significa seleccionar.",
    evaluates: "Fit inicial revisado por Delivery.",
    ifNotPassed: "La nominación puede descartarse; la persona no es notificada como rechazada porque no ha postulado.",
    expectations: {
      kiber: ["Aún no participas: te contactaremos si recibes invitación."],
      delivery: ["Coordinar candidatos", "Validar fit inicial", "Comunicar condiciones", "No prometer ingreso"],
      client: ["Proponer candidatos con datos mínimos", "No completar el Assessment por la persona"],
      aetEvidence: ["Registro de nominación con motivo y oportunidad de aplicación"],
    },
  },
  {
    id: "INVITATION",
    name: "Invitación",
    track: "ADMISION",
    summary: "El profesional recibe una invitación personal a postular. La invitación no equivale a selección.",
    evaluates: "—",
    ifNotPassed: "Si la persona no postula antes del deadline, no entra en esta Wave.",
    expectations: {
      kiber: ["Leer qué es AET antes de decidir", "Decidir personalmente si postulas"],
      delivery: ["Activar la invitación", "Resolver dudas sin prometer ingreso"],
      client: ["Saber que tu profesional fue invitado/a"],
      aetEvidence: ["Invitación enviada con link único"],
    },
  },
  {
    id: "APPLICATION",
    name: "Postulación",
    track: "ADMISION",
    summary: "El profesional se identifica, conoce las exigencias y confirma de forma informada que quiere postular.",
    evaluates: "Confirmación informada previa (no es la Carta de Compromiso).",
    ifNotPassed: "Sin confirmación informada no se habilita el Assessment.",
    expectations: {
      kiber: ["Identificarte", "Leer las exigencias del proceso", "Confirmar cada punto de forma individual"],
      delivery: ["Monitorear completitud", "Resolver bloqueos de acceso"],
      client: ["Ver si la postulación está pendiente o completada"],
      aetEvidence: ["ApplicationRecord", "Registro de acknowledgement con versión"],
    },
  },
  {
    id: "ASSESSMENT",
    name: "Assessment",
    track: "EVALUACION",
    summary: "El profesional responde personalmente el Assessment basado en experiencias reales con IA.",
    evaluates:
      "Uso real de IA (25), profundidad del caso (30), capacidad de reformular el trabajo (25), aprendizaje autónomo y referentes (12), disposición y relación saludable con IA (8).",
    ifNotPassed: "Puede solicitarse un video de rescate, revisión humana o no ser seleccionado/a en esta Wave.",
    expectations: {
      kiber: ["Responder personalmente", "Usar ejemplos concretos", "Enviar antes del deadline"],
      delivery: ["Monitorear completitud", "Resolver bloqueos", "Registrar resultado operacional", "Coordinar rescate cuando aplique", "Comunicar al cliente"],
      client: ["Ver avance / no avance / rescate"],
      aetEvidence: ["Respuesta del Assessment asociada al applicationId", "Evaluación por dimensión"],
    },
  },
  {
    id: "SELECTION",
    name: "Selección",
    track: "EVALUACION",
    summary: "Se comunica el resultado: seleccionado/a, rescate, revisión humana o no seleccionado/a.",
    evaluates: "Resultado del Assessment (y del rescate si aplicó).",
    ifNotPassed: "No seleccionado/a en esta Wave. Podrá participar en próximos ciclos si se abre la oportunidad.",
    expectations: {
      kiber: ["Revisar tu resultado y el siguiente paso"],
      delivery: ["Comunicar resultado al profesional y al cliente", "No exponer puntajes al cliente"],
      client: ["Recibir quién avanza y quién no"],
      aetEvidence: ["Resultado registrado con evaluador y fecha"],
    },
  },
  {
    id: "CONDITIONS",
    name: "Aceptación de condiciones",
    track: "ADMISION",
    summary: "Antes de comenzar, la persona seleccionada revisa y acepta formalmente su compromiso.",
    evaluates: "Aceptación explícita de la Carta de Compromiso vigente.",
    ifNotPassed: "Sin aceptación no hay inscripción. Seleccionado ≠ inscrito.",
    expectations: {
      kiber: ["Leer las condiciones completas", "Aceptar explícitamente con tu nombre"],
      delivery: ["Asegurar que la persona entendió las condiciones", "Resolver dudas antes de la aceptación"],
      client: ["Saber que tu profesional está por inscribirse"],
      aetEvidence: ["CommitmentAcceptance con documentVersion y conditionsVersion"],
    },
  },
  {
    id: "ENROLLMENT",
    name: "Inscripción y onboarding",
    track: "ADMISION",
    summary: "La persona queda inscrita en la Wave y recorre su onboarding.",
    evaluates: "—",
    ifNotPassed: "—",
    expectations: {
      kiber: ["Completar tu onboarding", "Conocer a tu equipo de apoyo y tu primer hito"],
      delivery: ["Dar la bienvenida", "Confirmar calendario inicial"],
      client: ["Recibir confirmación de inscripción"],
      aetEvidence: ["Evento ENROLLED registrado separado de SELECTED", "Onboarding completado"],
    },
  },
  {
    id: "MINDSET",
    name: "AI First Mindset",
    track: "PEDAGOGICO",
    summary: "Demuestras que puedes rediseñar una actividad real integrando IA con criterio.",
    evaluates: "≥75/100 + hard gates. Dos intentos. REVISIÓN HUMANA no consume intento.",
    ifNotPassed: "Segundo intento no aprobado: no avanzas a AI CERTs, salvo excepción explícita de Product Lead.",
    expectations: {
      kiber: ["Rediseñar una actividad real con IA", "Conocer los criterios antes de entregar", "Entregar evidencia propia"],
      delivery: ["Asegurar tiempo", "Detectar bloqueos", "Mantener condiciones", "Comunicar inicio y cierre"],
      client: ["Habilitar disponibilidad", "Esperar un profesional capaz de rediseñar una actividad real antes de certificación"],
      aetEvidence: ["Entrega de rediseño", "Evaluación con hard gates", "Registro de intento"],
    },
  },
  {
    id: "AI_CERTS",
    name: "AI CERTs",
    track: "PEDAGOGICO",
    summary: "Certificación técnica alineada a tu rol: estudio autónomo en la plataforma, profesor y AI Coach.",
    evaluates: "Examen de certificación. Kibernum financia hasta dos intentos.",
    ifNotPassed:
      "Segundo intento no aprobado: Kibernum no financia otro intento y el journey AET se cierra, salvo excepción explícita. Un intento adicional no se presenta como financiado ni como cobrado automáticamente.",
    expectations: {
      kiber: ["Mantener avance semanal", "Mantener vínculo con el profesor y el canal de cohorte", "Rendir seriamente"],
      delivery: ["Revisar progreso", "Validar disponibilidad", "Gestionar criticidades", "Activar recovery plan", "Informar al cliente", "Preparar transición a Lab"],
      client: ["Habilitar tiempo", "Recibir inicio, progreso relevante, riesgos y resultado"],
      aetEvidence: ["Avance en plataforma", "Asistencia a acompañamiento", "Resultado de examen"],
    },
  },
  {
    id: "AI_LAB",
    name: "AI Lab",
    track: "PEDAGOGICO",
    summary: "Aplicas lo aprendido a una necesidad real. Dos sesiones obligatorias de 90 minutos y trabajo autónomo entre ellas.",
    evaluates: "Solución/prototipo demostrable con evidencia suficiente para READY FOR SHOWCASE. Gate de entrada: certificación aprobada.",
    ifNotPassed: "No existe un máximo fijo de intentos: hay ajustes/rediseños hasta alcanzar readiness o una decisión explícita.",
    expectations: {
      kiber: ["Asistir a las dos sesiones", "Construir entre sesiones", "Cuidar la confidencialidad del cliente"],
      delivery: ["Verificar gate de certificación", "Confirmar preparación", "Coordinar sesiones", "Conectar con contexto del cliente", "Monitorear construcción"],
      client: ["Ayudar a validar el problema", "Entregar contexto", "Habilitar conversación"],
      aetEvidence: ["Problema validado", "Prototipo", "Evidencia de valor"],
    },
  },
  {
    id: "SHOWCASE",
    name: "Showcase",
    track: "PEDAGOGICO",
    summary: "Presentas al cliente: problema, usuario, fricción, solución, demo, evidencia, valor, aprendizajes y siguiente experimento.",
    evaluates: "Validación del cliente y decisión de continuidad.",
    ifNotPassed: "Si no alcanzas READY FOR SHOWCASE, sigues ajustando en AI Lab hasta readiness o decisión explícita.",
    expectations: {
      kiber: ["Preparar la presentación completa", "Mostrar evidencia real"],
      delivery: ["Confirmar READY", "Asegurar el stakeholder cliente correcto", "Coordinar agenda", "Verificar decisión y siguiente paso"],
      client: ["Validar el problema", "Valorar la evidencia", "Conversar sobre continuidad", "Tomar una decisión"],
      aetEvidence: ["Registro de Showcase", "Decisión del cliente con owner"],
    },
  },
  {
    id: "CLOSURE",
    name: "Cierre",
    track: "PEDAGOGICO",
    summary: "Cierre formal del proceso: resultado, evidencia, próximos pasos y casos con continuidad.",
    evaluates: "Cierre formal con acciones y owners.",
    ifNotPassed: "—",
    expectations: {
      kiber: ["Cerrar formalmente tu proceso AET"],
      delivery: ["Comunicar el cierre", "Asegurar acciones con owner", "Coordinar seguimientos"],
      client: ["Recibir resultado, evidencia, próximos pasos y casos con continuidad"],
      aetEvidence: ["Acta de cierre", "Acciones con owner"],
    },
  },
  {
    id: "PILOT_ADOPTION",
    name: "Adopción piloto",
    track: "CONTINUIDAD",
    summary: "Cuando corresponda, el caso continúa como piloto en el cliente.",
    evaluates: "Continuidad, bloqueos, experimento siguiente y evidencia.",
    ifNotPassed: "—",
    expectations: {
      kiber: ["Sostener el experimento acordado"],
      delivery: ["Seguir bloqueos y evidencia"],
      client: ["Decidir continuidad", "Habilitar el siguiente experimento"],
      aetEvidence: ["Evidencia de adopción"],
    },
  },
];

export const JOURNEY_PEDAGOGICAL: JourneyStageId[] = ["MINDSET", "AI_CERTS", "AI_LAB", "SHOWCASE", "CLOSURE", "PILOT_ADOPTION"];

export function stage(id: LifecycleStageId): LifecycleStage {
  const s = LIFECYCLE.find((x) => x.id === id);
  if (!s) throw new Error(`Etapa desconocida: ${id}`);
  return s;
}

export function stageLabel(id: JourneyStageId): string {
  return stage(id).name;
}

export const ASSESSMENT_DIMENSIONS = [
  { id: "real-use", label: "Uso real de IA", weight: 25 },
  { id: "depth", label: "Profundidad del caso", weight: 30 },
  { id: "reframe", label: "Capacidad de reformular el trabajo", weight: 25 },
  { id: "autonomy", label: "Aprendizaje autónomo y referentes", weight: 12 },
  { id: "disposition", label: "Disposición y relación saludable con IA", weight: 8 },
];
