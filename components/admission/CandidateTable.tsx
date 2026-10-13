"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { CandidateListItem } from "@/lib/admission/queries";
import { decideCandidates, deleteCandidates, evaluateCandidates, resendCandidateAccess, sendCandidateEmails, type ActionResult } from "@/lib/admission/admin-actions";
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

export function CandidateTable({ waveId, candidates: all, isAdmin, initialStatus = "" }: { waveId: string; candidates: CandidateListItem[]; isAdmin: boolean; initialStatus?: string }) {
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
  // Eliminados en esta sesión: desaparecen de la lista y de los indicadores al instante (el servidor confirma).
  const [removed, setRemoved] = useState<string[]>([]);
  const candidates = useMemo(() => all.filter((c) => !removed.includes(c.id)), [all, removed]);

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
          <button key={k} type="button" className={`adm-chip${stage === k ? " on" : ""}`} aria-pressed={stage === k} onClick={() => { setStage(stage === k && k !== "all" ? "all" : k); setStatus(""); setRec(""); }}>
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

      <div className="adm-showing" role="status" aria-live="polite">
        <span>Mostrando <strong>{rows.length}</strong> de {candidates.length} candidato{candidates.length === 1 ? "" : "s"}</span>
        {(stage !== "all" || status || rec || q) && (
          <>
            {stage !== "all" && <span className="adm-tag">{STAGES[stage].label}</span>}
            {status && <span className="adm-tag">Estado: {ADMISSION_LABEL[status as AdmissionStatus]}</span>}
            {rec && <span className="adm-tag">IA: {REC_LABEL[rec]}</span>}
            {q && <span className="adm-tag">“{q}”</span>}
            <button type="button" className="link-btn" onClick={() => { setStage("all"); setStatus(""); setRec(""); setQ(""); }}>Limpiar filtros</button>
          </>
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
              <span className="adm-step">Eliminar</span>
              <p>La persona podrá postular de nuevo desde cero.</p>
              <button className="btn small adm-danger" disabled={pending} onClick={() => setToDelete(sel)}>Eliminar {sel.length === 1 ? "candidato" : `${sel.length} candidatos`}</button>
            </div>
          </div>
        </section>
      )}

      {toDelete && (
        <DeleteDialog
          people={candidates.filter((c) => toDelete.includes(c.id))}
          pending={pending}
          onCancel={() => setToDelete(null)}
          onConfirm={(account, confirmText) => start(async () => {
            const ids = toDelete;
            const r = await deleteCandidates(waveId, ids, { account, confirm: confirmText });
            setResult(r);
            if (r.ok) { setRemoved((x) => [...x, ...ids]); setSel((x) => x.filter((id) => !ids.includes(id))); setToDelete(null); }
          })}
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
                {isAdmin && (
                  <td className="rt-actions">
                    <RowMenu
                      name={c.full_name}
                      detailHref={`/admin/admision/${waveId}/c/${c.id}`}
                      onResend={() => run(() => resendCandidateAccess(waveId, c.id))}
                      onDelete={() => setToDelete([c.id])}
                    />
                  </td>
                )}
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

/** Menú de acciones de una fila (···): ver detalle, reenviar acceso y eliminar (acción destructiva, al final). */
function RowMenu({ name, detailHref, onResend, onDelete }: { name: string; detailHref: string; onResend: () => void; onDelete: () => void }) {
  const [pos, setPos] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const open = pos !== null;
  const setOpen = (v: boolean) => { if (!v) setPos(null); else place(); };
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  // El menú se ubica sobre la página (posición fija), así no lo recorta el borde de la tabla; abre hacia arriba si
  // no cabe abajo.
  const place = () => {
    const r = btn.current?.getBoundingClientRect();
    if (!r) return;
    if (r.bottom < 0 || r.top > window.innerHeight) { setPos(null); return; } // el botón salió de la pantalla
    const right = Math.max(8, window.innerWidth - r.right);
    setPos(window.innerHeight - r.bottom < 190 ? { bottom: window.innerHeight - r.top + 4, right } : { top: r.bottom + 4, right });
  };
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setPos(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setPos(null); btn.current?.focus(); } };
    // Al desplazarse o cambiar el tamaño, el menú se reubica junto a su botón (no se cierra de golpe).
    const away = () => place();
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", away, true);
    window.addEventListener("resize", away);
    ref.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus({ preventScroll: true });
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); window.removeEventListener("scroll", away, true); window.removeEventListener("resize", away); };
  }, [open]);
  const item = (f: () => void) => () => { setOpen(false); f(); };
  return (
    <div className="row-menu" ref={ref}>
      <button ref={btn} type="button" className="row-menu-btn" aria-haspopup="menu" aria-expanded={open} aria-label={`Acciones para ${name}`} onClick={() => setOpen(!open)}>
        <span aria-hidden="true">···</span>
      </button>
      {open && (
        <div className="row-menu-pop" role="menu" aria-label={`Acciones para ${name}`} style={pos ?? undefined}>
          <Link role="menuitem" href={detailHref} onClick={() => setOpen(false)}>Ver detalle</Link>
          <button role="menuitem" type="button" onClick={item(onResend)}>Reenviar acceso</button>
          <hr />
          <button role="menuitem" type="button" className="danger" onClick={item(onDelete)}>Eliminar candidato</button>
        </div>
      )}
    </div>
  );
}

/**
 * Confirmación de la eliminación: nombra a la persona y explica las consecuencias. Una persona: Cancelar o
 * Eliminar candidato. Varias a la vez: además se escribe ELIMINAR, para no borrar por accidente.
 */
function DeleteDialog({ people, pending, onCancel, onConfirm, error }: { people: CandidateListItem[]; pending: boolean; onCancel: () => void; onConfirm: (account: boolean, confirm: string) => void; error: string | null }) {
  const [account, setAccount] = useState(true);
  const [text, setText] = useState("");
  const cancel = useRef<HTMLButtonElement>(null);
  const many = people.length > 1;
  const enrolled = people.filter((p) => STAGES.enrolled.test(p.status));
  useEffect(() => { cancel.current?.focus(); }, []);
  const ready = !many || text.trim().toUpperCase() === "ELIMINAR";
  return (
    <div className="adm-modal" role="alertdialog" aria-modal="true" aria-labelledby="del-t" aria-describedby="del-d" onKeyDown={(e) => e.key === "Escape" && !pending && onCancel()}>
      <div className="adm-modal-card">
        <h2 id="del-t">{many ? `¿Eliminar ${people.length} candidatos?` : `¿Eliminar a ${people[0]?.full_name}?`}</h2>
        {many ? <ul className="adm-del-list">{people.map((p) => <li key={p.id}><strong>{p.full_name}</strong> <small className="muted">{shownEmail(p.corporate_email)}</small></li>)}</ul> : <p className="muted">{shownEmail(people[0]?.corporate_email ?? "")} · {ADMISSION_LABEL[people[0]?.status as AdmissionStatus]}</p>}
        <p id="del-d">Se eliminan sus respuestas, evaluaciones, decisiones e historial de admisión. Podrá postular de nuevo con el mismo correo. Queda registrado a tu nombre en la auditoría. <strong>Esta acción no se puede deshacer.</strong></p>
        {enrolled.length > 0 && <p className="error">{enrolled.length === 1 ? "Esta persona ya está inscrita" : `${enrolled.length} personas ya están inscritas`} en el programa: no se eliminan.</p>}
        <label className="check"><input type="checkbox" checked={account} onChange={(e) => setAccount(e.target.checked)} /> <span>Partir desde cero: eliminar también su cuenta del portal y el registro de correos enviados. <small className="muted">Las cuentas con rol interno (admin, Delivery…) se mantienen.</small></span></label>
        {many && <div className="field"><label htmlFor="del-c">Escribe <strong>ELIMINAR</strong> para confirmar</label><input id="del-c" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" /></div>}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="adm-modal-actions">
          <button ref={cancel} type="button" className="btn ghost" onClick={onCancel} disabled={pending}>Cancelar</button>
          <button type="button" className="btn adm-danger" disabled={pending || !ready} onClick={() => onConfirm(account, many ? text : "ELIMINAR")}>{pending ? "Eliminando…" : many ? `Eliminar ${people.length} candidatos` : "Eliminar candidato"}</button>
        </div>
      </div>
    </div>
  );
}
