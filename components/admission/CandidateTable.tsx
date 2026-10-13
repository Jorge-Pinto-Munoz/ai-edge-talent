"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import type { CandidateListItem } from "@/lib/admission/queries";
import { decideCandidates, deleteCandidates, evaluateCandidates, sendCandidateEmails, type ActionResult } from "@/lib/admission/admin-actions";
import { TEMPLATE_NAME, type IdentityTemplate } from "@/lib/email/identity";
import { TEMPLATE_FOR_STATUS, TEMPLATE_LABEL, type EmailTemplate } from "@/lib/email/templates";
import { ADMISSION_LABEL, type AdmissionStatus } from "@/lib/domain/types";
import { Badge, Callout, admissionTone } from "@/components/ui";
import { PL_LABEL, type PlRecommendation } from "@/lib/ai/rubric";
import { shownEmail } from "@/lib/talent/rules";

const REC_LABEL: Record<string, string> = { SELECTED: "Avanza", RESCUE_REQUIRED: "Repechaje", HUMAN_REVIEW: "Revisión humana", NOT_SELECTED: "No continúa" };
const OUTCOMES = [
  ["SELECTED", "Seleccionado/a"],
  ["RESCUE_REQUIRED", "Repechaje por video"],
  ["HUMAN_REVIEW", "Revisión humana"],
  ["NOT_SELECTED", "No continúa (todavía no)"],
] as const;

export function CandidateTable({ waveId, candidates, isAdmin, initialStatus = "" }: { waveId: string; candidates: CandidateListItem[]; isAdmin: boolean; initialStatus?: string }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [rec, setRec] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<(typeof OUTCOMES)[number][0]>("SELECTED");
  const [note, setNote] = useState("");
  const [template, setTemplate] = useState<EmailTemplate>("INVITATION");
  const [stage, setStage] = useState<Stage>("all");
  const [toDelete, setToDelete] = useState<string[] | null>(null);

  const rows = useMemo(
    () =>
      candidates
        .filter((c) => !q || `${c.full_name} ${c.corporate_email} ${c.client_name ?? ""} ${c.specialty ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        .filter((c) => !status || c.status === status)
        .filter((c) => STAGES[stage].test(c.status))
        .filter((c) => !rec || c.eval?.recommendation === rec)
        .sort((a, b) => (b.eval?.total ?? -1) - (a.eval?.total ?? -1)),
    [candidates, q, status, rec, stage],
  );
  const statuses = [...new Set(candidates.map((c) => c.status))];
  const allSel = rows.length > 0 && rows.every((r) => sel.includes(r.id));
  const run = (fn: () => Promise<ActionResult>) => start(async () => { setResult(await fn()); setSel([]); });

  // Selección rápida: el admin elige; la IA solo sugiere.
  const pick = (pred: (c: CandidateListItem) => boolean) => setSel(rows.filter(pred).map((r) => r.id));

  const count = (k: Stage) => candidates.filter((c) => STAGES[k].test(c.status)).length;
  const selRows = candidates.filter((c) => sel.includes(c.id));

  return (
    <div className="stack adm-board">
      <div className="adm-funnel" role="group" aria-label="Filtrar por etapa del Assessment">
        {(Object.keys(STAGES) as Stage[]).map((k) => (
          <button key={k} type="button" className={`adm-chip${stage === k ? " on" : ""}`} aria-pressed={stage === k} onClick={() => setStage(stage === k && k !== "all" ? "all" : k)}>
            <strong>{count(k)}</strong>
            <span>{STAGES[k].label}</span>
          </button>
        ))}
      </div>

      <div className="card adm-toolbar">
        <div className="adm-filters">
          <input type="search" placeholder="Buscar por nombre, correo, cliente o especialidad" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar candidatos" />
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            {statuses.map((s) => <option key={s} value={s}>{ADMISSION_LABEL[s as AdmissionStatus]}</option>)}
          </select>
          {isAdmin && (
            <select value={rec} onChange={(e) => setRec(e.target.value)} aria-label="Filtrar por propuesta IA">
              <option value="">Toda propuesta IA</option>
              {Object.entries(REC_LABEL).map(([k, v]) => <option key={k} value={k}>IA: {v}</option>)}
            </select>
          )}
        </div>
        {isAdmin && (
          <div className="adm-quick">
            <span className="muted">Selección rápida</span>
            <button className="adm-pill" onClick={() => pick((c) => c.status === "APPLICATION_SUBMITTED" && !c.eval)}>Enviados sin evaluar</button>
            <button className="adm-pill" onClick={() => pick((c) => (c.eval?.pl ? c.eval.pl === "SELECCIONAR" || c.eval.pl === "SELECCIONAR_CON_SEGUIMIENTO" : c.eval?.recommendation === "SELECTED") && !c.decision)}>IA propone avanzar</button>
            <button className="adm-pill" onClick={() => pick((c) => c.eval?.recommendation === "RESCUE_REQUIRED" && !c.decision)}>IA propone repechaje</button>
            <button className="adm-pill" onClick={() => pick((c) => ["INVITED", "IDENTIFIED", "APPLICATION_STARTED"].includes(c.status))}>Sin postulación enviada</button>
            <button className="adm-pill" onClick={() => pick(() => true)}>Todos los visibles</button>
          </div>
        )}
      </div>

      {isAdmin && sel.length > 0 && (
        <section className="card adm-bulk" aria-label="Acciones sobre la selección">
          <header>
            <strong>{sel.length} seleccionado{sel.length === 1 ? "" : "s"}</strong>
            <button type="button" className="link-btn" onClick={() => setSel([])}>Quitar selección</button>
          </header>
          <div className="adm-actions">
            <div className="adm-act">
              <span className="adm-step">1 · Evaluar con IA</span>
              <p>Propuesta por dimensión. No decide.</p>
              <button className="btn small" disabled={pending} onClick={() => run(() => evaluateCandidates(waveId, sel))}>Evaluar con IA</button>
            </div>
            <div className="adm-act">
              <span className="adm-step">2 · Registrar decisión</span>
              <select value={outcome} onChange={(e) => setOutcome(e.target.value as typeof outcome)} aria-label="Decisión">
                {OUTCOMES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input type="text" placeholder="Nota (opcional)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Nota de la decisión" />
              <button className="btn small" disabled={pending} onClick={() => confirm(`¿Registrar "${OUTCOMES.find((o) => o[0] === outcome)![1]}" para ${sel.length} candidato(s)? Queda registrado a tu nombre.`) && run(() => decideCandidates(waveId, sel, outcome, note))}>Registrar decisión</button>
            </div>
            <div className="adm-act">
              <span className="adm-step">3 · Enviar correo</span>
              <select value={template} onChange={(e) => setTemplate(e.target.value as EmailTemplate)} aria-label="Plantilla">
                {Object.entries(TEMPLATE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <button
                className="btn small"
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
            <div className="adm-act danger">
              <span className="adm-step">Borrar postulación</span>
              <p>La persona podrá postular de nuevo desde cero.</p>
              <button className="btn small adm-danger" disabled={pending} onClick={() => setToDelete(sel)}>Borrar {sel.length === 1 ? "postulación" : `${sel.length} postulaciones`}</button>
            </div>
          </div>
        </section>
      )}

      {toDelete && (
        <DeleteDialog
          people={candidates.filter((c) => toDelete.includes(c.id))}
          pending={pending}
          onCancel={() => setToDelete(null)}
          onConfirm={(account, confirmText) => start(async () => { const r = await deleteCandidates(waveId, toDelete, { account, confirm: confirmText }); setResult(r); if (r.ok) { setSel([]); setToDelete(null); } })}
          error={result && !result.ok && toDelete ? result.message : null}
        />
      )}

      {pending && <p className="muted">Procesando… (la evaluación con IA puede tardar unos segundos por postulación)</p>}
      {result && (
        <Callout tone={result.ok ? "ok" : "bad"} title={result.message}>
          {result.details && result.details.length > 0 && <ul style={{ margin: 0 }}>{result.details.map((d) => <li key={d}><small>{d}</small></li>)}</ul>}
        </Callout>
      )}

      <div className="table-wrap" tabIndex={0}>
        <table className="rtable">
          <thead>
            <tr>
              {isAdmin && <th><input type="checkbox" aria-label="Seleccionar todo" checked={allSel} onChange={(e) => setSel(e.target.checked ? rows.map((r) => r.id) : [])} /></th>}
              <th>Candidato/a</th>
              <th>Cliente · Rol</th>
              <th>Estado</th>
              {isAdmin && <th>Propuesta IA</th>}
              {isAdmin && <th>Decisión</th>}
              <th>Último correo</th>
              {isAdmin && <th><span className="sr-only">Acciones</span></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                {isAdmin && <td className="rt-check"><input type="checkbox" aria-label={`Seleccionar ${c.full_name}`} checked={sel.includes(c.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))} /></td>}
                <td className="rt-title">
                  <Link href={`/admin/admision/${waveId}/c/${c.id}`}><strong>{c.full_name}</strong></Link>
                  <br /><small className="muted">{shownEmail(c.corporate_email)}</small>
                </td>
                <td data-label="Cliente · Rol">{c.client_name ?? "—"}<br /><small className="muted">{c.role_title ?? ""}{c.specialty ? ` · ${c.specialty}` : ""}</small></td>
                <td data-label="Estado"><Badge tone={admissionTone(c.status)}>{ADMISSION_LABEL[c.status as AdmissionStatus]}</Badge></td>
                {isAdmin && (
                  <td data-label="Propuesta IA">
                    {c.eval ? (
                      <>
                        <strong>{c.eval.total.toFixed(0)}</strong> <span className="badge">{c.eval.level}</span>
                        <br /><small className="muted">{c.eval.pl ? PL_LABEL[c.eval.pl as PlRecommendation] : REC_LABEL[c.eval.recommendation]}</small>
                      </>
                    ) : <span className="muted">—</span>}
                  </td>
                )}
                {isAdmin && (
                  <td data-label="Decisión">
                    {c.decision ? (
                      <>
                        {REC_LABEL[c.decision.outcome]}
                        {c.decision.agrees_with_ai === false && <><br /><small className="pending-def">Difiere de la IA</small></>}
                      </>
                    ) : <span className="muted">Pendiente</span>}
                  </td>
                )}
                <td data-label="Último correo">{c.lastEmail ? <small>{TEMPLATE_LABEL[c.lastEmail.template as EmailTemplate] ?? TEMPLATE_NAME[c.lastEmail.template as IdentityTemplate] ?? c.lastEmail.template}<br /><span className={c.lastEmail.status === "failed" ? "error" : "muted"}>{c.lastEmail.status === "sent" ? "Enviado" : c.lastEmail.status === "failed" ? "Falló" : "En cola"}</span></small> : <span className="muted">—</span>}</td>
                {isAdmin && <td className="rt-actions"><button type="button" className="adm-row-del" onClick={() => setToDelete([c.id])} aria-label={`Borrar la postulación de ${c.full_name}`} title="Borrar postulación">Borrar</button></td>}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="muted">{candidates.length ? "No hay postulaciones con estos filtros." : "Aún no hay postulaciones. Comparte el link de postulación con los profesionales."}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type Stage = "all" | "not_started" | "in_progress" | "completed" | "enrolled";
const STAGES: Record<Stage, { label: string; test: (s: string) => boolean }> = {
  all: { label: "Candidatos", test: () => true },
  not_started: { label: "No iniciado", test: (s) => ["NOMINATED", "INVITED", "IDENTIFIED"].includes(s) },
  in_progress: { label: "En progreso", test: (s) => s === "APPLICATION_STARTED" },
  completed: { label: "Assessment completado", test: (s) => !["NOMINATED", "INVITED", "IDENTIFIED", "APPLICATION_STARTED"].includes(s) },
  enrolled: { label: "Inscritos", test: (s) => ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"].includes(s) },
};

/** Confirmación del borrado: lista a las personas, explica qué se borra y pide escribir BORRAR. */
function DeleteDialog({ people, pending, onCancel, onConfirm, error }: { people: CandidateListItem[]; pending: boolean; onCancel: () => void; onConfirm: (account: boolean, confirm: string) => void; error: string | null }) {
  const [account, setAccount] = useState(true);
  const [text, setText] = useState("");
  const enrolled = people.filter((p) => STAGES.enrolled.test(p.status));
  return (
    <div className="adm-modal" role="dialog" aria-modal="true" aria-labelledby="del-t" onKeyDown={(e) => e.key === "Escape" && onCancel()}>
      <div className="adm-modal-card">
        <h2 id="del-t">Borrar {people.length === 1 ? "postulación" : `${people.length} postulaciones`}</h2>
        <ul className="adm-del-list">{people.map((p) => <li key={p.id}><strong>{p.full_name}</strong> <small className="muted">{shownEmail(p.corporate_email)} · {ADMISSION_LABEL[p.status as AdmissionStatus]}</small></li>)}</ul>
        <p>Se borran sus respuestas, evaluaciones, decisiones e historial de admisión. Podrá postular de nuevo con el mismo correo. Queda registrado a tu nombre en la auditoría. <strong>No se puede deshacer.</strong></p>
        {enrolled.length > 0 && <p className="error">{enrolled.length} persona(s) ya están inscritas en el programa: esas no se borran.</p>}
        <label className="check"><input type="checkbox" checked={account} onChange={(e) => setAccount(e.target.checked)} /> <span>Partir desde cero: borrar también su cuenta del portal, su código personal y el registro de correos enviados. <small className="muted">Las cuentas con rol interno (admin, Delivery…) se mantienen.</small></span></label>
        <div className="field"><label htmlFor="del-c">Escribe <strong>BORRAR</strong> para confirmar</label><input id="del-c" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" autoFocus /></div>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="row" style={{ justifyContent: "flex-end", gap: 10 }}>
          <button type="button" className="btn ghost" onClick={onCancel} disabled={pending}>Cancelar</button>
          <button type="button" className="btn adm-danger" disabled={pending || text.trim().toUpperCase() !== "BORRAR"} onClick={() => onConfirm(account, text)}>{pending ? "Borrando…" : "Borrar definitivamente"}</button>
        </div>
      </div>
    </div>
  );
}
