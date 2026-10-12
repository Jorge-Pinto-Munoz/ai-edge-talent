import type {
  ApplicationRecord,
  Health,
  JourneyStageId,
  ReadinessItem,
  ReadinessState,
  Role,
  Wave,
} from "./types";
import { ADMISSION_LABEL } from "./types";
import { isEnrolled } from "./admission";

export class ReadinessError extends Error {}

export function readinessSummary(items: ReadinessItem[], state: ReadinessState) {
  const statusOf = (id: string) => state.items[id]?.status ?? "PENDING";
  const blocking = items.filter((i) => {
    const s = statusOf(i.id);
    if (s === "OK") return false;
    if (s === "NOT_APPLICABLE" && i.optional) return false;
    return true;
  });
  const done = items.length - blocking.length;
  return {
    total: items.length,
    done,
    pct: items.length === 0 ? 0 : Math.round((done / items.length) * 100),
    blocking,
    isComplete: blocking.length === 0,
    declared: Boolean(state.declaredReadyAt),
  };
}

/** Solo Product Lead puede declarar WAVE READY, y solo con el checklist completo. */
export function declareWaveReady(
  role: Role,
  actor: string,
  items: ReadinessItem[],
  state: ReadinessState,
  now: string,
): ReadinessState {
  if (role !== "PRODUCT_LEAD") {
    throw new ReadinessError("Solo Product Lead puede declarar WAVE READY.");
  }
  const s = readinessSummary(items, state);
  if (!s.isComplete) {
    throw new ReadinessError(`Quedan ${s.blocking.length} ítems pendientes en el checklist.`);
  }
  return { ...state, declaredReadyAt: now, declaredReadyBy: actor };
}

/** Las nominaciones solo se habilitan con WAVE READY declarado y la Wave en etapa de nominación/postulación. */
export function nominationsOpen(wave: Wave, state: ReadinessState, now: string): { open: boolean; reason?: string } {
  if (!state.declaredReadyAt) return { open: false, reason: "La Wave aún no ha sido declarada WAVE READY por Product Lead." };
  if (wave.status !== "OPEN_FOR_NOMINATION" && wave.status !== "ASSESSMENT") {
    return { open: false, reason: "La Wave no está en etapa de nominación." };
  }
  if (wave.applicationDeadline && Date.parse(now) > Date.parse(wave.applicationDeadline)) {
    return { open: false, reason: "El plazo de postulación ya cerró." };
  }
  return { open: true };
}

export function applicationsOpen(wave: Wave, now: string): { open: boolean; reason?: string } {
  if (wave.status !== "OPEN_FOR_NOMINATION" && wave.status !== "ASSESSMENT") {
    return { open: false, reason: "Esta Wave no está recibiendo postulaciones." };
  }
  if (wave.applicationDeadline && Date.parse(now) > Date.parse(wave.applicationDeadline)) {
    return { open: false, reason: "El plazo de postulación cerró." };
  }
  return { open: true };
}

/** Etapa predominante: la etapa pedagógica más frecuente entre inscritos, o el estado de admisión más frecuente. */
export function predominantStage(apps: ApplicationRecord[], stageLabel: (s: JourneyStageId) => string): string {
  if (apps.length === 0) return "Sin participantes";
  const counts = new Map<string, number>();
  for (const a of apps) {
    const key =
      isEnrolled(a.applicationStatus) && a.journeyStage
        ? stageLabel(a.journeyStage)
        : `Admisión · ${ADMISSION_LABEL[a.applicationStatus]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/** Calidad de datos: campos de la Wave que no tienen dato cargado. */
export function dataQuality(wave: Wave): { pct: number; missing: string[] } {
  const checks: [string, unknown][] = [
    ["Fecha de preparación", wave.preparationDate],
    ["Fecha de inicio", wave.startDate],
    ["Fecha estimada de cierre", wave.estimatedCloseDate],
    ["Product Lead", wave.productLead],
    ["Wave Lead", wave.waveLead],
    ["Delivery owners", wave.deliveryOwners.length ? 1 : null],
    ["Clientes", wave.clients.length ? 1 : null],
    ["Cohort size objetivo", wave.targetCohortSize],
    ["Versión de condiciones", wave.rules.conditionsVersion],
    ["Versión de compromiso", wave.rules.commitmentDocumentVersion],
  ];
  const missing = checks.filter(([, v]) => v === null || v === undefined).map(([k]) => k);
  return { pct: Math.round(((checks.length - missing.length) / checks.length) * 100), missing };
}

export function waveRisks(wave: Wave, apps: ApplicationRecord[], state: ReadinessState, now: string): string[] {
  const risks: string[] = [];
  const s = state;
  if (["OPEN_FOR_NOMINATION", "ASSESSMENT", "ACTIVE"].includes(wave.status) && !s.declaredReadyAt) {
    risks.push("Wave operando sin WAVE READY declarado");
  }
  if (wave.status === "ASSESSMENT" && wave.applicationDeadline) {
    const hoursLeft = (Date.parse(wave.applicationDeadline) - Date.parse(now)) / 36e5;
    const pending = apps.filter((a) => ["INVITED", "IDENTIFIED", "APPLICATION_STARTED"].includes(a.applicationStatus)).length;
    if (hoursLeft > 0 && hoursLeft < 24 * 7 && pending > 0) {
      risks.push(`${pending} postulación(es) sin enviar a menos de 7 días del deadline`);
    }
  }
  const pendingCommit = apps.filter((a) => a.applicationStatus === "CONDITIONS_PENDING" || a.applicationStatus === "SELECTED").length;
  if (pendingCommit > 0) risks.push(`${pendingCommit} seleccionado(s) aún sin compromiso aceptado`);
  if (wave.targetCohortSize && ["ASSESSMENT", "ACTIVE"].includes(wave.status)) {
    const pipeline = apps.filter((a) => a.applicationStatus !== "NOT_SELECTED").length;
    if (pipeline < wave.targetCohortSize) risks.push(`Pipeline (${pipeline}) bajo el cohort objetivo (${wave.targetCohortSize})`);
  }
  return risks;
}

export function waveHealth(wave: Wave, risks: string[]): Health {
  // Sin operación en curso no hay salud que medir (no se infiere "saludable" por ausencia de datos).
  if (["CLOSED", "DRAFT", "PREPARING"].includes(wave.status) && risks.length === 0) return "UNKNOWN";
  if (risks.length === 0) return "GREEN";
  if (risks.length <= 2) return "AMBER";
  return "RED";
}
