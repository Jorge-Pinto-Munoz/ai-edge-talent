import type { ApplicationRecord } from "@/lib/domain/types";

/**
 * Adaptador de sincronización operacional.
 *
 * Monday es (o será) la fuente operacional de verdad. AET Platform NO debe convertirse
 * en una segunda verdad permanente: cada cambio de ApplicationRecord se encola en un
 * outbox para sincronizarse cuando exista la integración real. Mientras tanto, el
 * adaptador por defecto solo deja el registro pendiente.
 */
export interface OutboxEntry {
  id: string;
  applicationId: string;
  op: "UPSERT_APPLICATION";
  payload: Pick<ApplicationRecord, "id" | "waveId" | "participantName" | "corporateEmail" | "client" | "role" | "applicationStatus" | "updatedAt">;
  enqueuedAt: string;
  syncedAt: string | null;
}

export interface OperationalSyncAdapter {
  name: string;
  push(entries: OutboxEntry[]): Promise<{ syncedIds: string[] }>;
}

/** Adaptador nulo: no sincroniza nada (no hay integración configurada). */
export const NoopSyncAdapter: OperationalSyncAdapter = {
  name: "noop (Monday no configurado)",
  async push() {
    return { syncedIds: [] };
  },
};

export function toOutboxEntry(app: ApplicationRecord, id: string, now: string): OutboxEntry {
  return {
    id,
    applicationId: app.id,
    op: "UPSERT_APPLICATION",
    // Solo campos operacionales: la evaluación detallada no viaja en este payload.
    payload: {
      id: app.id,
      waveId: app.waveId,
      participantName: app.participantName,
      corporateEmail: app.corporateEmail,
      client: app.client,
      role: app.role,
      applicationStatus: app.applicationStatus,
      updatedAt: app.updatedAt,
    },
    enqueuedAt: now,
    syncedAt: null,
  };
}
