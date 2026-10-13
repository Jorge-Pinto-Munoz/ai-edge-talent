"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideAccessRequest, type AdminResult } from "@/lib/identity/admin-actions";
import { LAYERS, type Layer } from "@/lib/journey/rules";

export interface RequestRow { id: string; created_at: string; name: string; email: string; phone: string | null; reason: string; description: string; status: string; decided_at: string | null; decision_note: string | null; resume_layer: string | null }
const REASON: Record<string, string> = { RETOMA: "Retoma el programa", WAVE_ANTERIOR: "Participó en una Wave anterior", HISTORICO: "Registros históricos", MIGRACION: "Problema de cuenta o migración", OTRO: "Otro caso" };
const fmt = (iso: string) => new Date(iso).toLocaleString("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Bandeja de solicitudes de acceso especial: solo el Líder de Servicio (admin) decide, con justificación. */
export function AccessRequests({ rows, candidatesByEmail, existing }: { rows: RequestRow[]; candidatesByEmail: Record<string, { id: string; label: string }[]>; existing: Record<string, string | null> }) {
  const pending = rows.filter((r) => r.status === "PENDING");
  const done = rows.filter((r) => r.status !== "PENDING");
  return (
    <div className="stack">
      {pending.length === 0 && <p className="help-none">No hay solicitudes pendientes.</p>}
      {pending.map((r) => <Decide key={r.id} r={r} cands={candidatesByEmail[r.email] ?? []} account={existing[r.email]} />)}
      {done.length > 0 && (
        <details className="card"><summary><strong>Resueltas ({done.length})</strong></summary>
          <ul className="ud-hist">{done.map((r) => <li key={r.id}><strong>{r.name}</strong> · {r.email} · {r.status === "APPROVED" ? "Aprobada" : "Rechazada"} {r.decided_at ? `· ${fmt(r.decided_at)}` : ""}<br /><small className="muted">{r.decision_note}</small></li>)}</ul>
        </details>
      )}
    </div>
  );
}

function Decide({ r, cands, account }: { r: RequestRow; cands: { id: string; label: string }[]; account: string | null }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [layer, setLayer] = useState<Layer | "">("");
  const [cand, setCand] = useState(cands[0]?.id ?? "");
  const [res, setRes] = useState<AdminResult | null>(null);
  const [busy, start] = useTransition();
  const go = (decision: "APPROVED" | "REJECTED") => start(async () => { const x = await decideAccessRequest(r.id, { decision, note, resumeLayer: layer, candidateId: cand }); setRes(x); if (x.ok) router.refresh(); });
  return (
    <article className="card ar">
      <div className="spread"><div><strong>{r.name}</strong> · {r.email}{r.phone ? ` · ${r.phone}` : ""}</div><small className="muted">{fmt(r.created_at)}</small></div>
      <p style={{ margin: "6px 0" }}><span className="badge">{REASON[r.reason] ?? r.reason}</span> {account ? <span className="badge">Cuenta existente: {account}</span> : <span className="badge">Sin cuenta</span>}</p>
      <p className="muted" style={{ margin: "0 0 12px" }}>{r.description}</p>
      <div className="ar-grid">
        <div className="field"><label htmlFor={`ar-c-${r.id}`}>Postulación / antecedentes</label>
          <select id={`ar-c-${r.id}`} value={cand} onChange={(e) => setCand(e.target.value)}><option value="">Sin postulación registrada</option>{cands.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
        <div className="field"><label htmlFor={`ar-l-${r.id}`}>Continúa desde la etapa</label>
          <select id={`ar-l-${r.id}`} value={layer} onChange={(e) => setLayer(e.target.value as Layer | "")} disabled={!cand}><option value="">Mantener su etapa actual</option>{LAYERS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
      </div>
      <div className="field"><label htmlFor={`ar-n-${r.id}`}>Justificación de la decisión</label><textarea id={`ar-n-${r.id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <p className="muted ud-note">Aprobar habilita su cuenta (o la reactiva) y le envía un código temporal. No modifica resultados de evaluación.</p>
      {res && <p className={res.ok ? "uc-ok" : "error"} role={res.ok ? "status" : "alert"}>{res.message}{res.devCode && <><br /><small>Desarrollo: código <strong>{res.devCode}</strong></small></>}</p>}
      <div className="ud-actions">
        <button type="button" className="btn small" disabled={busy} onClick={() => go("APPROVED")}>Aprobar y enviar acceso</button>
        <button type="button" className="btn small ghost" disabled={busy} onClick={() => go("REJECTED")}>Rechazar</button>
      </div>
    </article>
  );
}
