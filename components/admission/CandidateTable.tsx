"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { CandidateListItem } from "@/lib/admission/queries";
import { deleteCandidates, evaluateCandidates, resendCandidateAccess, type ActionResult } from "@/lib/admission/admin-actions";
import { ADMISSION_LABEL, type AdmissionStatus } from "@/lib/domain/types";
import { Callout } from "@/components/ui";
import { phasesOf } from "@/lib/admission/phases";
import { NEXT_LABEL, QUEUE_CHIPS, nextStep, queueView, type NextStep, type QueueChip } from "@/lib/admission/queue";
import { PL_LABEL, type PlRecommendation } from "@/lib/ai/rubric";
import { shownEmail } from "@/lib/talent/rules";
import { homologate, orgKey } from "@/lib/text/org";
import { EvaluationDrawer } from "./EvaluationDrawer";
import { BulkDecisionDialog, type BulkKind } from "./BulkDecisionDialog";
import { useRouter } from "next/navigation";

const REC_LABEL: Record<string, string> = { SELECTED: "Seleccionar", RESCUE_REQUIRED: "Activar rescate", HUMAN_REVIEW: "Revisión humana", NOT_SELECTED: "No seleccionar" };

/**
 * Admisión de la Wave: Candidato, Cliente, Delivery, Estado y Evaluación. Cada fila abre «Detalles»; el siguiente
 * paso recomendado (seleccionar, rescate, no seleccionar) se ejecuta desde la barra de lo marcado o el menú «···»,
 * siempre con confirmación. Delivery solo lee.
 */
export function CandidateTable({ waveId, candidates: all, isAdmin, initialChip = "todos" }: { waveId: string; candidates: CandidateListItem[]; isAdmin: boolean; initialChip?: QueueChip }) {
  const [q, setQ] = useState("");
  const [chip, setChip] = useState<QueueChip>(initialChip);
  const [delivery, setDelivery] = useState("");
  const [client, setClient] = useState("");
  // Orden por defecto: mayor puntaje arriba (sin evaluación al final). Alternativa: por prioridad de acción.
  const [sort, setSort] = useState<SortKey>("score");
  const [sel, setSel] = useState<string[]>([]);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<{ id: string; step: "view" | "select" } | null>(null);
  const [bulk, setBulk] = useState<BulkKind | null>(null);
  const [step, setStep] = useState<Exclude<NextStep, null> | "">("");
  const router = useRouter();
  const [toDelete, setToDelete] = useState<string[] | null>(null);
  // Eliminados en esta sesión: desaparecen de la lista al instante (el servidor confirma).
  const [removed, setRemoved] = useState<string[]>([]);
  const candidates = useMemo(() => all.filter((c) => !removed.includes(c.id)), [all, removed]);
  const showClient = useMemo(() => homologate(all.map((c) => c.client_name)), [all]);
  const showRole = useMemo(() => homologate(all.map((c) => c.role_title)), [all]);
  const withView = useMemo(
    () =>
      candidates.map((c) => {
        const v = queueView({ status: c.status, hasEval: Boolean(c.eval), rescue: c.rescue, emailFailed: c.welcomeFailed });
        return { c, v, next: nextStep({ status: c.status, eval: c.eval, hadRescue: Boolean(c.rescue) }, v) };
      }),
    [candidates],
  );
  const count = (k: QueueChip) => (k === "todos" ? withView.length : withView.filter(({ v }) => v.chips.includes(k)).length);

  const rows = useMemo(
    () =>
      withView
        .filter(({ c }) => !q || `${c.full_name} ${c.corporate_email} ${c.client_name ?? ""} ${c.delivery_owner ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        .filter(({ v }) => chip === "todos" || v.chips.includes(chip))
        .filter(({ c }) => !delivery || (delivery === NO_DELIVERY ? !c.delivery_owner : c.delivery_owner === delivery))
        .filter(({ next }) => !step || next === step)
        .filter(({ c }) => !client || (client === NO_CLIENT ? !orgKey(c.client_name) : orgKey(c.client_name) === client))
        .sort((a, b) =>
          sort === "priority"
            ? a.v.priority - b.v.priority || b.c.last_activity.localeCompare(a.c.last_activity)
            : (sort === "client" ? byClient(showClient(a.c.client_name), showClient(b.c.client_name)) : 0) ||
              (b.c.eval?.total ?? -1) - (a.c.eval?.total ?? -1) || a.v.priority - b.v.priority || a.c.full_name.localeCompare(b.c.full_name, "es"),
        ),
    [withView, q, chip, delivery, client, sort, showClient, step],
  );
  const [limit, setLimit] = useState(PAGE);
  useEffect(() => { setLimit(PAGE); }, [q, chip, delivery, client, sort, step]);
  const visible = rows.slice(0, limit);
  // Clientes y roles homologados: el mismo cliente escrito de distintas formas se ve y se filtra como uno solo.
  const clients = [...new Map(candidates.filter((c) => orgKey(c.client_name)).map((c) => [orgKey(c.client_name), showClient(c.client_name)!])).entries()].sort((a, b) => a[1].localeCompare(b[1], "es"));
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
        <select value={client} onChange={(e) => setClient(e.target.value)} aria-label="Filtrar por cliente">
          <option value="">Todo cliente</option>
          {clients.map(([k, name]) => <option key={k} value={k}>{name}</option>)}
          <option value={NO_CLIENT}>Sin cliente</option>
        </select>
        <select value={step} onChange={(e) => setStep(e.target.value as Exclude<NextStep, null> | "")} aria-label="Filtrar por siguiente paso">
          <option value="">Todo siguiente paso</option>
          {(Object.keys(NEXT_LABEL) as Exclude<NextStep, null>[]).filter((k) => withView.some((x) => x.next === k)).map((k) => (
            <option key={k} value={k}>{NEXT_LABEL[k]} ({withView.filter((x) => x.next === k).length})</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Ordenar">
          <option value="score">Mayor puntaje primero</option>
          <option value="priority">Prioridad de acción</option>
          <option value="client">Cliente (A–Z)</option>
        </select>
      </div>

      <div className="adm-showing" role="status" aria-live="polite">
        <span>Mostrando <strong>{rows.length}</strong> de {candidates.length}</span>
        {(q || delivery || client || step || chip !== "todos") && <button type="button" className="link-btn" onClick={() => { setQ(""); setDelivery(""); setClient(""); setStep(""); setChip("todos"); }}>Limpiar filtros</button>}
      </div>

      {isAdmin && sel.length > 0 && (() => {
        // Acciones según el siguiente paso recomendado de cada persona marcada; cada botón actúa solo sobre las suyas.
        const marked = withView.filter(({ c }) => sel.includes(c.id));
        const of = (k: NextStep) => marked.filter((x) => x.next === k).map((x) => x.c);
        const individual = marked.filter((x) => x.next === "review" || x.next === "review_rescue" || x.next === "decide_expired").length;
        const retry = of("retry_eval");
        return (
          <section className="card adm-bulk compact" aria-label="Acciones sobre la selección">
            <strong>{sel.length} marcado{sel.length === 1 ? "" : "s"}</strong>
            <span className="muted">Siguiente paso:</span>
            {of("select").length > 0 && <button className="btn small adm-go" disabled={pending} onClick={() => setBulk("select")}>Seleccionar ({of("select").length})</button>}
            {of("rescue").length > 0 && <button className="btn small adm-violet" disabled={pending} onClick={() => setBulk("rescue")}>Ofrecer rescate ({of("rescue").length})</button>}
            {of("reject").length > 0 && <button className="btn small ghost" disabled={pending} onClick={() => setBulk("reject")}>No seleccionar ({of("reject").length})</button>}
            {retry.length > 0 && <button className="btn small ghost" disabled={pending} onClick={() => run(() => evaluateCandidates(waveId, retry.map((c) => c.id)))}>Reintentar evaluación ({retry.length})</button>}
            {individual > 0 && <small className="muted">{individual} requiere{individual === 1 ? "" : "n"} revisión individual (abre «Detalles»)</small>}
            {marked.every((x) => !x.next) && <small className="muted">Sin decisiones pendientes en lo marcado.</small>}
            <PopMenu label="Más acciones sobre lo marcado">
              {(close) => (
                <>
                  <button role="menuitem" type="button" onClick={() => { close(); setSel([]); }}>Quitar selección</button>
                  <hr />
                  <button role="menuitem" type="button" className="danger" onClick={() => { close(); setToDelete(sel); }}>Eliminar ({sel.length})</button>
                </>
              )}
            </PopMenu>
          </section>
        );
      })()}

      {toDelete && (
        <DeleteDialog
          people={candidates.filter((c) => toDelete.includes(c.id))}
          pending={pending}
          onCancel={() => setToDelete(null)}
          onConfirm={(o) => start(async () => {
            const ids = toDelete;
            const r = await deleteCandidates(waveId, ids, o);
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
              <th aria-sort={sort === "client" ? "ascending" : "none"}>
                <button type="button" className="th-sort" onClick={() => setSort(sort === "client" ? "score" : "client")} title="Ordenar por cliente">Cliente {sort === "client" ? "▲" : "↕"}</button>
              </th>
              <th>Delivery</th>
              <th>Estado</th>
              <th>Evaluación y acción</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ c, v, next }) => {
              const rec = c.eval ? (c.eval.pl ? PL_LABEL[c.eval.pl as PlRecommendation] : REC_LABEL[c.eval.recommendation]) : null;
              return (
                <tr key={c.id} className={v.priority <= 3 ? "needs" : undefined}>
                  {isAdmin && <td className="rt-check"><input type="checkbox" aria-label={`Seleccionar ${c.full_name}`} checked={sel.includes(c.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))} /></td>}
                  <td className="rt-title">
                    <Link href={`/admin/admision/${waveId}/c/${c.id}`}><strong>{c.full_name}</strong></Link>
                    {c.role_title && <span className="adm-org">{showRole(c.role_title)}</span>}
                    <small className="muted">{shownEmail(c.corporate_email)}</small>
                  </td>
                  <td data-label="Cliente">{showClient(c.client_name) ?? <span className="muted">—</span>}</td>
                  <td data-label="Delivery">{c.delivery_owner ?? <span className="muted">Sin asignar</span>}</td>
                  <td data-label="Estado"><span className={`ph-badge t-${v.badge.tone}`}>{v.badge.label}</span></td>
                  <td data-label="Evaluación">
                    <div className="adm-evcell">
                        <span className="adm-ev">
                          {c.eval ? <><strong>{Math.round(c.eval.total)}</strong><small>/100</small>{rec && <small className="muted"> · {rec}</small>}</> : <small className="muted">Sin evaluación</small>}
                          {c.welcomeFailed && <><br /><small className="error">Correo de bienvenida falló</small></>}
                        </span>
                        <span className="adm-evact">
                          <Link className="btn small ghost" href={`/admin/admision/${waveId}/c/${c.id}`}>Detalles</Link>
                          {isAdmin && (
                            <PopMenu label={`Acciones para ${c.full_name}`}>
                              {(close) => (
                                <>
                                  {next && next !== "retry_eval" && <button role="menuitem" type="button" className="strong" onClick={() => { close(); setDrawer({ id: c.id, step: next === "select" ? "select" : "view" }); }}>{NEXT_LABEL[next]}…</button>}
                                  {next === "retry_eval" && <button role="menuitem" type="button" className="strong" disabled={pending && busyId === c.id} onClick={() => { close(); evaluateOne(c.id); }}>{pending && busyId === c.id ? "Evaluando…" : NEXT_LABEL.retry_eval}</button>}
                                  {c.eval && <button role="menuitem" type="button" onClick={() => { close(); setDrawer({ id: c.id, step: "view" }); }}>Ver evaluación</button>}
                                  <button role="menuitem" type="button" onClick={() => { close(); run(() => resendCandidateAccess(waveId, c.id)); }}>Reenviar acceso</button>
                                  <hr />
                                  <button role="menuitem" type="button" className="danger" onClick={() => { close(); setToDelete([c.id]); }}>Eliminar candidato</button>
                                </>
                              )}
                            </PopMenu>
                          )}
                        </span>
                      </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={isAdmin ? 6 : 5} className="muted">{candidates.length ? "No hay candidatos con estos filtros." : "Aún no hay postulaciones. Comparte el link de postulación con los profesionales."}</td></tr>}
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
      {drawer && isAdmin && <EvaluationDrawer candidateId={drawer.id} waveId={waveId} initialStep={drawer.step} onClose={() => setDrawer(null)} />}
      {bulk && (
        <BulkDecisionDialog
          kind={bulk}
          people={withView.filter((x) => sel.includes(x.c.id) && x.next === bulk).map((x) => x.c)}
          skipped={withView.filter((x) => sel.includes(x.c.id) && x.next !== bulk).map((x) => x.c)}
          onClose={(done) => { setBulk(null); if (done) { setSel([]); router.refresh(); } }}
        />
      )}
    </div>
  );
}

const PAGE = 50;
const NO_DELIVERY = "__sin__";
const NO_CLIENT = "__sin_cliente__";
type SortKey = "score" | "priority" | "client";
/** Por cliente (A–Z, sin cliente al final); a igual cliente sigue el puntaje. */
const byClient = (a: string | null | undefined, b: string | null | undefined) => (a ? (b ? a.localeCompare(b, "es") : -1) : b ? 1 : 0);

/** Menú «···» (por fila y en la barra de lo marcado): lo destructivo va al final. */
function PopMenu({ label, children }: { label: string; children: (close: () => void) => React.ReactNode }) {
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
  return (
    <div className="row-menu" ref={ref}>
      <button ref={btn} type="button" className="row-menu-btn" aria-haspopup="menu" aria-expanded={open} aria-label={label} onClick={() => setOpen(!open)}>
        <span aria-hidden="true">···</span>
      </button>
      {open && (
        <div className="row-menu-pop" role="menu" aria-label={label} style={pos ?? undefined}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/**
 * Confirmación de la eliminación: nombra a la persona y explica las consecuencias. Una persona: Cancelar o
 * Eliminar candidato. Varias a la vez: además se escribe ELIMINAR, para no borrar por accidente.
 */
function DeleteDialog({ people, pending, onCancel, onConfirm, error }: { people: CandidateListItem[]; pending: boolean; onCancel: () => void; onConfirm: (o: { account: boolean; confirm: string; force: boolean; notify: boolean; reason: string }) => void; error: string | null }) {
  const many = people.length > 1;
  const enrolled = people.filter((p) => phasesOf(p.status).incorporacion === "inscrito");
  const [account, setAccount] = useState(true);
  const [notify, setNotify] = useState(enrolled.length > 0);
  const [reason, setReason] = useState("");
  const [text, setText] = useState("");
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => { cancel.current?.focus(); }, []);
  // Varias personas o alguien inscrito: hay que escribir ELIMINAR.
  const strict = many || enrolled.length > 0;
  const ready = !strict || text.trim().toUpperCase() === "ELIMINAR";
  return (
    <div className="adm-modal" role="alertdialog" aria-modal="true" aria-labelledby="del-t" aria-describedby="del-d" onKeyDown={(e) => e.key === "Escape" && !pending && onCancel()}>
      <div className="adm-modal-card">
        <h2 id="del-t">{many ? `¿Eliminar ${people.length} candidatos?` : enrolled.length ? `¿Dar de baja a ${people[0]?.full_name}?` : `¿Eliminar a ${people[0]?.full_name}?`}</h2>
        {many ? <ul className="adm-del-list">{people.map((p) => <li key={p.id}><strong>{p.full_name}</strong> <small className="muted">{shownEmail(p.corporate_email)}</small></li>)}</ul> : <p className="muted">{shownEmail(people[0]?.corporate_email ?? "")} · {ADMISSION_LABEL[people[0]?.status as AdmissionStatus]}</p>}
        <p id="del-d">Se eliminan sus respuestas, evaluaciones, decisiones e historial de admisión{enrolled.length ? ", y también su avance en el journey (entregas, progreso, pulsos y certificaciones)" : ""}. Podrá postular de nuevo con el mismo correo. Queda registrado a tu nombre en la auditoría. <strong>Esta acción no se puede deshacer.</strong></p>
        {enrolled.length > 0 && <p className="error">{enrolled.length === 1 ? "Esta persona ya está inscrita" : `${enrolled.length} personas ya están inscritas`} en el programa: se dará de baja.</p>}
        <label className="check"><input type="checkbox" checked={account} onChange={(e) => setAccount(e.target.checked)} /> <span>Partir desde cero: eliminar también su cuenta del portal y el registro de correos enviados. <small className="muted">Las cuentas con rol interno (admin, Delivery…) se mantienen.</small></span></label>
        <label className="check"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> <span>Avisar por correo a la persona, con copia a su Delivery.</span></label>
        {notify && <div className="field"><label htmlFor="del-r">Motivo para el correo (opcional)</label><textarea id="del-r" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: a solicitud del cliente por cambio de asignación." /></div>}
        {strict && <div className="field"><label htmlFor="del-c">Escribe <strong>ELIMINAR</strong> para confirmar</label><input id="del-c" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" /></div>}
        {error && <p className="error" role="alert">{error}</p>}
        <div className="adm-modal-actions">
          <button ref={cancel} type="button" className="btn ghost" onClick={onCancel} disabled={pending}>Cancelar</button>
          <button type="button" className="btn adm-danger" disabled={pending || !ready} onClick={() => onConfirm({ account, confirm: strict ? text : "ELIMINAR", force: enrolled.length > 0, notify, reason })}>{pending ? "Eliminando…" : many ? `Eliminar ${people.length} candidatos` : enrolled.length ? "Dar de baja" : "Eliminar candidato"}</button>
        </div>
      </div>
    </div>
  );
}
