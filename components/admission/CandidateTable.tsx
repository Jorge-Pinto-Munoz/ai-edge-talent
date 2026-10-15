"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { CandidateListItem } from "@/lib/admission/queries";
import { deleteCandidates, evaluateCandidates, resendCandidateAccess, type ActionResult } from "@/lib/admission/admin-actions";
import { ADMISSION_LABEL, type AdmissionStatus } from "@/lib/domain/types";
import { Callout } from "@/components/ui";
import { phasesOf } from "@/lib/admission/phases";
import { PRIMARY_LABEL, QUEUE_CHIPS, queueView, type QueueChip } from "@/lib/admission/queue";
import { PL_LABEL, type PlRecommendation } from "@/lib/ai/rubric";
import { shownEmail } from "@/lib/talent/rules";
import { EvaluationDrawer } from "./EvaluationDrawer";

const REC_LABEL: Record<string, string> = { SELECTED: "Seleccionar", RESCUE_REQUIRED: "Activar rescate", HUMAN_REVIEW: "Revisión humana", NOT_SELECTED: "No seleccionar" };

/**
 * Admisión de la Wave en cuatro columnas: Candidato, Delivery, Estado y Evaluación y acción. Primero lo que
 * espera una decisión; una acción principal por fila y el resto en el menú. Delivery solo lee.
 */
export function CandidateTable({ waveId, candidates: all, isAdmin, initialChip = "todos" }: { waveId: string; candidates: CandidateListItem[]; isAdmin: boolean; initialChip?: QueueChip }) {
  const [q, setQ] = useState("");
  const [chip, setChip] = useState<QueueChip>(initialChip);
  const [delivery, setDelivery] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<string[] | null>(null);
  // Eliminados en esta sesión: desaparecen de la lista al instante (el servidor confirma).
  const [removed, setRemoved] = useState<string[]>([]);
  const candidates = useMemo(() => all.filter((c) => !removed.includes(c.id)), [all, removed]);
  const withView = useMemo(
    () => candidates.map((c) => ({ c, v: queueView({ status: c.status, hasEval: Boolean(c.eval), rescue: c.rescue, emailFailed: c.welcomeFailed }) })),
    [candidates],
  );
  const count = (k: QueueChip) => (k === "todos" ? withView.length : withView.filter(({ v }) => v.chips.includes(k)).length);

  const rows = useMemo(
    () =>
      withView
        .filter(({ c }) => !q || `${c.full_name} ${c.corporate_email} ${c.client_name ?? ""} ${c.delivery_owner ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        .filter(({ v }) => chip === "todos" || v.chips.includes(chip))
        .filter(({ c }) => !delivery || (delivery === NO_DELIVERY ? !c.delivery_owner : c.delivery_owner === delivery))
        .sort((a, b) => a.v.priority - b.v.priority || b.c.last_activity.localeCompare(a.c.last_activity)),
    [withView, q, chip, delivery],
  );
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => { setLimit(PAGE); }, [q, chip, delivery]);
  const visible = rows.slice(0, limit);
  const deliveries = [...new Set(candidates.map((c) => c.delivery_owner).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "es"));
  const allSel = rows.length > 0 && rows.every(({ c }) => sel.includes(c.id));
  const run = (fn: () => Promise<ActionResult>) => start(async () => { setResult(await fn()); setSel([]); });
  const evaluateOne = (id: string) => { setBusyId(id); start(async () => { setResult(await evaluateCandidates(waveId, [id])); setBusyId(null); }); };

  return (
    <div className="stack adm-board">
      <div className="adm-chips" role="toolbar" aria-label="Filtrar candidatos">
        {QUEUE_CHIPS.map((k) => (
          <button key={k.key} type="button" className={`adm-chip${chip === k.key ? " on" : ""}${k.key === "decision" && count("decision") ? " attention" : ""}`} aria-pressed={chip === k.key} onClick={() => setChip(k.key)}>
            {k.label} <strong>{count(k.key)}</strong>
          </button>
        ))}
      </div>
      <div className="adm-filters">
        <input type="search" placeholder="Buscar por nombre, correo, cliente o Delivery" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar candidatos" />
        <select value={delivery} onChange={(e) => setDelivery(e.target.value)} aria-label="Filtrar por Delivery">
          <option value="">Todo Delivery</option>
          {deliveries.map((d) => <option key={d} value={d}>{d}</option>)}
          <option value={NO_DELIVERY}>Sin Delivery</option>
        </select>
      </div>

      <div className="adm-showing" role="status" aria-live="polite">
        <span>Mostrando <strong>{rows.length}</strong> de {candidates.length}</span>
        {(q || delivery || chip !== "todos") && <button type="button" className="link-btn" onClick={() => { setQ(""); setDelivery(""); setChip("todos"); }}>Limpiar filtros</button>}
      </div>

      {isAdmin && sel.length > 0 && (
        <section className="card adm-bulk compact" aria-label="Acciones sobre la selección">
          <strong>{sel.length} seleccionado{sel.length === 1 ? "" : "s"}</strong>
          <button className="btn small" disabled={pending} onClick={() => run(() => evaluateCandidates(waveId, sel))}>Evaluar con IA</button>
          <button className="btn small adm-danger" disabled={pending} onClick={() => setToDelete(sel)}>Eliminar</button>
          <button type="button" className="link-btn" onClick={() => setSel([])}>Quitar selección</button>
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

      {pending && <p className="muted" role="status">Procesando… (la evaluación con IA puede tardar unos segundos por postulación)</p>}
      {result && (
        <Callout tone={result.ok ? "ok" : "bad"} title={result.message}>
          {result.details && result.details.length > 0 && <ul style={{ margin: 0 }}>{result.details.map((d) => <li key={d}><small>{d}</small></li>)}</ul>}
        </Callout>
      )}

      <div className="table-wrap" tabIndex={0}>
        <table className="rtable adm-table adm-q">
          <thead>
            <tr>
              {isAdmin && <th className="rt-check"><input type="checkbox" aria-label="Seleccionar todo" checked={allSel} onChange={(e) => setSel(e.target.checked ? rows.map(({ c }) => c.id) : [])} /></th>}
              <th>Candidato</th>
              <th>Delivery</th>
              <th>Estado</th>
              <th>{isAdmin ? "Evaluación y acción" : "Próximo paso"}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ c, v }) => {
              const rec = c.eval ? (c.eval.pl ? PL_LABEL[c.eval.pl as PlRecommendation] : REC_LABEL[c.eval.recommendation]) : null;
              return (
                <tr key={c.id} className={v.priority <= 3 ? "needs" : undefined}>
                  {isAdmin && <td className="rt-check"><input type="checkbox" aria-label={`Seleccionar ${c.full_name}`} checked={sel.includes(c.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))} /></td>}
                  <td className="rt-title">
                    <Link href={`/admin/admision/${waveId}/c/${c.id}`}><strong>{c.full_name}</strong></Link>
                    <br /><small className="muted">{shownEmail(c.corporate_email)}</small>
                  </td>
                  <td data-label="Delivery">{c.delivery_owner ?? <span className="muted">Sin asignar</span>}</td>
                  <td data-label="Estado"><span className={`ph-badge t-${v.badge.tone}`}>{v.badge.label}</span></td>
                  <td data-label={isAdmin ? "Evaluación" : "Próximo paso"}>
                    {isAdmin ? (
                      <div className="adm-evcell">
                        <span className="adm-ev">
                          {c.eval ? <><strong>{Math.round(c.eval.total)}</strong><small>/100</small>{rec && <small className="muted"> · {rec}</small>}</> : <small className="muted">Sin evaluación</small>}
                          {c.welcomeFailed && <><br /><small className="error">Correo de bienvenida falló</small></>}
                        </span>
                        <span className="adm-evact">
                          {v.primary && (
                            <button
                              type="button"
                              className={`btn small${v.primary === "evaluate_ai" ? " ghost" : ""}`}
                              disabled={pending && busyId === c.id}
                              onClick={() => (v.primary === "evaluate_ai" ? evaluateOne(c.id) : setDrawer(c.id))}
                            >
                              {pending && busyId === c.id ? "Evaluando…" : PRIMARY_LABEL[v.primary]}
                            </button>
                          )}
                          <RowMenu
                            name={c.full_name}
                            detailHref={`/admin/admision/${waveId}/c/${c.id}`}
                            onEvaluate={c.eval && v.primary !== "review" && v.primary !== "review_rescue" ? () => setDrawer(c.id) : undefined}
                            onResend={() => run(() => resendCandidateAccess(waveId, c.id))}
                            onDelete={() => setToDelete([c.id])}
                          />
                        </span>
                      </div>
                    ) : (
                      <small>{v.next}</small>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={isAdmin ? 5 : 4} className="muted">{candidates.length ? "No hay candidatos con estos filtros." : "Aún no hay postulaciones. Comparte el link de postulación con los profesionales."}</td></tr>}
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
      {drawer && isAdmin && <EvaluationDrawer candidateId={drawer} waveId={waveId} onClose={() => setDrawer(null)} />}
    </div>
  );
}

const PAGE = 50;
const NO_DELIVERY = "__sin__";

/** Menú de acciones de una fila (···): ver detalle, reenviar acceso y eliminar (acción destructiva, al final). */
function RowMenu({ name, detailHref, onEvaluate, onResend, onDelete }: { name: string; detailHref: string; onEvaluate?: () => void; onResend: () => void; onDelete: () => void }) {
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
          <Link role="menuitem" href={detailHref} onClick={() => setOpen(false)}>Ver ficha completa</Link>
          {onEvaluate && <button role="menuitem" type="button" onClick={item(onEvaluate)}>Ver evaluación</button>}
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
