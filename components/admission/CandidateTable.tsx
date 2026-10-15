"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { CandidateListItem } from "@/lib/admission/queries";
import { decideCandidates, deleteCandidates, evaluateCandidates, resendCandidateAccess, sendCandidateEmails, type ActionResult } from "@/lib/admission/admin-actions";
import { TEMPLATE_FOR_STATUS, TEMPLATE_LABEL, type EmailTemplate } from "@/lib/email/templates";
import { ADMISSION_LABEL, type AdmissionStatus } from "@/lib/domain/types";
import { Callout } from "@/components/ui";
import { PhaseBadge } from "./PhaseBadge";
import { PHASES, PHASE_STATE, needsAction, phasesOf, type PhaseKey, type PhaseState } from "@/lib/admission/phases";
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
  // Filtro por estado de fase. Acepta un estado de fase o, por compatibilidad, un estado del sistema (?estado=…).
  const [state, setState] = useState<PhaseState | "">(() => toPhaseState(initialStatus));
  const [phase, setPhase] = useState<PhaseKey | "">("");
  const [delivery, setDelivery] = useState("");
  const [onlyAction, setOnlyAction] = useState(false);
  const [rec, setRec] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const [outcome, setOutcome] = useState<(typeof OUTCOMES)[number][0]>("SELECTED");
  const [note, setNote] = useState("");
  const [template, setTemplate] = useState<EmailTemplate>("INVITATION");
  const [toDelete, setToDelete] = useState<string[] | null>(null);
  // Eliminados en esta sesión: desaparecen de la lista y de los indicadores al instante (el servidor confirma).
  const [removed, setRemoved] = useState<string[]>([]);
  const candidates = useMemo(() => all.filter((c) => !removed.includes(c.id)), [all, removed]);
  const withPhases = useMemo(() => candidates.map((c) => ({ c, p: phasesOf(c.status) })), [candidates]);

  const rows = useMemo(
    () =>
      withPhases
        .filter(({ c }) => !q || `${c.full_name} ${c.corporate_email} ${c.client_name ?? ""} ${c.specialty ?? ""} ${c.delivery_owner ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        .filter(({ p }) => !state || p[phaseOfState(state)] === state)
        .filter(({ p }) => !phase || p.current === phase)
        .filter(({ c }) => !delivery || (delivery === NO_DELIVERY ? !c.delivery_owner : c.delivery_owner === delivery))
        .filter(({ c }) => !onlyAction || needsAction(c.status))
        .filter(({ c }) => !rec || c.eval?.recommendation === rec)
        .sort((a, b) => Number(needsAction(b.c.status)) - Number(needsAction(a.c.status)) || b.c.last_activity.localeCompare(a.c.last_activity))
        .map(({ c, p }) => ({ ...c, phases: p })),
    [withPhases, q, state, phase, delivery, onlyAction, rec],
  );
  // Listas grandes: se muestran de a PAGE filas; cambiar filtros vuelve al inicio.
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => { setLimit(PAGE); }, [q, state, phase, delivery, onlyAction, rec]);
  const visible = rows.slice(0, limit);
  const deliveries = [...new Set(candidates.map((c) => c.delivery_owner).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "es"));
  const allSel = rows.length > 0 && rows.every((r) => sel.includes(r.id));
  const run = (fn: () => Promise<ActionResult>) => start(async () => { setResult(await fn()); setSel([]); });
  // Selección rápida: el admin elige; la IA solo sugiere.
  const pick = (pred: (c: CandidateListItem) => boolean) => setSel(rows.filter(pred).map((r) => r.id));
  const countState = (s: PhaseState) => withPhases.filter(({ p }) => p[phaseOfState(s)] === s).length;
  const actionCount = candidates.filter((c) => needsAction(c.status)).length;
  const filtered = Boolean(state || phase || delivery || onlyAction || rec || q);
  const clear = () => { setState(""); setPhase(""); setDelivery(""); setOnlyAction(false); setRec(""); setQ(""); };

  return (
    <div className="stack adm-board">
      <nav className="adm-flow" aria-label="Flujo de admisión: filtra por fase y estado">
        {PHASES.map((ph, i) => (
          <section key={ph.key} className={`adm-flow-phase${phase === ph.key ? " on" : ""}`} aria-labelledby={`fl-${ph.key}`}>
            <button type="button" className="adm-flow-head" id={`fl-${ph.key}`} aria-pressed={phase === ph.key} onClick={() => { setPhase(phase === ph.key ? "" : ph.key); setState(""); }}>
              <span className="n">{i + 1}</span>
              <strong>{ph.label}</strong>
              <span className="muted">{withPhases.filter(({ p }) => p.current === ph.key).length} hoy aquí</span>
            </button>
            <ul>
              {ph.states.filter((s) => s !== "sin_iniciar" || countState(s) > 0).map((s) => (
                <li key={s}>
                  <button type="button" className={`adm-flow-state${state === s ? " on" : ""}`} aria-pressed={state === s} title={PHASE_STATE[s].hint} onClick={() => { setState(state === s ? "" : s); setPhase(""); }}>
                    <PhaseBadge state={s} />
                    <strong>{countState(s)}</strong>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>

      <div className="card adm-toolbar">
        <div className="adm-filters wide">
          <input type="search" placeholder="Buscar por nombre, correo, cliente o Delivery" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar candidatos" />
          <select value={phase} onChange={(e) => { setPhase(e.target.value as PhaseKey | ""); setState(""); }} aria-label="Filtrar por fase">
            <option value="">Todas las fases</option>
            {PHASES.map((ph) => <option key={ph.key} value={ph.key}>{ph.label}</option>)}
          </select>
          <select value={state} onChange={(e) => { setState(e.target.value as PhaseState | ""); setPhase(""); }} aria-label="Filtrar por estado">
            <option value="">Todos los estados</option>
            {PHASES.map((ph) => (
              <optgroup key={ph.key} label={ph.label}>{ph.states.map((s) => <option key={s} value={s}>{PHASE_STATE[s].label}</option>)}</optgroup>
            ))}
          </select>
          <select value={delivery} onChange={(e) => setDelivery(e.target.value)} aria-label="Filtrar por Delivery">
            <option value="">Todo Delivery</option>
            {deliveries.map((d) => <option key={d} value={d}>{d}</option>)}
            <option value={NO_DELIVERY}>Sin Delivery</option>
          </select>
          {isAdmin && (
            <select value={rec} onChange={(e) => setRec(e.target.value)} aria-label="Filtrar por propuesta IA">
              <option value="">Toda propuesta IA</option>
              {Object.entries(REC_LABEL).map(([k, v]) => <option key={k} value={k}>IA: {v}</option>)}
            </select>
          )}
          <button type="button" className={`adm-pill attention${onlyAction ? " on" : ""}`} aria-pressed={onlyAction} onClick={() => setOnlyAction(!onlyAction)}>
            Requieren intervención <strong>{actionCount}</strong>
          </button>
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
        <span>Mostrando <strong>{rows.length}</strong> de {candidates.length} candidato{candidates.length === 1 ? "" : "s"}{isAdmin && rows.length > limit ? " · «Seleccionar todo» incluye también las filas aún no visibles" : ""}</span>
        {filtered && (
          <>
            {phase && <span className="adm-tag">Fase: {PHASES.find((p) => p.key === phase)!.label}</span>}
            {state && <span className="adm-tag">{PHASE_STATE[state].label}</span>}
            {delivery && <span className="adm-tag">Delivery: {delivery === NO_DELIVERY ? "sin asignar" : delivery}</span>}
            {onlyAction && <span className="adm-tag">Requieren intervención</span>}
            {rec && <span className="adm-tag">IA: {REC_LABEL[rec]}</span>}
            {q && <span className="adm-tag">“{q}”</span>}
            <button type="button" className="link-btn" onClick={clear}>Limpiar filtros</button>
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
        <table className="rtable adm-table">
          <thead>
            <tr>
              {isAdmin && <th><input type="checkbox" aria-label="Seleccionar todo" checked={allSel} onChange={(e) => setSel(e.target.checked ? rows.map((r) => r.id) : [])} /></th>}
              <th>Candidato/a</th>
              <th>Delivery</th>
              <th>Postulación</th>
              <th>Assessment</th>
              <th>Decisión</th>
              <th>Incorporación</th>
              <th>Última actividad</th>
              {isAdmin && <th><span className="sr-only">Acciones</span></th>}
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => (
              <tr key={c.id} className={needsAction(c.status) ? "needs" : undefined}>
                {isAdmin && <td className="rt-check"><input type="checkbox" aria-label={`Seleccionar ${c.full_name}`} checked={sel.includes(c.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))} /></td>}
                <td className="rt-title">
                  <Link href={`/admin/admision/${waveId}/c/${c.id}`}><strong>{c.full_name}</strong></Link>
                  <br /><small className="muted">{shownEmail(c.corporate_email)}</small>
                  {(c.client_name || c.role_title) && <><br /><small className="muted">{[c.client_name, c.role_title].filter(Boolean).join(" · ")}</small></>}
                </td>
                <td data-label="Delivery">{c.delivery_owner ?? <span className="muted">Sin asignar</span>}</td>
                <td data-label="Postulación"><PhaseBadge state={c.phases.postulacion} /></td>
                <td data-label="Assessment">
                  {c.phases.assessment ? <PhaseBadge state={c.phases.assessment} /> : <span className="muted">—</span>}
                  {isAdmin && c.eval && <><br /><small className="muted">IA {c.eval.total.toFixed(0)} · nivel {c.eval.level}{c.eval.pl ? ` · ${PL_LABEL[c.eval.pl as PlRecommendation]}` : ""}</small></>}
                </td>
                <td data-label="Decisión">
                  {c.phases.decision ? <PhaseBadge state={c.phases.decision} /> : <span className="muted">—</span>}
                  {isAdmin && c.decision?.agrees_with_ai === false && <><br /><small className="pending-def">Difiere de la IA</small></>}
                </td>
                <td data-label="Incorporación">{c.phases.incorporacion ? <PhaseBadge state={c.phases.incorporacion} /> : <span className="muted">—</span>}</td>
                <td data-label="Última actividad"><small>{fmtActivity(c.last_activity)}</small>{c.lastEmail?.status === "failed" && <><br /><small className="error">Último correo falló</small></>}</td>
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
            {rows.length === 0 && <tr><td colSpan={9} className="muted">{candidates.length ? "No hay candidatos con estos filtros." : "Aún no hay postulaciones. Comparte el link de postulación con los profesionales."}</td></tr>}
          </tbody>
        </table>
      </div>
      {rows.length > limit && (
        <div className="adm-more">
          <span className="muted">Viendo {limit} de {rows.length}</span>
          <button type="button" className="btn ghost" onClick={() => setLimit((n) => n + PAGE)}>Mostrar {Math.min(PAGE, rows.length - limit)} más</button>
          <button type="button" className="link-btn" onClick={() => setLimit(rows.length)}>Ver todos</button>
        </div>
      )}
    </div>
  );
}

const PAGE = 50;
const NO_DELIVERY = "__sin__";
const phaseOfState = (s: PhaseState): PhaseKey => PHASES.find((ph) => ph.states.includes(s))!.key;
const fmtActivity = (iso: string) => new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

function toPhaseState(v: string): PhaseState | "" {
  if (!v) return "";
  if (v in PHASE_STATE) return v as PhaseState;
  const p = phasesOf(v);
  return (p[p.current] as PhaseState | null) ?? "";
}


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
  const enrolled = people.filter((p) => phasesOf(p.status).incorporacion === "inscrito");
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
