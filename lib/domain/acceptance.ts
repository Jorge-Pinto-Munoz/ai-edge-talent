import type { AcknowledgementRecord, CommitmentAcceptance, VersionedDocument } from "./types";

export class AcceptanceError extends Error {}

/**
 * Presenta (o re-presenta) la Carta de Compromiso vigente.
 * - Si ya existe un registro para la misma versión, se reutiliza.
 * - Si existe un registro de una versión anterior PENDING/ACCEPTED, se marca SUPERSEDED
 *   y se crea uno nuevo. El registro anterior NO se sobreescribe: se conserva con su versión.
 * Devuelve la lista completa actualizada (append-only salvo el cambio de estado a SUPERSEDED).
 */
export function presentCommitment(
  records: CommitmentAcceptance[],
  input: { participantId: string; waveId: string; document: VersionedDocument; conditionsVersion: string; now: string; newId: string },
): { records: CommitmentAcceptance[]; current: CommitmentAcceptance } {
  const mine = records.filter((r) => r.participantId === input.participantId && r.waveId === input.waveId);
  const sameVersion = mine.find(
    (r) =>
      r.documentVersion === input.document.version &&
      r.conditionsVersion === input.conditionsVersion &&
      r.status !== "SUPERSEDED",
  );
  if (sameVersion) return { records, current: sameVersion };

  const current: CommitmentAcceptance = {
    id: input.newId,
    participantId: input.participantId,
    waveId: input.waveId,
    documentVersion: input.document.version,
    conditionsVersion: input.conditionsVersion,
    acceptedAt: null,
    acceptedBy: null,
    status: "PENDING",
    presentedAt: input.now,
  };

  const updated = records.map((r) =>
    mine.includes(r) && (r.status === "PENDING" || r.status === "ACCEPTED")
      ? { ...r, status: "SUPERSEDED" as const, supersededBy: current.id }
      : r,
  );
  return { records: [...updated, current], current };
}

/**
 * Acepta la Carta de Compromiso.
 * - Requiere checkbox explícito (nunca preseleccionado) y nombre completo.
 * - acceptedAt lo fija el sistema en el momento: no se acepta fecha provista (sin aceptación retroactiva).
 * - Solo se puede aceptar un registro PENDING de la versión vigente.
 */
export function acceptCommitment(
  record: CommitmentAcceptance,
  input: { checked: boolean; fullName: string; currentDocumentVersion: string; currentConditionsVersion: string; now: string },
): CommitmentAcceptance {
  if (record.status !== "PENDING") {
    throw new AcceptanceError(`El compromiso no está pendiente (estado: ${record.status}).`);
  }
  if (
    record.documentVersion !== input.currentDocumentVersion ||
    record.conditionsVersion !== input.currentConditionsVersion
  ) {
    throw new AcceptanceError("La versión presentada ya no es la vigente. Debe revisarse la nueva versión.");
  }
  if (!input.checked) throw new AcceptanceError("Debes marcar explícitamente la confirmación.");
  const name = input.fullName.trim();
  if (name.length < 3) throw new AcceptanceError("Debes escribir tu nombre completo.");
  if (Date.parse(input.now) < Date.parse(record.presentedAt)) {
    throw new AcceptanceError("La fecha de aceptación no puede ser anterior a la presentación del documento.");
  }
  return { ...record, status: "ACCEPTED", acceptedAt: input.now, acceptedBy: name };
}

export function declineCommitment(record: CommitmentAcceptance, now: string): CommitmentAcceptance {
  if (record.status !== "PENDING") throw new AcceptanceError("Solo se puede rechazar un compromiso pendiente.");
  return { ...record, status: "DECLINED", acceptedAt: null, acceptedBy: null, sessionMetadata: { declinedAt: now } };
}

/** Registro de confirmación informada previa a postular (NO es la Carta de Compromiso). */
export function createAcknowledgement(input: {
  id: string;
  participantId: string;
  waveId: string;
  document: VersionedDocument;
  checkedIds: string[];
  now: string;
}): AcknowledgementRecord {
  const required = input.document.confirmations.map((c) => c.id);
  const missing = required.filter((id) => !input.checkedIds.includes(id));
  if (missing.length > 0) {
    throw new AcceptanceError(`Faltan ${missing.length} confirmaciones.`);
  }
  return {
    id: input.id,
    participantId: input.participantId,
    waveId: input.waveId,
    acknowledgementVersion: input.document.version,
    confirmedItems: required,
    acceptedAt: input.now,
    status: "ACCEPTED",
  };
}
