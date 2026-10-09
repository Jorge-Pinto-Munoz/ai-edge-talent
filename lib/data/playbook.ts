import { PENDING_DEFINITION } from "./journey";

export interface PlaybookStage {
  id: string;
  name: string;
  mustDo: string[];
  mustNotDo: string[];
  evidence: string[];
  escalateWhen: string[];
  communicate: string[];
}

/** Delivery Playbook: qué hacer en cada etapa. Los "NO DEBE" se derivan de reglas explícitas del producto. */
export const DELIVERY_PLAYBOOK: PlaybookStage[] = [
  {
    id: "before",
    name: "Antes de la Wave",
    mustDo: ["Alinear cliente", "Explicar producto", "Validar disponibilidad", "Identificar candidatos", "Comprobar readiness"],
    mustNotDo: [
      "Prometer ingreso",
      "Prometer una cantidad exacta y fija de horas semanales del cliente",
      "Abrir nominaciones sin WAVE READY de Product Lead",
    ],
    evidence: ["Cliente con onboarding confirmado", "Checklist de readiness con ítems en OK"],
    escalateWhen: [
      "El cliente exige descontar horas o impone formación estrictamente fuera de jornada",
      "Faltan actores críticos (Product Lead, IT Academy, Hub AI) a la fecha de apertura",
    ],
    communicate: ["Propósito, journey y dedicación al cliente", "Que nominar no garantiza ingreso"],
  },
  {
    id: "nomination",
    name: "Selection / Nomination",
    mustDo: ["Coordinar candidatos", "Validar fit inicial", "Comunicar condiciones", "Activar invitación"],
    mustNotDo: ["Completar el Assessment por la persona", "Tratar la nominación como selección", "Prometer ingreso"],
    evidence: ["Nominación con motivo y oportunidad de aplicación", "Invitación enviada con link único"],
    escalateWhen: ["Nominaciones que superan la capacidad de la Wave", PENDING_DEFINITION + " (criterio canónico de fit)"],
    communicate: ["Al profesional: invitación a postular, no selección", "Al cliente: estado de cada nominación"],
  },
  {
    id: "assessment",
    name: "Assessment",
    mustDo: ["Monitorear completitud", "Resolver bloqueos", "Registrar resultado operacional", "Coordinar rescate cuando aplique", "Comunicar al cliente"],
    mustNotDo: ["Compartir puntajes, ranking o evaluación detallada con el cliente", "Presentar el rescate como castigo", "Garantizar selección tras el rescate"],
    evidence: ["Postulación enviada asociada al applicationId", "Resultado registrado con evaluador"],
    escalateWhen: ["Error técnico que impide postular cerca del deadline", "Solicitud de extensión de plazo"],
    communicate: ["Al cliente: pendiente/completada y avance/no avance/rescate", "Al profesional: resultado y próximo paso"],
  },
  {
    id: "mindset",
    name: "Mindset",
    mustDo: ["Asegurar tiempo", "Detectar bloqueos", "Mantener condiciones", "Comunicar inicio y cierre"],
    mustNotDo: ["Saltar Mindset para ir directo a AI CERTs", "Prometer un tercer intento"],
    evidence: ["Asistencia", "Entrega de rediseño", "Resultado con hard gates"],
    escalateWhen: ["No asistencia a Mindset", "Segundo intento no aprobado (posible excepción: solo Product Lead)"],
    communicate: ["Inicio y cierre al cliente", "Resultado y siguiente paso al profesional"],
  },
  {
    id: "certs",
    name: "AI CERTs",
    mustDo: ["Revisar progreso", "Validar disponibilidad", "Gestionar criticidades", "Activar recovery plan", "Informar al cliente", "Preparar la transición a Lab"],
    mustNotDo: [
      "Presentar un tercer intento como financiado o como cobrado automáticamente al profesional",
      "Transformar un atraso en una sanción no definida por Product HQ",
    ],
    evidence: ["Avance en plataforma", "Vínculo con profesor y canal de cohorte", "Resultado de examen"],
    escalateWhen: ["Una semana completa sin acompañamiento", "Sin avance en plataforma por más de 2 semanas", "Segundo intento no aprobado"],
    communicate: ["Al cliente: inicio, progreso relevante, riesgo y resultado"],
  },
  {
    id: "lab",
    name: "AI Lab",
    mustDo: ["Verificar gate de certificación", "Confirmar preparación", "Coordinar sesiones", "Conectar al profesional con contexto del cliente", "Monitorear construcción"],
    mustNotDo: ["Admitir a Lab sin certificación aprobada", "Imponer un máximo de intentos no vigente"],
    evidence: ["Certificación aprobada", "Asistencia a 2 sesiones de 90 min", "Prototipo y evidencia"],
    escalateWhen: ["El cliente no habilita contexto o validación del problema", "Riesgo de confidencialidad o uso indebido de información"],
    communicate: ["Al cliente: necesidad de validar problema y entregar contexto"],
  },
  {
    id: "showcase",
    name: "Showcase",
    mustDo: ["Confirmar READY", "Asegurar el stakeholder cliente correcto", "Coordinar agenda", "Verificar decisión y siguiente paso"],
    mustNotDo: ["Agendar Showcase sin READY FOR SHOWCASE", "Cerrar sin decisión registrada"],
    evidence: ["Estado READY FOR SHOWCASE", "Decisión del cliente con owner"],
    escalateWhen: ["El cliente no dispone de contraparte capaz de reconocer el problema"],
    communicate: ["Agenda y contenido esperado al cliente"],
  },
  {
    id: "closure",
    name: "Closure",
    mustDo: ["Comunicar cierre", "Asegurar acciones con owner", "Coordinar seguimientos necesarios"],
    mustNotDo: ["Dar por cerrado el programa solo con la certificación"],
    evidence: ["Cierre comunicado", "Acciones con owner"],
    escalateWhen: [PENDING_DEFINITION],
    communicate: ["Resultado, evidencia, próximos pasos y casos con continuidad"],
  },
];

export const DELIVERY_READINESS_ITEMS = [
  "Revisar el programa",
  "Revisar el journey",
  "Conocer los gates",
  "Conocer los riesgos",
  "Conocer las comunicaciones",
  "Conocer las responsabilidades (RACI)",
  "Revisar el cliente asignado",
  "Revisar los participantes",
  "Validar disponibilidad",
  "Saber cuándo escalar",
];
