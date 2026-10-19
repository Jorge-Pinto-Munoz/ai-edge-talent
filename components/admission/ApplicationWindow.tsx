"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setApplicationWindow, type ActionResult } from "@/lib/admission/admin-actions";
import { applicationWindow, WINDOW_LABEL } from "@/lib/admission/window";
import { chileToIso, isoToChileLocal } from "@/lib/time/chile";
import { Callout } from "@/components/ui";

const fmt = (iso: string) => new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

/** Abrir o cerrar las postulaciones de la Wave y definir su rango (hora de Chile). Solo Administración. */
export function ApplicationWindow({ waveId, opensAt, deadline, hidden }: { waveId: string; opensAt: string | null; deadline: string | null; hidden: boolean }) {
  const state = applicationWindow({ application_opens_at: opensAt, application_deadline: deadline });
  const [editing, setEditing] = useState(false);
  const [from, setFrom] = useState(opensAt ? isoToChileLocal(opensAt) : "");
  const [to, setTo] = useState(deadline ? isoToChileLocal(deadline) : "");
  const [hide, setHide] = useState(hidden);
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const save = (v: { opensAt: string | null; deadline: string | null; hidden: boolean }) =>
    start(async () => { const r = await setApplicationWindow(waveId, v); setMsg(r); if (r.ok) { setEditing(false); router.refresh(); } });

  const range = state === "scheduled" ? `Abren ${fmt(opensAt!)}${deadline ? ` · cierran ${fmt(deadline)}` : ""}` : state === "open" ? (deadline ? `Cierran ${fmt(deadline)}` : "Sin fecha de cierre") : deadline ? `Cerraron ${fmt(deadline)}` : "";

  return (
    <section className={`card appwin st-${state}`} aria-labelledby="aw-h">
      <div className="appwin-head">
        <div>
          <h2 id="aw-h" className="h-card" style={{ margin: 0 }}>Postulaciones <span className={`appwin-state st-${state}`}>{WINDOW_LABEL[state]}</span></h2>
          <p className="muted" style={{ margin: "4px 0 0" }}>{range}{hidden && deadline ? " · fecha oculta a los postulantes" : ""}</p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {state === "open" ? (
            <button type="button" className="btn ghost small" disabled={pending} onClick={() => confirm("¿Cerrar las postulaciones ahora? Nadie podrá registrarse ni enviar su Assessment.") && save({ opensAt, deadline: new Date().toISOString(), hidden })}>Cerrar ahora</button>
          ) : (
            <button type="button" className="btn small" disabled={pending} onClick={() => save({ opensAt: null, deadline: deadline && Date.parse(deadline) > Date.now() ? deadline : null, hidden })}>Abrir ahora</button>
          )}
          <button type="button" className="btn ghost small" onClick={() => setEditing((x) => !x)} aria-expanded={editing}>Definir rango</button>
        </div>
      </div>
      {editing && (
        <form className="appwin-form" onSubmit={(e) => { e.preventDefault(); save({ opensAt: from ? chileToIso(from) : null, deadline: to ? chileToIso(to) : null, hidden: hide }); }}>
          <div className="field"><label htmlFor="aw-from">Abren (opcional)</label><input id="aw-from" type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="field"><label htmlFor="aw-to">Cierran (vacío = sin cierre)</label><input id="aw-to" type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <label className="check"><input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} /><span>No mostrar la fecha de cierre a los postulantes</span></label>
          <div className="row" style={{ gap: 8 }}><button className="btn small" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button><button type="button" className="btn ghost small" onClick={() => setEditing(false)}>Cancelar</button></div>
          <p className="hint" style={{ margin: 0 }}>Horas en hora de Chile.</p>
        </form>
      )}
      {msg && !msg.ok && <Callout tone="bad" title={msg.message} />}
    </section>
  );
}
