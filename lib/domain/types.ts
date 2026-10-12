/**
 * Modelo de dominio AET Platform.
 *
 * Tres ejes que NO se mezclan:
 *  - WaveStatus        → ciclo de vida de una Wave (operación del programa).
 *  - AdmissionStatus   → admisión individual (comercial / administrativo / evaluación de ingreso).
 *  - JourneyStage      → journey pedagógico oficial, solo existe tras ENROLLED.
 */

export type Role =
  | "KIBER"
  | "CLIENT"
  | "DELIVERY"
  | "PRODUCT_LEAD"
  | "WAVE_LEAD"
  | "ADMIN";

export const ROLE_LABEL: Record<Role, string> = {
  KIBER: "Profesional / Kiber",
  CLIENT: "Cliente",
  DELIVERY: "Delivery",
  PRODUCT_LEAD: "Product Lead",
  WAVE_LEAD: "Wave Lead",
  ADMIN: "Admin",
};

/* ───────────── Wave ───────────── */

export type WaveType = "REGULAR" | "SPECIAL_EDITION" | "PILOT";

export type WaveStatus =
  | "DRAFT"
  | "PREPARING"
  | "OPEN_FOR_NOMINATION"
  | "ASSESSMENT"
  | "ACTIVE"
  | "LAB_SHOWCASE"
  | "CLOSING"
  | "CLOSED";

export const WAVE_STATUS_ORDER: WaveStatus[] = [
  "DRAFT",
  "PREPARING",
  "OPEN_FOR_NOMINATION",
  "ASSESSMENT",
  "ACTIVE",
  "LAB_SHOWCASE",
  "CLOSING",
  "CLOSED",
];

export const WAVE_STATUS_LABEL: Record<WaveStatus, string> = {
  DRAFT: "Borrador",
  PREPARING: "En preparación",
  OPEN_FOR_NOMINATION: "Abierta a nominación",
  ASSESSMENT: "Postulación / Assessment",
  ACTIVE: "Activa",
  LAB_SHOWCASE: "AI Lab / Showcase",
  CLOSING: "En cierre",
  CLOSED: "Cerrada",
};

export type Health = "GREEN" | "AMBER" | "RED" | "UNKNOWN";

export type ReadinessItemStatus = "OK" | "PENDING" | "NOT_APPLICABLE";
export type ReadinessCategory = "PRODUCT" | "ACTORS" | "OPERATION" | "CLIENT";

export interface ReadinessItem {
  id: string;
  category: ReadinessCategory;
  label: string;
  /** Si es "cuando corresponda" (p.ej. BP), puede marcarse NOT_APPLICABLE. */
  optional?: boolean;
}

export interface ReadinessState {
  items: Record<string, { status: ReadinessItemStatus; note?: string; updatedAt?: string; updatedBy?: string }>;
  /** Solo Product Lead puede declarar WAVE READY. */
  declaredReadyAt?: string;
  declaredReadyBy?: string;
}

export interface WaveClient {
  id: string;
  name: string;
  sponsor?: string;
  /** Fase del Client Journey (0–9) en la que se encuentra este cliente. */
  clientPhase: number;
  onboardingConfirmedAt?: string;
}

export interface Wave {
  id: string;
  slug: string;
  name: string;
  type: WaveType;
  status: WaveStatus;
  isReferenceWave?: boolean;
  /** Fechas ISO. null = sin dato cargado (no se inventa). */
  preparationDate: string | null;
  applicationDeadline: string | null;
  startDate: string | null;
  estimatedCloseDate: string | null;
  closedAt: string | null;
  clients: WaveClient[];
  deliveryOwners: string[];
  productLead: string | null;
  waveLead: string | null;
  /** Versiones de reglas y documentos aplicables a esta Wave (no se mezclan reglas históricas). */
  rules: {
    rulesVersion: string;
    conditionsVersion: string | null;
    commitmentDocumentVersion: string | null;
    acknowledgementVersion: string | null;
  };
  targetCohortSize: number | null;
  assessmentUrl: string | null;
  channels: { label: string; value: string | null }[];
  closure: { summary: string | null; closedBy: string | null };
}

/* ───────────── Admisión ───────────── */

export type AdmissionStatus =
  | "NOMINATED"
  | "INVITED"
  | "IDENTIFIED"
  | "APPLICATION_STARTED"
  | "APPLICATION_SUBMITTED"
  | "ASSESSMENT_EVALUATED"
  | "HUMAN_REVIEW"
  | "RESCUE_REQUIRED"
  | "NOT_SELECTED"
  | "SELECTED"
  | "CONDITIONS_PENDING"
  | "CONDITIONS_ACCEPTED"
  | "ENROLLED"
  | "MINDSET_READY";

export const ADMISSION_LABEL: Record<AdmissionStatus, string> = {
  NOMINATED: "Nominado/a",
  INVITED: "Invitado/a a postular",
  IDENTIFIED: "Identificado/a",
  APPLICATION_STARTED: "Postulación iniciada",
  APPLICATION_SUBMITTED: "Postulación enviada",
  ASSESSMENT_EVALUATED: "Assessment evaluado",
  HUMAN_REVIEW: "En revisión humana",
  RESCUE_REQUIRED: "Video de rescate solicitado",
  NOT_SELECTED: "No seleccionado/a",
  SELECTED: "Seleccionado/a",
  CONDITIONS_PENDING: "Compromiso pendiente",
  CONDITIONS_ACCEPTED: "Compromiso aceptado",
  ENROLLED: "Inscrito/a",
  MINDSET_READY: "Listo/a para Mindset",
};

export type AssessmentOutcome = "SELECTED" | "RESCUE_REQUIRED" | "NOT_SELECTED" | "HUMAN_REVIEW";

export interface Nomination {
  id: string;
  waveId: string;
  clientId: string;
  nomineeName: string;
  nomineeEmail: string;
  role: string;
  team?: string;
  reason: string;
  applicationOpportunity: string;
  estimatedAvailability: string;
  nominatedBy: string;
  nominatedAt: string;
  status: "NOMINATED" | "UNDER_REVIEW" | "INVITED" | "DISCARDED";
  reviewedBy?: string;
  reviewNote?: string;
  invitationToken?: string;
  invitedAt?: string;
}

export interface ApplicationRecord {
  id: string;
  waveId: string;
  nominationId?: string;
  participantName: string;
  corporateEmail: string;
  client: string;
  role: string;
  team?: string;
  deliveryOwner?: string;
  applicationStatus: AdmissionStatus;
  /** Detalle interno de evaluación: NUNCA se proyecta al cliente. */
  evaluation?: {
    outcome: AssessmentOutcome;
    scores?: Record<string, number>;
    total?: number;
    evaluatedBy: string;
    evaluatedAt: string;
    note?: string;
  };
  /** Etapa pedagógica: solo tras ENROLLED. */
  journeyStage: JourneyStageId | null;
  onboardingCompletedAt?: string;
  /** Sincronización futura con Monday (fuente operacional). */
  externalRefs?: { mondayItemId?: string; syncedAt?: string };
  createdAt: string;
  updatedAt: string;
}

export interface AdmissionEvent {
  id: string;
  applicationId: string;
  waveId: string;
  from: AdmissionStatus | null;
  to: AdmissionStatus;
  at: string;
  by: string;
  note?: string;
}

/* ───────────── Documentos y aceptaciones ───────────── */

export type AcceptanceStatus =
  | "NOT_PRESENTED"
  | "PENDING"
  | "ACCEPTED"
  | "DECLINED"
  | "EXPIRED"
  | "SUPERSEDED";

export type DocumentKind = "PRE_APPLICATION_ACK" | "COMMITMENT_LETTER" | "CONDITIONS";

export interface VersionedDocument {
  id: string;
  kind: DocumentKind;
  version: string;
  /** Si la Wave aplica a todas, waveId = "*". */
  waveId: string;
  approvalStatus: "DRAFT" | "APPROVED";
  draftNotice?: string;
  title: string;
  descriptor?: string;
  sections: { heading: string; body?: string; bullets?: string[] }[];
  /** Confirmaciones explícitas, cada una un checkbox independiente. */
  confirmations: { id: string; text: string }[];
  cta: string;
  requiresFullName?: boolean;
}

export interface AcknowledgementRecord {
  id: string;
  participantId: string; // applicationId
  waveId: string;
  acknowledgementVersion: string;
  confirmedItems: string[];
  acceptedAt: string;
  status: AcceptanceStatus;
}

export interface CommitmentAcceptance {
  id: string;
  participantId: string; // applicationId
  waveId: string;
  documentVersion: string;
  conditionsVersion: string;
  acceptedAt: string | null;
  acceptedBy: string | null;
  status: AcceptanceStatus;
  presentedAt: string;
  supersededBy?: string;
  /** Metadata de sesión: deshabilitada por defecto hasta validar regulación aplicable. */
  sessionMetadata?: Record<string, string>;
}

/* ───────────── Journey pedagógico ───────────── */

export type JourneyStageId =
  | "MINDSET"
  | "AI_CERTS"
  | "AI_LAB"
  | "SHOWCASE"
  | "CLOSURE"
  | "PILOT_ADOPTION";
