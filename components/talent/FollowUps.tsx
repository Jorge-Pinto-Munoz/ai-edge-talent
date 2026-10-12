"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { recordFollowUp, scheduleFollowUps, type TalentResult } from "@/lib/talent/actions";
import { Callout, fmtDate } from "@/components/ui";

interface FU { id: string; wave_id: string | null; kind: string; due_date: string; done_at: string | null; adoption: number | null; still_using_ai: boolean | null; impact: string | null; client_perception: string | null; next_step: string | null }
const KIND: Record<string, string> = { MONTH_1: "Mes 1 · percepción y adopción", MONTH_3: "Mes 3 · impacto real", CUSTOM: "Seguimiento" };

export function FollowUps({ talentId, waves, items }: { talentId: string; waves: { id: string; name: string }[]; items: FU[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<TalentResult | null>(null);
  const [wave, setWave] = useState(waves[0]?.id ?? "");
  const [base, setBase] = useState(new Date().toISOString().slice(0, 10));
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Seguimiento post-habilitación</h3>
      <p className="muted">Mes 1: ¿adoptó las herramientas y cómo lo percibe el cliente? Mes 3: ¿se cumplió la promesa de agilidad? ¿hay impacto real?</p>
      <div className="row">
        <select value={wave} onChange={(e) => setWave(e.target.value)} style={{ width: "auto" }} aria-label="Wave">{waves.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
        <input type="text" value={base} onChange={(e) => setBase(e.target.value)} style={{ maxWidth: 140 }} aria-label="Fecha base" />
        <button className="btn small" disabled={pending || !wave} onClick={() => start(async () => { const r = await scheduleFollowUps(talentId, wave, base); setMsg(r); if (r.ok) router.refresh(); })}>Programar Mes 1 y Mes 3</button>
        <small className="muted">Fecha base: cierre de la Wave o del Showcase.</small>
      </div>
      {msg && <div style={{ marginTop: 10 }}><Callout tone={msg.ok ? "ok" : "bad"} title={msg.message} /></div>}
      <div className="stack" style={{ marginTop: 12 }}>
        {items.map((f) => (f.done_at ? (
          <div key={f.id} className="callout ok">
            <strong>{KIND[f.kind]} · realizado {fmtDate(f.done_at)}</strong>
            Adopción {f.adoption}/5 · {f.still_using_ai ? "sigue usando IA" : "no sigue usando IA"}{f.impact ? ` · Impacto: ${f.impact}` : ""}{f.client_perception ? ` · Cliente: ${f.client_perception}` : ""}{f.next_step ? ` · Próximo paso: ${f.next_step}` : ""}
          </div>
        ) : <PendingFU key={f.id} f={f} overdue={f.due_date <= today} onDone={(r) => { setMsg(r); if (r.ok) router.refresh(); }} />))}
        {items.length === 0 && <p className="muted">Sin seguimientos programados.</p>}
      </div>
    </div>
  );
}

function PendingFU({ f, overdue, onDone }: { f: FU; overdue: boolean; onDone: (r: TalentResult) => void }) {
  const [v, setV] = useState({ adoption: 3, stillUsingAi: true, impact: "", clientPerception: "", nextStep: "" });
  const [pending, start] = useTransition();
  return (
    <div className="card" style={{ borderColor: overdue ? "var(--st-warn)" : undefined }}>
      <div className="spread"><strong>{KIND[f.kind]}</strong><small className={overdue ? "pending-def" : "muted"}>{overdue ? "Vencido · " : ""}{f.due_date}</small></div>
      <div className="grid grid-3" style={{ marginTop: 8 }}>
        <div className="field"><label htmlFor={`ad-${f.id}`}>Adopción de IA (1–5)</label>
          <select id={`ad-${f.id}`} value={v.adoption} onChange={(e) => setV({ ...v, adoption: Number(e.target.value) })}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select>
        </div>
        <label className="check"><input type="checkbox" checked={v.stillUsingAi} onChange={(e) => setV({ ...v, stillUsingAi: e.target.checked })} /><span>Sigue usando IA en el servicio</span></label>
      </div>
      <div className="grid grid-3">
        <div className="field"><label htmlFor={`im-${f.id}`}>Impacto / evidencia</label><input id={`im-${f.id}`} type="text" value={v.impact} onChange={(e) => setV({ ...v, impact: e.target.value })} /></div>
        <div className="field"><label htmlFor={`cp-${f.id}`}>Percepción del cliente</label><input id={`cp-${f.id}`} type="text" value={v.clientPerception} onChange={(e) => setV({ ...v, clientPerception: e.target.value })} /></div>
        <div className="field"><label htmlFor={`ns-${f.id}`}>Próximo paso</label><input id={`ns-${f.id}`} type="text" value={v.nextStep} onChange={(e) => setV({ ...v, nextStep: e.target.value })} /></div>
      </div>
      <button className="btn small" disabled={pending} onClick={() => start(async () => onDone(await recordFollowUp(f.id, v)))}>Registrar seguimiento</button>
    </div>
  );
}
