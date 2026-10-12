"use client";

import { useState, useTransition } from "react";
import { deleteLabProject, passToLab, saveLabProject, saveLabSession, saveShowcase } from "@/lib/hub/actions";
import { LAB_DECISIONS, LAB_STATUS, type LabDecision, type LabMode, type LabStatus } from "@/lib/hub/rules";
import { Callout } from "@/components/ui";

type Msg = { ok: boolean; message: string; details?: string[] } | null;
function Feedback({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <Callout tone={msg.ok ? "ok" : "bad"} title={msg.message}>
        {msg.details?.length ? <ul style={{ margin: "6px 0 0" }}>{msg.details.map((d) => <li key={d}>{d}</li>)}</ul> : null}
      </Callout>
    </div>
  );
}

/* ───────── Pase al Lab ───────── */
export type GatePerson = { id: string; name: string; role: string | null; client: string | null; cert: string; ready: boolean };

export function PassToLab({ waveId, people, readOnly }: { waveId: string; people: GatePerson[]; readOnly: boolean }) {
  const [sel, setSel] = useState<string[]>([]);
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  if (people.length === 0) return <div className="empty"><span>Nadie está en Role Enablement en este momento.</span></div>;
  const ready = people.filter((p) => p.ready);
  return (
    <>
      <div className="table-wrap" tabIndex={0}>
        <table>
          <thead><tr>{!readOnly && <th style={{ width: 36 }}><input type="checkbox" aria-label="Seleccionar a todos los habilitados" checked={ready.length > 0 && sel.length === ready.length} onChange={(e) => setSel(e.target.checked ? ready.map((p) => p.id) : [])} /></th>}<th>Participante</th><th>AI CERT</th><th>Gate</th></tr></thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id}>
                {!readOnly && <td><input type="checkbox" aria-label={`Seleccionar a ${p.name}`} disabled={!p.ready} checked={sel.includes(p.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id)))} /></td>}
                <td><strong>{p.name}</strong><br /><small className="muted">{[p.role, p.client].filter(Boolean).join(" · ")}</small></td>
                <td>{p.cert}</td>
                <td>{p.ready ? <span className="badge ok">Habilitado</span> : <span className="badge">Falta certificación verificada</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <div className="row" style={{ gap: 8, marginTop: 12 }}>
          <button type="button" className="btn" disabled={pending || sel.length === 0} onClick={() => start(async () => { const r = await passToLab(waveId, sel); setMsg({ ok: r.ok, message: r.message, details: r.data }); setSel([]); })}>
            Pasar {sel.length || ""} al Lab
          </button>
          <small className="muted">Sin certificación verificada no se pasa: las excepciones las registra el Product Lead en Journey.</small>
        </div>
      )}
      <Feedback msg={msg} />
    </>
  );
}

/* ───────── Clase 1 y Clase 2 ───────── */
export function LabSessionForm({ waveId, n, heldOn, notes, projects, entries, readOnly }: {
  waveId: string;
  n: 1 | 2;
  heldOn: string | null;
  notes: string | null;
  projects: { id: string; title: string; members: string }[];
  entries: { project_id: string; attended: boolean | null; note: string | null }[];
  readOnly: boolean;
}) {
  const [date, setDate] = useState(heldOn ?? "");
  const [text, setText] = useState(notes ?? "");
  const [rows, setRows] = useState(projects.map((p) => { const e = entries.find((x) => x.project_id === p.id); return { projectId: p.id, attended: e?.attended ?? null, note: e?.note ?? "" }; }));
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const upd = (i: number, patch: Partial<(typeof rows)[number]>) => setRows((r) => r.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  return (
    <div className="stack" style={{ gap: 12 }}>
      <div className="grid grid-2">
        <div className="field"><label htmlFor={`ls-d-${n}`}>Fecha de la clase</label><input id={`ls-d-${n}`} type="date" disabled={readOnly} value={date} onChange={(e) => setDate(e.target.value)} /></div>
      </div>
      {projects.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}><small>Crea los proyectos en la pestaña Proyectos para registrar qué trajo cada uno.</small></p>
      ) : (
        <div className="table-wrap" tabIndex={0}>
          <table>
            <thead><tr><th>Proyecto</th><th>Asistió</th><th>{n === 1 ? "Qué idea trajo" : "Qué construyó"}</th></tr></thead>
            <tbody>
              {projects.map((p, i) => (
                <tr key={p.id}>
                  <td><strong>{p.title}</strong><br /><small className="muted">{p.members}</small></td>
                  <td><input type="checkbox" aria-label={`Asistencia de ${p.title}`} disabled={readOnly} checked={rows[i].attended ?? false} onChange={(e) => upd(i, { attended: e.target.checked })} /></td>
                  <td><input type="text" aria-label={`Nota de ${p.title}`} disabled={readOnly} value={rows[i].note} onChange={(e) => upd(i, { note: e.target.value })} placeholder={n === 1 ? "Problema, cliente y alcance" : "Prototipo, resultados, qué falta"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="field"><label htmlFor={`ls-n-${n}`}>Notas de la clase</label><textarea id={`ls-n-${n}`} rows={3} disabled={readOnly} value={text} onChange={(e) => setText(e.target.value)} placeholder="Qué pasó, acuerdos, grupos que se formaron, próximos pasos." /></div>
      {!readOnly && <div><button type="button" className="btn" disabled={pending} onClick={() => start(async () => setMsg(await saveLabSession({ waveId, n, heldOn: date, notes: text, entries: rows })))}>Guardar Clase {n}</button></div>}
      <Feedback msg={msg} />
    </div>
  );
}

/* ───────── Proyecto ───────── */
export type ProjectDraft = { id?: string; title: string; problem: string; clientName: string; mode: LabMode; status: LabStatus; hubNotes: string; memberIds: string[] };

export function ProjectForm({ waveId, initial, people, onDone }: { waveId: string; initial: ProjectDraft; people: { id: string; name: string; taken: boolean }[]; onDone?: () => void }) {
  const [p, setP] = useState<ProjectDraft>(initial);
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const set = (patch: Partial<ProjectDraft>) => setP((x) => ({ ...x, ...patch }));
  const toggle = (id: string, on: boolean) => set({ memberIds: p.mode === "INDIVIDUAL" ? (on ? [id] : []) : on ? [...p.memberIds, id] : p.memberIds.filter((x) => x !== id) });
  return (
    <form className="stack" style={{ gap: 12 }} onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await saveLabProject({ ...p, waveId }); setMsg(r); if (r.ok) { if (!p.id) setP({ ...initial }); onDone?.(); } }); }}>
      <div className="grid grid-2">
        <div className="field"><label htmlFor={`pt-${p.id ?? "new"}`}>Nombre del proyecto *</label><input id={`pt-${p.id ?? "new"}`} type="text" required value={p.title} onChange={(e) => set({ title: e.target.value })} /></div>
        <div className="field"><label htmlFor={`pc-${p.id ?? "new"}`}>Cliente</label><input id={`pc-${p.id ?? "new"}`} type="text" value={p.clientName} onChange={(e) => set({ clientName: e.target.value })} /></div>
      </div>
      <div className="field"><label htmlFor={`pp-${p.id ?? "new"}`}>Desafío / problema real</label><textarea id={`pp-${p.id ?? "new"}`} rows={2} value={p.problem} onChange={(e) => set({ problem: e.target.value })} /></div>
      <div className="grid grid-2">
        <div className="field">
          <span className="label">Modalidad</span>
          <div className="seg" role="radiogroup" aria-label="Modalidad">
            {(["INDIVIDUAL", "GROUP"] as LabMode[]).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={p.mode === m} className={`seg-btn ${p.mode === m ? "on" : ""}`} onClick={() => set({ mode: m, memberIds: m === "INDIVIDUAL" ? p.memberIds.slice(0, 1) : p.memberIds })}>{m === "INDIVIDUAL" ? "Individual" : "Grupal"}</button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor={`ps-${p.id ?? "new"}`}>Estado</label>
          <select id={`ps-${p.id ?? "new"}`} value={p.status} onChange={(e) => set({ status: e.target.value as LabStatus })}>
            {LAB_STATUS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>
      <fieldset className="member-pick">
        <legend>{p.mode === "INDIVIDUAL" ? "Persona" : "Integrantes"}</legend>
        {people.length === 0 && <small className="muted">Aún no hay participantes en el Lab.</small>}
        {people.map((x) => (
          <label key={x.id} className={`chip-check ${x.taken && !p.memberIds.includes(x.id) ? "off" : ""}`}>
            <input type={p.mode === "INDIVIDUAL" ? "radio" : "checkbox"} name={`m-${p.id ?? "new"}`} checked={p.memberIds.includes(x.id)} disabled={x.taken && !p.memberIds.includes(x.id)} onChange={(e) => toggle(x.id, e.target.checked)} />
            {x.name}
          </label>
        ))}
      </fieldset>
      <div className="field"><label htmlFor={`ph-${p.id ?? "new"}`}>Notas del Hub</label><textarea id={`ph-${p.id ?? "new"}`} rows={2} value={p.hubNotes} onChange={(e) => set({ hubNotes: e.target.value })} placeholder="Avance, riesgos, apoyo que necesita." /></div>
      <div className="row" style={{ gap: 8 }}>
        <button className="btn" disabled={pending}>{p.id ? "Guardar cambios" : "Crear proyecto"}</button>
        {p.id && (
          <button type="button" className="btn ghost danger" disabled={pending} onClick={() => { if (confirm("¿Eliminar el proyecto y sus archivos?")) start(async () => setMsg(await deleteLabProject(p.id!))); }}>Eliminar</button>
        )}
      </div>
      <Feedback msg={msg} />
    </form>
  );
}

/* ───────── Showcase ───────── */
export function ShowcaseForm({ projectId, date, decision, notes, readOnly }: { projectId: string; date: string | null; decision: LabDecision | null; notes: string | null; readOnly: boolean }) {
  const [d, setD] = useState(date ?? "");
  const [dec, setDec] = useState<LabDecision | "">(decision ?? "");
  const [n, setN] = useState(notes ?? "");
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="grid grid-2">
        <div className="field"><label htmlFor={`sd-${projectId}`}>Fecha de presentación</label><input id={`sd-${projectId}`} type="date" disabled={readOnly} value={d} onChange={(e) => setD(e.target.value)} /></div>
        <div className="field">
          <label htmlFor={`sx-${projectId}`}>Resultado</label>
          <select id={`sx-${projectId}`} disabled={readOnly} value={dec} onChange={(e) => setDec(e.target.value as LabDecision | "")}>
            <option value="">Sin decidir</option>
            {LAB_DECISIONS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </select>
        </div>
      </div>
      <div className="field"><label htmlFor={`sn-${projectId}`}>Feedback del Showcase</label><textarea id={`sn-${projectId}`} rows={2} disabled={readOnly} value={n} onChange={(e) => setN(e.target.value)} placeholder="Qué valoró el panel, impacto esperado, próximos pasos." /></div>
      {!readOnly && <div><button type="button" className="btn small" disabled={pending} onClick={() => start(async () => setMsg(await saveShowcase(projectId, { date: d, decision: dec, notes: n })))}>Guardar Showcase</button></div>}
      <Feedback msg={msg} />
    </div>
  );
}
