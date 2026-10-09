import { describe, expect, it } from "vitest";
import * as S from "@/lib/store/state";
import { canTransition, toClientVisible } from "@/lib/domain/admission";
import { presentCommitment, acceptCommitment } from "@/lib/domain/acceptance";
import { getDocument } from "@/lib/content";

function ctxAt(iso: string): S.Ctx {
  let n = 0;
  return { now: () => iso, id: (p) => `${p}-${++n}` };
}
const BEFORE_DEADLINE = "2026-10-10T10:00:00-03:00";
const AFTER_DEADLINE = "2026-10-16T12:00:01-03:00";
const ACK_IDS = getDocument("PRE_APPLICATION_ACK", "ACK-W3-1.0")!.confirmations.map((c) => c.id);

function applyAndSelect() {
  const ctx = ctxAt(BEFORE_DEADLINE);
  let s = S.initialState();
  const r = S.identify(s, { waveId: "wave-3", participantName: "Ana Prueba", corporateEmail: "ana@kibernum.example", client: "Cliente Demo Alfa", role: "QA" }, ctx);
  s = r.state;
  const id = r.applicationId;
  s = S.acknowledge(s, id, ACK_IDS, ctx);
  s = S.submitApplication(s, id, "typeform-embed", ctx);
  s = S.setRole(s, "PRODUCT_LEAD");
  s = S.recordOutcome(s, id, "SELECTED", {}, ctx);
  return { s, id, ctx };
}

describe("flujo de admisión", () => {
  it("postular → seleccionado → compromiso → inscrito, con eventos separados", () => {
    let { s, id, ctx } = applyAndSelect();
    expect(S.getApp(s, id).applicationStatus).toBe("SELECTED");
    s = S.presentCommitmentFor(s, id, ctx);
    expect(S.getApp(s, id).applicationStatus).toBe("CONDITIONS_PENDING");
    s = S.acceptCommitmentFor(s, id, { checked: true, fullName: "Ana Prueba" }, ctx);
    expect(S.getApp(s, id).applicationStatus).toBe("ENROLLED");
    const tos = s.events.filter((e) => e.applicationId === id).map((e) => e.to);
    expect(tos).toEqual(["IDENTIFIED", "APPLICATION_STARTED", "APPLICATION_SUBMITTED", "ASSESSMENT_EVALUATED", "SELECTED", "CONDITIONS_PENDING", "CONDITIONS_ACCEPTED", "ENROLLED"]);
    const rec = S.currentCommitment(s, id)!;
    expect(rec).toMatchObject({ status: "ACCEPTED", documentVersion: "CC-W3-0.1-BORRADOR", conditionsVersion: "COND-W3-0.1-BORRADOR", acceptedBy: "Ana Prueba" });
  });

  it("ENROLLED no es alcanzable sin aceptar el compromiso", () => {
    expect(canTransition("SELECTED", "ENROLLED")).toBe(false);
    expect(canTransition("CONDITIONS_PENDING", "ENROLLED")).toBe(false);
    expect(canTransition("CONDITIONS_ACCEPTED", "ENROLLED")).toBe(true);
  });

  it("no habilita Assessment sin todas las confirmaciones individuales", () => {
    const ctx = ctxAt(BEFORE_DEADLINE);
    const r = S.identify(S.initialState(), { waveId: "wave-3", participantName: "Bea", corporateEmail: "bea@kibernum.example", client: "X", role: "Dev" }, ctx);
    expect(() => S.acknowledge(r.state, r.applicationId, ACK_IDS.slice(1), ctx)).toThrow();
    expect(() => S.submitApplication(r.state, r.applicationId, "manual-confirmation", ctx)).toThrow();
  });

  it("rechaza postulaciones después del deadline de Wave 3", () => {
    expect(() =>
      S.identify(S.initialState(), { waveId: "wave-3", participantName: "Tarde", corporateEmail: "t@kibernum.example", client: "X", role: "Dev" }, ctxAt(AFTER_DEADLINE)),
    ).toThrow(/plazo/);
  });

  it("compromiso exige checkbox explícito y nombre", () => {
    let { s, id, ctx } = applyAndSelect();
    s = S.presentCommitmentFor(s, id, ctx);
    expect(() => S.acceptCommitmentFor(s, id, { checked: false, fullName: "Ana Prueba" }, ctx)).toThrow();
    expect(() => S.acceptCommitmentFor(s, id, { checked: true, fullName: " " }, ctx)).toThrow();
  });

  it("la Carta de Compromiso no se presenta a quien no fue seleccionado", () => {
    const ctx = ctxAt(BEFORE_DEADLINE);
    let s = S.setRole(S.initialState(), "PRODUCT_LEAD");
    s = S.recordOutcome(s, "app-102", "NOT_SELECTED", {}, ctx);
    expect(() => S.presentCommitmentFor(s, "app-102", ctx)).toThrow();
  });
});

describe("versionado del compromiso", () => {
  it("una nueva versión marca SUPERSEDED la anterior sin sobreescribirla", () => {
    const doc = getDocument("COMMITMENT_LETTER", "CC-W3-0.1-BORRADOR")!;
    const base = { participantId: "p1", waveId: "wave-3", conditionsVersion: "C1" };
    const first = presentCommitment([], { ...base, document: doc, now: "2026-10-10T10:00:00Z", newId: "c1" });
    const accepted = acceptCommitment(first.current, { checked: true, fullName: "Persona Uno", currentDocumentVersion: doc.version, currentConditionsVersion: "C1", now: "2026-10-10T11:00:00Z" });
    const records = [accepted];
    const v2 = { ...doc, version: "CC-W3-0.2" };
    const second = presentCommitment(records, { ...base, document: v2, now: "2026-10-12T10:00:00Z", newId: "c2" });
    expect(second.records).toHaveLength(2);
    const old = second.records.find((r) => r.id === "c1")!;
    expect(old).toMatchObject({ status: "SUPERSEDED", documentVersion: doc.version, acceptedBy: "Persona Uno", acceptedAt: "2026-10-10T11:00:00Z", supersededBy: "c2" });
    expect(second.current).toMatchObject({ status: "PENDING", documentVersion: "CC-W3-0.2" });
  });

  it("no permite aceptar una versión que ya no es la vigente", () => {
    const doc = getDocument("COMMITMENT_LETTER", "CC-W3-0.1-BORRADOR")!;
    const { current } = presentCommitment([], { participantId: "p", waveId: "w", conditionsVersion: "C1", document: doc, now: "2026-10-10T10:00:00Z", newId: "c" });
    expect(() => acceptCommitment(current, { checked: true, fullName: "Nombre", currentDocumentVersion: "CC-OTRA", currentConditionsVersion: "C1", now: "2026-10-10T10:05:00Z" })).toThrow();
  });
});

describe("readiness y permisos", () => {
  it("solo Product Lead declara WAVE READY y solo con checklist completo", () => {
    let s = S.setRole(S.initialState(), "DELIVERY");
    expect(() => S.declareReady(s, "wave-4")).toThrow(/Product Lead/);
    s = S.setRole(s, "PRODUCT_LEAD");
    expect(() => S.declareReady(s, "wave-4")).toThrow(/pendientes/);
  });

  it("no se nomina en una Wave sin WAVE READY", () => {
    const s = S.setRole(S.initialState(), "CLIENT");
    const n = { waveId: "wave-4", clientId: "c", nomineeName: "N", nomineeEmail: "n@x.cl", role: "Dev", reason: "r", applicationOpportunity: "o", estimatedAvailability: "2h" };
    expect(() => S.createNomination(s, n, ctxAt(BEFORE_DEADLINE))).toThrow(/WAVE READY/);
    expect(() => S.createNomination(s, { ...n, waveId: "wave-3" }, ctxAt(BEFORE_DEADLINE))).not.toThrow();
  });

  it("el cliente nunca ve detalle de evaluación", () => {
    expect(toClientVisible("RESCUE_REQUIRED")).toBe("RESCATE");
    expect(toClientVisible("ASSESSMENT_EVALUATED")).toBe("POSTULACION_COMPLETADA");
    expect(toClientVisible("HUMAN_REVIEW")).toBe("POSTULACION_COMPLETADA");
  });

  it("el outbox de Monday no transporta la evaluación detallada", () => {
    const { s } = applyAndSelect();
    for (const e of s.outbox) expect(e.payload).not.toHaveProperty("evaluation");
  });
});

describe("salud de Wave", () => {
  it("no declara saludable una Wave en preparación sin datos", async () => {
    const { waveHealth } = await import("@/lib/domain/wave");
    const s = S.initialState();
    expect(waveHealth(S.getWave(s, "wave-4"), [])).toBe("UNKNOWN");
    expect(waveHealth(S.getWave(s, "wave-3"), [])).toBe("GREEN");
  });
});
