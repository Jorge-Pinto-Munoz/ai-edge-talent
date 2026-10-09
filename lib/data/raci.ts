import type { LifecycleStageId } from "./journey";

export const RACI_ACTORS = [
  "Professional / Kiber",
  "Client",
  "Delivery",
  "Product Lead",
  "Wave Lead",
  "Hub AI",
  "IT Academy",
  "Professor",
  "Evaluation Engine",
  "Product Intelligence",
  "Communications",
] as const;
export type RaciActor = (typeof RACI_ACTORS)[number];

export type RaciLetter = "R" | "A" | "C" | "I";
export interface RaciCell {
  letters: RaciLetter[];
  note?: string;
}

/**
 * Matriz RACI. Solo se registran responsabilidades respaldadas por el brief o el blueprint de producto.
 * Cualquier celda ausente se muestra como PENDIENTE DE DEFINICIÓN: no se inventa.
 * "Accountable" único por etapa solo donde Product HQ lo definió.
 */
export const RACI: { stage: LifecycleStageId; label: string; cells: Partial<Record<RaciActor, RaciCell>> }[] = [
  {
    stage: "WAVE_PREP",
    label: "Preparación de Wave",
    cells: {
      "Product Lead": { letters: ["A"], note: "Única figura que declara WAVE READY" },
      Delivery: { letters: ["R"], note: "Alinea cliente, valida disponibilidad, comprueba readiness" },
      Client: { letters: ["C"], note: "Conoce AET, journey y dedicación" },
    },
  },
  {
    stage: "NOMINATION",
    label: "Nominación e invitación",
    cells: {
      Client: { letters: ["R"], note: "Propone candidatos" },
      Delivery: { letters: ["R"], note: "Revisa el caso, valida fit, activa invitación" },
      "Professional / Kiber": { letters: ["I"], note: "Recibe invitación" },
    },
  },
  {
    stage: "ASSESSMENT",
    label: "Postulación y Assessment",
    cells: {
      "Professional / Kiber": { letters: ["R"], note: "Responde personalmente" },
      Delivery: { letters: ["R"], note: "Monitorea completitud, resuelve bloqueos, coordina rescate" },
      "Hub AI": { letters: ["R"], note: "Evalúa la evidencia en comité" },
      Client: { letters: ["I"], note: "Ve pendiente/completada y avance/no avance/rescate" },
    },
  },
  {
    stage: "SELECTION",
    label: "Selección",
    cells: {
      "Hub AI": { letters: ["R"], note: "Decide en comité quiénes pasan" },
      Delivery: { letters: ["R"], note: "Comunica resultado a profesional y cliente" },
      Client: { letters: ["I"] },
      "Professional / Kiber": { letters: ["I"] },
    },
  },
  {
    stage: "CONDITIONS",
    label: "Aceptación de condiciones e inscripción",
    cells: {
      "Professional / Kiber": { letters: ["R"], note: "Acepta explícitamente la versión vigente" },
      "Product Lead": { letters: ["A"], note: "Valida el texto del compromiso" },
      Delivery: { letters: ["R"], note: "Comunica condiciones y resuelve dudas" },
      Client: { letters: ["I"] },
    },
  },
  {
    stage: "MINDSET",
    label: "AI First Mindset",
    cells: {
      "Professional / Kiber": { letters: ["R"] },
      "Hub AI": { letters: ["R"], note: "Ejecuta la experiencia Mindset" },
      Delivery: { letters: ["R"], note: "Asegura tiempo y comunica inicio/cierre" },
      "Product Lead": { letters: ["A"], note: "Solo excepciones tras segundo intento" },
      Client: { letters: ["R"], note: "Habilita disponibilidad" },
    },
  },
  {
    stage: "AI_CERTS",
    label: "AI CERTs",
    cells: {
      "Professional / Kiber": { letters: ["R"], note: "Mantiene avance" },
      "IT Academy": { letters: ["R"], note: "Enrolamiento, activación de cuenta, asignación de profesor" },
      Professor: { letters: ["R"], note: "Acompañamiento docente" },
      Delivery: { letters: ["R"], note: "Seguimiento, criticidades, recovery" },
      "Product Lead": { letters: ["A"], note: "Solo excepciones tras segundo intento" },
      Client: { letters: ["I"], note: "Recibe inicio, progreso, riesgo, resultado" },
    },
  },
  {
    stage: "AI_LAB",
    label: "AI Lab",
    cells: {
      "Professional / Kiber": { letters: ["R"] },
      "Hub AI": { letters: ["R"], note: "Lidera AI Lab" },
      Delivery: { letters: ["R"], note: "Verifica gate y coordina sesiones" },
      Client: { letters: ["C"], note: "Valida problema y entrega contexto" },
    },
  },
  {
    stage: "SHOWCASE",
    label: "Showcase",
    cells: {
      "Professional / Kiber": { letters: ["R"], note: "Presenta" },
      Client: { letters: ["R"], note: "Toma la decisión de continuidad" },
      Delivery: { letters: ["R"], note: "Confirma READY y coordina agenda" },
    },
  },
  {
    stage: "CLOSURE",
    label: "Cierre",
    cells: {
      Delivery: { letters: ["R"], note: "Comunica cierre y asegura acciones con owner" },
      "Professional / Kiber": { letters: ["R"], note: "Cierra formalmente su proceso" },
      Client: { letters: ["I"], note: "Recibe resultado y próximos pasos" },
    },
  },
];
