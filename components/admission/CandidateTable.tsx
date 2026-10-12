"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { CandidateListItem } from "@/lib/admission/queries";
import { decideCandidates, evaluateCandidates, sendCandidateEmails, type ActionResult } from "@/lib/admission/admin-actions";
import { TEMPLATE_FOR_STATUS, TEMPLATE_LABEL, type EmailTemplate } from "@/lib/email/templates";
import { ADMISSION_LABEL, type AdmissionStatus } from "@/lib/domain/types";
import { Badge, Callout, admissionTone } from "@/components/ui";

const REC_LABEL: Record<string, string> = { SELECTED: "Avanza", RESCUE_REQUIRED: "Repechaje", HUMAN_REVIEW: "Revisión humana", NOT_SELECTED: "No continúa" };
const OUTCOMES = [
  ["SELECTED", "Seleccionado/a"],
  ["RESCUE_REQUIRED", "Repechaje por video"],
  ["HUMAN_REVIEW", "Revisión humana"],
  ["NOT_SELECTED", "No continúa (todavía no)"],
] as const;

export function CandidateTable({ waveId, candidates, isAdmin }: { waveId: string; candidates: CandidateListItem[]; isAdmin: boolean }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [rec, setRec] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<(typeof OUTCOMES)[number][0]>("SELECTED");
  const [note, setNote] = useState("");
  const [template, setTemplate] = useState<EmailTemplate>("INVITATION");

  const rows = useMemo(
    () =>
      candidates
        .filter((c) => !q || `${c.full_name} ${c.corporate_email} ${c.client_name ?? ""} ${c.specialty ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        .filter((c) => !status || c.status === status)
        .filter((c) => !rec || c.eval?.recommendation === rec)
        .sort((a, b) => (b.eval?.total ?? -1) - (a.eval?.total ?? -1)),
    [candidates, q, status, rec],
  );
  const statuses = [...new Set(candidates.map((c) => c.status))];
  const allSel = rows.length > 0 && rows.every((r) => sel.includes(r.id));
  const run = (fn: () => Promise<ActionResult>) => start(async () => { setResult(await fn()); setSel([]); });

  // Selección rápida: el admin elige; la IA solo sugiere.
  const pick = (pred: (c: CandidateListItem) => boolean) => setSel(rows.filter(pred).map((r) => r.id));

  return (
    <div className="stack">
      <div className="grid grid-3">
        <Kpi n={candidates.length} label="candidatos" />
        <Kpi n={candidates.filter((c) => !["NOMINATED", "INVITED", "IDENTIFIED", "APPLICATION_STARTED"].includes(c.status)).length} label="completaron la postulación" />
        <Kpi n={candidates.filter((c) => ["ENROLLED", "MINDSET_READY"].includes(c.status)).length} label="inscritos (compromiso aceptado)" />
      </div>

      <div className="card">
        <div className="row">
          <input type="text" placeholder="Buscar nombre, correo, cliente, especialidad…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 320 }} />
          <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: "auto" }} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            {statuses.map((s) => <option key={s} value={s}>{ADMISSION_LABEL[s as AdmissionStatus]}</option>)}
          </select>
          {isAdmin && (
            <select value={rec} onChange={(e) => setRec(e.target.value)} style={{ width: "auto" }} aria-label="Filtrar por propuesta IA">
              <option value="">Toda propuesta IA</option>
              {Object.entries(REC_LABEL).map(([k, v]) => <option key={k} value={k}>IA: {v}</option>)}
            </select>
          )}
        </div>
        {isAdmin && (
          <div className="row" style={{ marginTop: 10 }}>
            <small className="muted">Seleccionar:</small>
            <button className="btn ghost small" onClick={() => pick((c) => c.status === "APPLICATION_SUBMITTED" && !c.eval)}>Enviados sin evaluar</button>
            <button className="btn ghost small" onClick={() => pick((c) => c.eval?.recommendation === "SELECTED" && !c.decision)}>IA propone avanzar</button>
            <button className="btn ghost small" onClick={() => pick((c) => c.eval?.recommendation === "RESCUE_REQUIRED" && !c.decision)}>IA propone repechaje</button>
            <button className="btn ghost small" onClick={() => pick((c) => ["INVITED", "IDENTIFIED", "APPLICATION_STARTED"].includes(c.status))}>Sin postulación enviada</button>
            <button className="btn ghost small" onClick={() => setSel([])}>Ninguno</button>
          </div>
        )}
      </div>

      {isAdmin && sel.length > 0 && (
        <div className="card" style={{ borderColor: "var(--accent)" }}>
          <strong>{sel.length} seleccionado(s)</strong>
          <div className="grid grid-3" style={{ marginTop: 10 }}>
            <div>
              <div className="eyebrow">1 · Evaluar con IA</div>
              <p className="muted"><small>Propuesta por dimensión. No decide.</small></p>
              <button className="btn small" disabled={pending} onClick={() => run(() => evaluateCandidates(waveId, sel))}>Evaluar con IA</button>
            </div>
            <div>
              <div className="eyebrow">2 · Registrar decisión</div>
              <select value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)} aria-label="Decisión">
                {OUTCOMES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input type="text" placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} style={{ marginTop: 6 }} />
              <button
                className="btn small"
                style={{ marginTop: 6 }}
                disabled={pending}
                onClick={() => confirm(`¿Registrar "${OUTCOMES.find((o) => o[0] === outcome)![1]}" para ${sel.length} candidato(s)? Queda registrado a tu nombre.`) && run(() => decideCandidates(waveId, sel, outcome, note))}
              >
                Registrar decisión
              </button>
            </div>
            <div>
              <div className="eyebrow">3 · Enviar correo</div>
              <select value={template} onChange={(e) => setTemplate(e.target.value as EmailTemplate)} aria-label="Plantilla">
                {Object.entries(TEMPLATE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button
                className="btn small"
                style={{ marginTop: 6 }}
                disabled={pending}
                onClick={() => {
                  const mismatch = candidates.filter((c) => sel.includes(c.id) && TEMPLATE_FOR_STATUS[c.status] !== template).length;
                  const warn = mismatch ? `\n\nAtención: ${mismatch} seleccionado(s) no están en el estado que corresponde a esta plantilla.` : "";
                  if (confirm(`¿Enviar "${TEMPLATE_LABEL[template]}" a ${sel.length} persona(s)?${warn}`)) run(() => sendCandidateEmails(waveId, sel, template));
                }}
              >
                Enviar correo
              </button>
            </div>
          </div>
        </div>
      )}

      {pending && <p className="muted">Procesando… (la evaluación con IA puede tardar unos segundos por postulación)</p>}
      {result && (
        <Callout tone={result.ok ? "ok" : "bad"} title={result.message}>
          {result.details && result.details.length > 0 && <ul style={{ margin: 0 }}>{result.details.map((d) => <li key={d}><small>{d}</small></li>)}</ul>}
        </Callout>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {isAdmin && <th><input type="checkbox" aria-label="Seleccionar todo" checked={allSel} onChange={(e) => setSel(e.target.checked ? rows.map((r) => r.id) : [])} /></th>}
              <th>Candidato/a</th>
              <th>Cliente · Rol</th>
              <th>Estado</th>
              {isAdmin && <th>Propuesta IA</th>}
              {isAdmin && <th>Decisión</th>}
              <th>Último correo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                {isAdmin && <td><input type="checkbox" aria-label={`Seleccionar ${c.full_name}`} checked={sel.includes(c.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))} /></td>}
                <td>
                  <Link href={`/admin/admision/${waveId}/c/${c.id}`}><strong>{c.full_name}</strong></Link>
                  <br /><small className="muted">{c.corporate_email}</small>
                </td>
                <td>{c.client_name ?? "—"}<br /><small className="muted">{c.role_title ?? ""}{c.specialty ? ` · ${c.specialty}` : ""}</small></td>
                <td><Badge tone={admissionTone(c.status)}>{ADMISSION_LABEL[c.status as AdmissionStatus]}</Badge></td>
                {isAdmin && (
                  <td>
                    {c.eval ? (
                      <>
                        <strong>{c.eval.total.toFixed(0)}</strong> <span className="badge">{c.eval.level}</span>
                        <br /><small className="muted">{REC_LABEL[c.eval.recommendation]}</small>
                      </>
                    ) : <span className="muted">—</span>}
                  </td>
                )}
                {isAdmin && (
                  <td>
                    {c.decision ? (
                      <>
                        {REC_LABEL[c.decision.outcome]}
                        {c.decision.agrees_with_ai === false && <><br /><small className="pending-def">Difiere de la IA</small></>}
                      </>
                    ) : <span className="muted">Pendiente</span>}
                  </td>
                )}
                <td>{c.lastEmail ? <small>{TEMPLATE_LABEL[c.lastEmail.template as EmailTemplate]} · {c.lastEmail.status === "sent" ? "enviado" : c.lastEmail.status === "failed" ? "falló" : "en cola"}</small> : <span className="muted">—</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="muted">Sin candidatos. Importa la base de la Wave.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ n, label }: { n: number; label: string }) {
  return (
    <div className="card">
      <div className="kpi">{n}</div>
      <small className="muted">{label}</small>
    </div>
  );
}
