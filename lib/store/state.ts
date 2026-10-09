import type {
  AcknowledgementRecord,
  AdmissionEvent,
  AdmissionStatus,
  ApplicationRecord,
  AssessmentOutcome,
  CommitmentAcceptance,
  Nomination,
  ReadinessItemStatus,
  ReadinessState,
  Role,
  Wave,
  WaveStatus,
} from "@/lib/domain/types";
import { assertTransition, outcomePath } from "@/lib/domain/admission";
import { acceptCommitment, createAcknowledgement, declineCommitment, presentCommitment } from "@/lib/domain/acceptance";
import { applicationsOpen, declareWaveReady, nominationsOpen } from "@/lib/domain/wave";
import { documentsForWave } from "@/lib/content";
import { READINESS_ITEMS, SEED_READINESS } from "@/lib/data/readiness";
import { SEED_WAVES } from "@/lib/data/waves";
import { SEED_APPLICATIONS, SEED_EVENTS, SEED_NOMINATIONS } from "@/lib/data/seed";
import { toOutboxEntry, type OutboxEntry } from "@/lib/integrations/monday";

export const STATE_VERSION = 1;

export interface AppState {
  version: number;
  session: { role: Role; actorName: string; currentApplicationId: string | null };
  waves: Wave[];
  readiness: Record<string, ReadinessState>;
  nominations: Nomination[];
  applications: ApplicationRecord[];
  events: AdmissionEvent[];
  acknowledgements: AcknowledgementRecord[];
  commitments: CommitmentAcceptance[];
  deliveryReadiness: Record<string, string[]>;
  clientOnboarding: Record<string, string>; // `${waveId}:${clientId}` → confirmedAt
  outbox: OutboxEntry[];
}

export function initialState(): AppState {
  return {
    version: STATE_VERSION,
    session: { role: "KIBER", actorName: "Usuario demo", currentApplicationId: null },
    waves: structuredClone(SEED_WAVES),
    readiness: structuredClone(SEED_READINESS),
    nominations: structuredClone(SEED_NOMINATIONS),
    applications: structuredClone(SEED_APPLICATIONS),
    events: structuredClone(SEED_EVENTS),
    acknowledgements: [],
    commitments: [],
    deliveryReadiness: {},
    clientOnboarding: {},
    outbox: [],
  };
}

export class ActionError extends Error {}

export interface Ctx {
  now: () => string;
  id: (prefix: string) => string;
}

export const defaultCtx: Ctx = {
  now: () => new Date().toISOString(),
  id: (prefix) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`,
};

/* ───────── helpers ───────── */

export function getWave(s: AppState, waveId: string): Wave {
  const w = s.waves.find((x) => x.id === waveId);
  if (!w) throw new ActionError(`Wave no encontrada: ${waveId}`);
  return w;
}

export function getApp(s: AppState, appId: string): ApplicationRecord {
  const a = s.applications.find((x) => x.id === appId);
  if (!a) throw new ActionError(`Postulación no encontrada: ${appId}`);
  return a;
}

function transition(s: AppState, appId: string, to: AdmissionStatus, by: string, ctx: Ctx, note?: string): AppState {
  const app = getApp(s, appId);
  assertTransition(app.applicationStatus, to);
  const at = ctx.now();
  const updated: ApplicationRecord = {
    ...app,
    applicationStatus: to,
    updatedAt: at,
    journeyStage: to === "MINDSET_READY" ? "MINDSET" : app.journeyStage,
  };
  return {
    ...s,
    applications: s.applications.map((a) => (a.id === appId ? updated : a)),
    events: [...s.events, { id: ctx.id("evt"), applicationId: appId, waveId: app.waveId, from: app.applicationStatus, to, at, by, note }],
    outbox: [...s.outbox, toOutboxEntry(updated, ctx.id("obx"), at)],
  };
}

/* ───────── session ───────── */

export function setRole(s: AppState, role: Role): AppState {
  return { ...s, session: { ...s.session, role } };
}

export function setCurrentApplication(s: AppState, appId: string | null): AppState {
  return { ...s, session: { ...s.session, currentApplicationId: appId } };
}

/* ───────── waves ───────── */

export function createWave(s: AppState, input: { name: string; type: Wave["type"] }, ctx: Ctx = defaultCtx): AppState {
  if (!["ADMIN", "PRODUCT_LEAD"].includes(s.session.role)) throw new ActionError("Solo Admin o Product Lead crean Waves.");
  const id = ctx.id("wave");
  const wave: Wave = {
    id,
    slug: id,
    name: input.name,
    type: input.type,
    status: "DRAFT",
    preparationDate: null,
    applicationDeadline: null,
    startDate: null,
    estimatedCloseDate: null,
    closedAt: null,
    clients: [],
    deliveryOwners: [],
    productLead: null,
    waveLead: null,
    rules: { rulesVersion: "PENDIENTE DE DEFINICIÓN", conditionsVersion: null, commitmentDocumentVersion: null, acknowledgementVersion: null },
    targetCohortSize: null,
    assessmentUrl: null,
    channels: [],
    closure: { summary: null, closedBy: null },
  };
  return { ...s, waves: [...s.waves, wave], readiness: { ...s.readiness, [id]: { items: {} } } };
}

export function setWaveStatus(s: AppState, waveId: string, status: WaveStatus): AppState {
  if (!["ADMIN", "PRODUCT_LEAD"].includes(s.session.role)) throw new ActionError("Solo Admin o Product Lead cambian el estado de una Wave.");
  const r = s.readiness[waveId] ?? { items: {} };
  const needsReady: WaveStatus[] = ["OPEN_FOR_NOMINATION", "ASSESSMENT", "ACTIVE", "LAB_SHOWCASE"];
  if (needsReady.includes(status) && !r.declaredReadyAt) {
    throw new ActionError("Primero Product Lead debe declarar WAVE READY.");
  }
  return { ...s, waves: s.waves.map((w) => (w.id === waveId ? { ...w, status } : w)) };
}

export function updateReadinessItem(s: AppState, waveId: string, itemId: string, status: ReadinessItemStatus, ctx: Ctx = defaultCtx): AppState {
  if (!["ADMIN", "PRODUCT_LEAD", "WAVE_LEAD", "DELIVERY"].includes(s.session.role)) throw new ActionError("Tu rol no puede editar el checklist.");
  const r = s.readiness[waveId] ?? { items: {} };
  if (r.declaredReadyAt) throw new ActionError("La Wave ya fue declarada WAVE READY. Reabrir requiere a Product Lead.");
  const next: ReadinessState = {
    ...r,
    items: { ...r.items, [itemId]: { status, updatedAt: ctx.now(), updatedBy: s.session.actorName } },
  };
  return { ...s, readiness: { ...s.readiness, [waveId]: next } };
}

export function declareReady(s: AppState, waveId: string, ctx: Ctx = defaultCtx): AppState {
  const r = s.readiness[waveId] ?? { items: {} };
  const next = declareWaveReady(s.session.role, s.session.actorName, READINESS_ITEMS, r, ctx.now());
  return { ...s, readiness: { ...s.readiness, [waveId]: next } };
}

export function reopenReadiness(s: AppState, waveId: string): AppState {
  if (s.session.role !== "PRODUCT_LEAD") throw new ActionError("Solo Product Lead puede reabrir el readiness.");
  const r = s.readiness[waveId] ?? { items: {} };
  return { ...s, readiness: { ...s.readiness, [waveId]: { items: r.items } } };
}

/* ───────── nominación ───────── */

export function createNomination(
  s: AppState,
  input: Omit<Nomination, "id" | "nominatedAt" | "status" | "nominatedBy">,
  ctx: Ctx = defaultCtx,
): AppState {
  if (!["CLIENT", "DELIVERY"].includes(s.session.role)) throw new ActionError("Solo Cliente o Delivery nominan.");
  const wave = getWave(s, input.waveId);
  const gate = nominationsOpen(wave, s.readiness[wave.id] ?? { items: {} }, ctx.now());
  if (!gate.open) throw new ActionError(gate.reason);
  for (const k of ["nomineeName", "nomineeEmail", "role", "reason", "applicationOpportunity", "estimatedAvailability"] as const) {
    if (!String(input[k] ?? "").trim()) throw new ActionError("Completa los datos mínimos de la nominación.");
  }
  const n: Nomination = { ...input, id: ctx.id("nom"), nominatedAt: ctx.now(), nominatedBy: s.session.actorName, status: "NOMINATED" };
  return { ...s, nominations: [...s.nominations, n] };
}

export function reviewNomination(s: AppState, nominationId: string, decision: "INVITE" | "DISCARD", note: string, ctx: Ctx = defaultCtx): AppState {
  if (s.session.role !== "DELIVERY") throw new ActionError("Solo Delivery revisa nominaciones.");
  return {
    ...s,
    nominations: s.nominations.map((n) => {
      if (n.id !== nominationId) return n;
      if (n.status === "INVITED" || n.status === "DISCARDED") throw new ActionError("La nominación ya fue resuelta.");
      return decision === "INVITE"
        ? { ...n, status: "INVITED", reviewedBy: s.session.actorName, reviewNote: note, invitationToken: ctx.id("inv"), invitedAt: ctx.now() }
        : { ...n, status: "DISCARDED", reviewedBy: s.session.actorName, reviewNote: note };
    }),
  };
}

/* ───────── postulación ───────── */

export interface IdentificationInput {
  waveId: string;
  participantName: string;
  corporateEmail: string;
  client: string;
  role: string;
  team?: string;
  nominationId?: string;
}

export function identify(s: AppState, input: IdentificationInput, ctx: Ctx = defaultCtx): { state: AppState; applicationId: string } {
  const wave = getWave(s, input.waveId);
  const gate = applicationsOpen(wave, ctx.now());
  if (!gate.open) throw new ActionError(gate.reason);
  const email = input.corporateEmail.trim().toLowerCase();
  if (!input.participantName.trim() || !input.client.trim() || !input.role.trim()) throw new ActionError("Completa los campos obligatorios.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ActionError("Ingresa un correo corporativo válido.");

  // Reanudar postulación existente (mismo correo + Wave): no se duplican registros.
  const existing = s.applications.find((a) => a.waveId === wave.id && a.corporateEmail.toLowerCase() === email);
  if (existing) return { state: setCurrentApplication(s, existing.id), applicationId: existing.id };

  const nomination = input.nominationId ? s.nominations.find((n) => n.id === input.nominationId) : undefined;
  const clientDef = wave.clients.find((c) => c.name.toLowerCase() === input.client.trim().toLowerCase());
  const deliveryOwner = clientDef ? s.applications.find((a) => a.client === clientDef.name && a.deliveryOwner)?.deliveryOwner : undefined;

  const at = ctx.now();
  const id = ctx.id("app");
  const app: ApplicationRecord = {
    id,
    waveId: wave.id,
    nominationId: nomination?.id,
    participantName: input.participantName.trim(),
    corporateEmail: email,
    client: input.client.trim(),
    role: input.role.trim(),
    team: input.team?.trim() || undefined,
    deliveryOwner: deliveryOwner ?? nomination?.reviewedBy,
    applicationStatus: "IDENTIFIED",
    journeyStage: null,
    createdAt: at,
    updatedAt: at,
  };
  const events: AdmissionEvent[] = [];
  if (nomination) {
    events.push({ id: ctx.id("evt"), applicationId: id, waveId: wave.id, from: null, to: "NOMINATED", at: nomination.nominatedAt, by: nomination.nominatedBy, note: "Nominación del cliente" });
    if (nomination.invitedAt) events.push({ id: ctx.id("evt"), applicationId: id, waveId: wave.id, from: "NOMINATED", to: "INVITED", at: nomination.invitedAt, by: nomination.reviewedBy ?? "Delivery" });
  }
  events.push({ id: ctx.id("evt"), applicationId: id, waveId: wave.id, from: nomination ? "INVITED" : null, to: "IDENTIFIED", at, by: app.participantName });

  const state: AppState = {
    ...s,
    applications: [...s.applications, app],
    events: [...s.events, ...events],
    outbox: [...s.outbox, toOutboxEntry(app, ctx.id("obx"), at)],
    session: { ...s.session, currentApplicationId: id },
  };
  return { state, applicationId: id };
}

export function acknowledge(s: AppState, appId: string, checkedIds: string[], ctx: Ctx = defaultCtx): AppState {
  const app = getApp(s, appId);
  const doc = documentsForWave(getWave(s, app.waveId)).acknowledgement;
  if (!doc) throw new ActionError("Esta Wave no tiene confirmación previa configurada.");
  const rec = createAcknowledgement({ id: ctx.id("ack"), participantId: appId, waveId: app.waveId, document: doc, checkedIds, now: ctx.now() });
  const withAck = { ...s, acknowledgements: [...s.acknowledgements, rec] };
  return app.applicationStatus === "IDENTIFIED" ? transition(withAck, appId, "APPLICATION_STARTED", app.participantName, ctx) : withAck;
}

export function submitApplication(s: AppState, appId: string, source: "typeform-embed" | "manual-confirmation", ctx: Ctx = defaultCtx): AppState {
  const app = getApp(s, appId);
  if (app.applicationStatus === "IDENTIFIED") throw new ActionError("Falta la confirmación informada previa.");
  if (app.applicationStatus !== "APPLICATION_STARTED") return s; // idempotente: ya enviada
  if (!s.acknowledgements.some((a) => a.participantId === appId && a.status === "ACCEPTED")) {
    throw new ActionError("Falta la confirmación informada previa.");
  }
  return transition(s, appId, "APPLICATION_SUBMITTED", app.participantName, ctx, `Fuente: ${source}`);
}

/* ───────── evaluación ───────── */

export function recordOutcome(
  s: AppState,
  appId: string,
  outcome: AssessmentOutcome,
  input: { scores?: Record<string, number>; note?: string } = {},
  ctx: Ctx = defaultCtx,
): AppState {
  if (!["PRODUCT_LEAD", "DELIVERY", "ADMIN"].includes(s.session.role)) throw new ActionError("Tu rol no registra resultados.");
  const app = getApp(s, appId);
  const path = outcomePath(app.applicationStatus, outcome);
  let next = s;
  for (const to of path) next = transition(next, appId, to, s.session.actorName, ctx, input.note);
  const total = input.scores ? Object.values(input.scores).reduce((a, b) => a + b, 0) : undefined;
  return {
    ...next,
    applications: next.applications.map((a) =>
      a.id === appId ? { ...a, evaluation: { outcome, scores: input.scores, total, evaluatedBy: s.session.actorName, evaluatedAt: ctx.now(), note: input.note } } : a,
    ),
  };
}

/* ───────── compromiso e inscripción ───────── */

export function presentCommitmentFor(s: AppState, appId: string, ctx: Ctx = defaultCtx): AppState {
  const app = getApp(s, appId);
  const wave = getWave(s, app.waveId);
  const { commitment } = documentsForWave(wave);
  if (!commitment || !wave.rules.conditionsVersion) throw new ActionError("La Wave no tiene Carta de Compromiso configurada.");
  if (!["SELECTED", "CONDITIONS_PENDING"].includes(app.applicationStatus)) {
    throw new ActionError("La Carta de Compromiso solo se presenta a personas seleccionadas.");
  }
  const { records } = presentCommitment(s.commitments, {
    participantId: appId,
    waveId: wave.id,
    document: commitment,
    conditionsVersion: wave.rules.conditionsVersion,
    now: ctx.now(),
    newId: ctx.id("cmt"),
  });
  const withRec = { ...s, commitments: records };
  return app.applicationStatus === "SELECTED" ? transition(withRec, appId, "CONDITIONS_PENDING", "Sistema", ctx) : withRec;
}

export function currentCommitment(s: AppState, appId: string): CommitmentAcceptance | undefined {
  return [...s.commitments].reverse().find((c) => c.participantId === appId && c.status !== "SUPERSEDED");
}

export function acceptCommitmentFor(s: AppState, appId: string, input: { checked: boolean; fullName: string }, ctx: Ctx = defaultCtx): AppState {
  const app = getApp(s, appId);
  const wave = getWave(s, app.waveId);
  const rec = currentCommitment(s, appId);
  if (!rec) throw new ActionError("No hay un compromiso presentado.");
  const accepted = acceptCommitment(rec, {
    ...input,
    currentDocumentVersion: wave.rules.commitmentDocumentVersion ?? "",
    currentConditionsVersion: wave.rules.conditionsVersion ?? "",
    now: ctx.now(),
  });
  let next: AppState = { ...s, commitments: s.commitments.map((c) => (c.id === rec.id ? accepted : c)) };
  next = transition(next, appId, "CONDITIONS_ACCEPTED", accepted.acceptedBy!, ctx, `Compromiso ${accepted.documentVersion}`);
  next = transition(next, appId, "ENROLLED", "Sistema", ctx, "Inscripción tras aceptación de compromiso");
  return next;
}

export function declineCommitmentFor(s: AppState, appId: string, ctx: Ctx = defaultCtx): AppState {
  const rec = currentCommitment(s, appId);
  if (!rec) throw new ActionError("No hay un compromiso presentado.");
  const d = declineCommitment(rec, ctx.now());
  return { ...s, commitments: s.commitments.map((c) => (c.id === rec.id ? d : c)) };
}

export function completeOnboarding(s: AppState, appId: string, ctx: Ctx = defaultCtx): AppState {
  const app = getApp(s, appId);
  if (app.applicationStatus !== "ENROLLED") return s;
  const withFlag = { ...s, applications: s.applications.map((a) => (a.id === appId ? { ...a, onboardingCompletedAt: ctx.now() } : a)) };
  return transition(withFlag, appId, "MINDSET_READY", app.participantName, ctx, "Onboarding completado");
}

/* ───────── onboarding de actores ───────── */

export function confirmClientOnboarding(s: AppState, waveId: string, clientId: string, ctx: Ctx = defaultCtx): AppState {
  if (s.session.role !== "CLIENT") throw new ActionError("Solo el cliente confirma su onboarding.");
  return { ...s, clientOnboarding: { ...s.clientOnboarding, [`${waveId}:${clientId}`]: ctx.now() } };
}

export function toggleDeliveryReadiness(s: AppState, user: string, item: string): AppState {
  const cur = s.deliveryReadiness[user] ?? [];
  const next = cur.includes(item) ? cur.filter((x) => x !== item) : [...cur, item];
  return { ...s, deliveryReadiness: { ...s.deliveryReadiness, [user]: next } };
}
