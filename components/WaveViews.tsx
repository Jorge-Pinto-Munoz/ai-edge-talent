"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store/StoreProvider";
import {
  createWave,
  declareReady,

  recordOutcome,
  reopenReadiness,
  reviewNomination,
  setWaveStatus,
  updateReadinessItem,
} from "@/lib/store/state";
import { dataQuality, predominantStage, readinessSummary, waveHealth, waveRisks } from "@/lib/domain/wave";
import { ADMISSION_LABEL, WAVE_STATUS_LABEL, WAVE_STATUS_ORDER, type AssessmentOutcome, type ReadinessItemStatus, type Wave } from "@/lib/domain/types";
import { READINESS_CATEGORY_LABEL, READINESS_ITEMS } from "@/lib/data/readiness";
import { ASSESSMENT_DIMENSIONS, stageLabel } from "@/lib/data/journey";
import { Badge, Callout, HealthBadge, Progress, Val, admissionTone, fmtDate, fmtDay } from "./ui";

const TYPE_LABEL: Record<Wave["type"], string> = { REGULAR: "Regular", SPECIAL_EDITION: "Special Edition", PILOT: "Piloto" };

function useWaveMetrics(wave: Wave) {
  const { state } = useStore();
  const now = new Date().toISOString();
  const apps = state.applications.filter((a) => a.waveId === wave.id);
  const readiness = state.readiness[wave.id] ?? { items: {} };
  const rs = readinessSummary(READINESS_ITEMS, readiness);
  const risks = waveRisks(wave, apps, readiness, now);
  return { apps, readiness, rs, risks, health: waveHealth(wave, risks), dq: dataQuality(wave), predominant: predominantStage(apps, stageLabel) };
}

export function WavePortfolio({ basePath }: { basePath: string }) {
  const { state } = useStore();
  return (
    <div className="stack">
      <h1>Waves</h1>
      <p className="lead">Portfolio de Waves. Cada Wave conserva sus propias reglas y versiones: no se mezclan reglas históricas.</p>
      <div className="table-wrap" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>Wave</th>
              <th>Clientes</th>
              <th>Profesionales</th>
              <th>Estado</th>
              <th>Salud</th>
              <th>Etapa predominante</th>
              <th>Riesgos</th>
              <th>Fecha clave</th>
              <th>Readiness</th>
              <th>Cierre</th>
            </tr>
          </thead>
          <tbody>
            {state.waves.map((w) => (
              <PortfolioRow key={w.id} wave={w} href={`${basePath}/${w.id}`} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted">
        <small>Comparación entre Waves: preparada a nivel de modelo (rulesVersion por Wave); vista comparativa pendiente.</small>
      </p>
    </div>
  );
}

function PortfolioRow({ wave, href }: { wave: Wave; href: string }) {
  const m = useWaveMetrics(wave);
  const keyDate = wave.applicationDeadline ? `Deadline ${fmtDay(wave.applicationDeadline)}` : wave.startDate ? `Inicio ${fmtDay(wave.startDate)}` : null;
  return (
    <tr>
      <td>
        <Link href={href}>
          <strong>{wave.name.replace("AI Edge Talent · ", "")}</strong>
        </Link>
        {wave.isReferenceWave && (
          <>
            {" "}
            <Badge tone="brand">Reference</Badge>
          </>
        )}
        <br />
        <small className="muted">{TYPE_LABEL[wave.type]} · {wave.rules.rulesVersion}</small>
      </td>
      <td>{wave.clients.length || <span className="muted">—</span>}</td>
      <td>{m.apps.length || <span className="muted">—</span>}</td>
      <td>
        <Badge>{WAVE_STATUS_LABEL[wave.status]}</Badge>
      </td>
      <td>
        <HealthBadge h={m.health} />
      </td>
      <td>{m.apps.length ? m.predominant : <span className="muted">—</span>}</td>
      <td>{m.risks.length ? <ul style={{ margin: 0 }}>{m.risks.map((r) => <li key={r}><small>{r}</small></li>)}</ul> : <span className="muted">—</span>}</td>
      <td>
        <Val v={keyDate} />
      </td>
      <td>
        {m.rs.declared ? <Badge tone="ok">WAVE READY</Badge> : wave.status === "CLOSED" ? <span className="muted">Histórica</span> : <small>{m.rs.pct}%</small>}
      </td>
      <td>{wave.status === "CLOSED" ? <Badge>Cerrada</Badge> : <Val v={wave.estimatedCloseDate} fmt={fmtDay} />}</td>
    </tr>
  );
}

export function WaveDetail({ waveId, admin }: { waveId: string; admin?: boolean }) {
  const { state } = useStore();
  const wave = state.waves.find((w) => w.id === waveId);
  if (!wave) return <Callout tone="bad" title="Wave no encontrada" />;
  return <WaveDetailInner wave={wave} admin={admin} />;
}

function WaveDetailInner({ wave, admin }: { wave: Wave; admin?: boolean }) {
  const { state, run } = useStore();
  const m = useWaveMetrics(wave);
  const [err, setErr] = useState<string | null>(null);
  const role = state.session.role;
  const pendingSync = state.outbox.filter((o) => o.payload.waveId === wave.id && !o.syncedAt).length;

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <div className="eyebrow">{TYPE_LABEL[wave.type]}{wave.isReferenceWave ? " · Reference Wave" : ""}</div>
          <h1 style={{ marginBottom: 0 }}>{wave.name}</h1>
        </div>
        <div className="row">
          <Badge>{WAVE_STATUS_LABEL[wave.status]}</Badge>
          <HealthBadge h={m.health} />
          {m.rs.declared && <Badge tone="ok">WAVE READY</Badge>}
        </div>
      </div>
      {err && <p className="error" role="alert">{err}</p>}

      <div className="grid grid-3">
        <div className="card">
          <small className="muted">Readiness</small>
          <div className="kpi">{m.rs.pct}%</div>
          <Progress pct={m.rs.pct} />
        </div>
        <div className="card">
          <small className="muted">Data quality</small>
          <div className="kpi">{m.dq.pct}%</div>
          <small className="muted">{m.dq.missing.length ? `Sin dato: ${m.dq.missing.join(", ")}` : "Completa"}</small>
        </div>
        <div className="card">
          <small className="muted">Participantes</small>
          <div className="kpi">{m.apps.length}</div>
          <small className="muted">Cohort objetivo: <Val v={wave.targetCohortSize} /></small>
        </div>
      </div>

      <div className="card">
        <h3>Ficha de la Wave</h3>
        <div className="grid grid-3">
          <div><small className="muted">ID</small><div>{wave.id}</div></div>
          <div><small className="muted">Fecha de preparación</small><div><Val v={wave.preparationDate} fmt={fmtDay} /></div></div>
          <div><small className="muted">Deadline postulación</small><div><Val v={wave.applicationDeadline} fmt={fmtDate} /></div></div>
          <div><small className="muted">Inicio</small><div><Val v={wave.startDate} fmt={fmtDay} /></div></div>
          <div><small className="muted">Cierre estimado</small><div><Val v={wave.estimatedCloseDate} fmt={fmtDay} /></div></div>
          <div><small className="muted">Product Lead</small><div><Val v={wave.productLead} /></div></div>
          <div><small className="muted">Wave Lead</small><div><Val v={wave.waveLead} /></div></div>
          <div><small className="muted">Delivery owners</small><div><Val v={wave.deliveryOwners.join(", ")} /></div></div>
          <div><small className="muted">Clientes</small><div><Val v={wave.clients.map((c) => c.name).join(", ")} /></div></div>
          <div><small className="muted">Reglas</small><div>{wave.rules.rulesVersion}</div></div>
          <div><small className="muted">Condiciones / Compromiso</small><div><Val v={wave.rules.conditionsVersion} /> · <Val v={wave.rules.commitmentDocumentVersion} /></div></div>
          <div><small className="muted">Cierre</small><div><Val v={wave.closure.summary} /></div></div>
        </div>
        {m.risks.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Callout tone="warn" title="Riesgos">
              <ul style={{ margin: 0 }}>{m.risks.map((r) => <li key={r}>{r}</li>)}</ul>
            </Callout>
          </div>
        )}
        {admin && (
          <div className="row" style={{ marginTop: 12 }}>
            <label htmlFor="st" style={{ margin: 0 }}>Estado de la Wave:</label>
            <select id="st" value={wave.status} style={{ width: "auto" }} onChange={(e) => setErr(run((s) => setWaveStatus(s, wave.id, e.target.value as Wave["status"])))}>
              {WAVE_STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{WAVE_STATUS_LABEL[s]}</option>
              ))}
            </select>
            <small className="muted">El estado de la Wave es independiente de la etapa de cada profesional.</small>
          </div>
        )}
      </div>

      <ReadinessChecklist wave={wave} />
      {!admin && <NominationReview wave={wave} />}
      <ParticipantsTable wave={wave} canEvaluate={["PRODUCT_LEAD", "DELIVERY", "ADMIN"].includes(role)} />
      <p className="muted">
        <small>Sincronización operacional: {pendingSync} cambio(s) en outbox pendientes de enviar a Monday (integración no configurada).</small>
      </p>
    </div>
  );
}

export function ReadinessChecklist({ wave }: { wave: Wave }) {
  const { state, run } = useStore();
  const [err, setErr] = useState<string | null>(null);
  const r = state.readiness[wave.id] ?? { items: {} };
  const s = readinessSummary(READINESS_ITEMS, r);
  const role = state.session.role;
  const cats = Object.keys(READINESS_CATEGORY_LABEL) as (keyof typeof READINESS_CATEGORY_LABEL)[];
  return (
    <div className="card">
      <div className="spread">
        <h3 style={{ margin: 0 }}>Wave Readiness Checklist</h3>
        <span className="muted">{s.done}/{s.total}</span>
      </div>
      {s.declared ? (
        <div style={{ marginTop: 10 }}>
          <Callout tone="ok" title="WAVE READY">Declarado por {r.declaredReadyBy} el {fmtDate(r.declaredReadyAt!)}.</Callout>
        </div>
      ) : (
        <p className="muted">Antes de permitir nominaciones. Solo Product Lead puede declarar WAVE READY.</p>
      )}
      <div className="grid grid-2" style={{ marginTop: 10 }}>
        {cats.map((c) => (
          <div key={c}>
            <div className="eyebrow">{READINESS_CATEGORY_LABEL[c]}</div>
            {READINESS_ITEMS.filter((i) => i.category === c).map((i) => {
              const st = r.items[i.id]?.status ?? "PENDING";
              return (
                <div key={i.id} className="spread" style={{ padding: "4px 0", borderBottom: "1px solid var(--border)" }}>
                  <span>{i.label}</span>
                  <select
                    aria-label={i.label}
                    value={st}
                    disabled={s.declared}
                    style={{ width: "auto", padding: "3px 6px" }}
                    onChange={(e) => setErr(run((x) => updateReadinessItem(x, wave.id, i.id, e.target.value as ReadinessItemStatus)))}
                  >
                    <option value="PENDING">Pendiente</option>
                    <option value="OK">OK</option>
                    {i.optional && <option value="NOT_APPLICABLE">No aplica</option>}
                  </select>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      {err && <p className="error">{err}</p>}
      <div className="row" style={{ marginTop: 12 }}>
        {!s.declared && (
          <button className="btn" disabled={role !== "PRODUCT_LEAD" || !s.isComplete} onClick={() => setErr(run((x) => declareReady(x, wave.id)))}>
            Declarar WAVE READY
          </button>
        )}
        {s.declared && role === "PRODUCT_LEAD" && (
          <button className="btn ghost" onClick={() => setErr(run((x) => reopenReadiness(x, wave.id)))}>
            Reabrir checklist
          </button>
        )}
        {role !== "PRODUCT_LEAD" && <small className="muted">Requiere vista Product Lead.</small>}
        {role === "PRODUCT_LEAD" && !s.isComplete && !s.declared && <small className="muted">Faltan {s.blocking.length} ítems.</small>}
      </div>
    </div>
  );
}

function NominationReview({ wave }: { wave: Wave }) {
  const { state, run } = useStore();
  const [err, setErr] = useState<string | null>(null);
  const noms = state.nominations.filter((n) => n.waveId === wave.id);
  if (!noms.length) return null;
  const isDelivery = state.session.role === "DELIVERY";
  return (
    <div className="card">
      <h3>Nominaciones</h3>
      <p className="muted">Delivery revisa cada caso. Invitar genera un enlace personal /apply/[token]; nominación ≠ selección.</p>
      {err && <p className="error">{err}</p>}
      <div className="table-wrap" tabIndex={0}>
        <table>
          <thead><tr><th>Nominado/a</th><th>Cliente</th><th>Motivo / oportunidad</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            {noms.map((n) => (
              <tr key={n.id}>
                <td><strong>{n.nomineeName}</strong><br /><small className="muted">{n.role} · {n.estimatedAvailability}</small></td>
                <td>{wave.clients.find((c) => c.id === n.clientId)?.name ?? n.clientId}</td>
                <td><small>{n.reason}<br /><em>{n.applicationOpportunity}</em></small></td>
                <td><Badge tone={n.status === "INVITED" ? "ok" : n.status === "DISCARDED" ? "bad" : undefined}>{n.status}</Badge></td>
                <td>
                  {n.status === "NOMINATED" && isDelivery && (
                    <div className="row">
                      <button className="btn small" onClick={() => setErr(run((s) => reviewNomination(s, n.id, "INVITE", "")))}>Invitar a postular</button>
                      <button className="btn ghost small" onClick={() => setErr(run((s) => reviewNomination(s, n.id, "DISCARD", "")))}>Descartar</button>
                    </div>
                  )}
                  {n.invitationToken && <Link href={`/apply/${n.invitationToken}`}><small>/apply/{n.invitationToken}</small></Link>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ParticipantsTable({ wave, canEvaluate }: { wave: Wave; canEvaluate: boolean }) {
  const { state, run } = useStore();
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const apps = state.applications.filter((a) => a.waveId === wave.id);
  const evaluable = ["APPLICATION_SUBMITTED", "ASSESSMENT_EVALUATED", "HUMAN_REVIEW", "RESCUE_REQUIRED"];
  return (
    <div className="card">
      <h3>Participantes (admisión y journey)</h3>
      <p className="muted">Estado de admisión individual, separado del estado de la Wave. Vista interna: incluye evaluación (el cliente no la ve).</p>
      {err && <p className="error">{err}</p>}
      <div className="table-wrap" tabIndex={0}>
        <table>
          <thead><tr><th>Participante</th><th>Cliente</th><th>Admisión</th><th>Journey</th><th>Evaluación</th><th></th></tr></thead>
          <tbody>
            {apps.map((a) => (
              <tr key={a.id}>
                <td><strong>{a.participantName}</strong><br /><small className="muted">{a.role} · {a.deliveryOwner ?? "Delivery sin asignar"}</small></td>
                <td>{a.client}</td>
                <td><Badge tone={admissionTone(a.applicationStatus)}>{ADMISSION_LABEL[a.applicationStatus]}</Badge></td>
                <td>{a.journeyStage ? stageLabel(a.journeyStage) : <span className="muted">—</span>}</td>
                <td>{a.evaluation ? <small>{a.evaluation.outcome}{a.evaluation.total !== undefined ? ` · ${a.evaluation.total}/100` : ""}</small> : <span className="muted">—</span>}</td>
                <td>
                  <div className="row">
                    <button className="btn ghost small" onClick={() => setOpen(open === a.id ? null : a.id)}>Historial</button>
                    {canEvaluate && evaluable.includes(a.applicationStatus) && (
                      <select
                        aria-label="Registrar resultado"
                        defaultValue=""
                        style={{ width: "auto", padding: "4px 6px" }}
                        onChange={(e) => {
                          const v = e.target.value as AssessmentOutcome;
                          if (!v) return;
                          setErr(run((s) => recordOutcome(s, a.id, v)));
                          e.target.value = "";
                        }}
                      >
                        <option value="">Registrar resultado…</option>
                        <option value="SELECTED">Seleccionado/a</option>
                        <option value="RESCUE_REQUIRED">Requiere rescate (video)</option>
                        <option value="HUMAN_REVIEW">Revisión humana</option>
                        <option value="NOT_SELECTED">No seleccionado/a</option>
                      </select>
                    )}
                  </div>
                  {open === a.id && (
                    <ul style={{ marginTop: 8 }}>
                      {state.events.filter((e) => e.applicationId === a.id).map((e) => (
                        <li key={e.id}><small>{fmtDate(e.at)} · {e.from ? ADMISSION_LABEL[e.from] + " → " : ""}{ADMISSION_LABEL[e.to]} · {e.by}{e.note ? ` · ${e.note}` : ""}</small></li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="muted"><small>Dimensiones: {ASSESSMENT_DIMENSIONS.map((d) => `${d.label} ${d.weight}`).join(" · ")}</small></p>
    </div>
  );
}

export function AdminWaves() {
  const { state, run } = useStore();
  const [name, setName] = useState("");
  const [type, setType] = useState<Wave["type"]>("REGULAR");
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="stack">
      <WavePortfolio basePath="/admin/waves" />
      <div className="card narrow">
        <h3>Crear Wave</h3>
        {!["ADMIN", "PRODUCT_LEAD"].includes(state.session.role) && <p className="muted">Requiere vista Admin o Product Lead.</p>}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const r = run((s) => createWave(s, { name, type }));
            setErr(r);
            if (!r) setName("");
          }}
        >
          <div className="grid grid-2">
            <div className="field"><label htmlFor="wn">Nombre</label><input id="wn" type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="AI Edge Talent · Wave 5" /></div>
            <div className="field">
              <label htmlFor="wt">Tipo</label>
              <select id="wt" value={type} onChange={(e) => setType(e.target.value as Wave["type"])}>
                <option value="REGULAR">Regular</option>
                <option value="SPECIAL_EDITION">Special Edition</option>
                <option value="PILOT">Piloto</option>
              </select>
            </div>
          </div>
          {err && <p className="error">{err}</p>}
          <button className="btn" type="submit">Crear en estado Borrador</button>
        </form>
      </div>
    </div>
  );
}

