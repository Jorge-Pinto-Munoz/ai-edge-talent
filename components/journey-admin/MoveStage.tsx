"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moveParticipant, type MoveResult } from "@/lib/journey/move-actions";
import type { Layer } from "@/lib/journey/rules";
import { Callout } from "@/components/ui";

const STAGES: { id: Layer; name: string }[] = [
  { id: "AI_MINDSET", name: "AI First Mindset" },
  { id: "ROLE_ENABLEMENT", name: "Role Enablement" },
  { id: "AI_LAB_SHOWCASE", name: "AI Lab & Showcase" },
  { id: "CLOSURE", name: "Cierre" },
];

/** Admin: mover a un participante a cualquier etapa, con nota y aviso por correo (copia a su Delivery). */
export function MoveStage({ candidateId, name, current, enrolled }: { candidateId: string; name: string; current: Layer | null; enrolled: boolean }) {
  const [to, setTo] = useState<Layer | "">("");
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [res, setRes] = useState<MoveResult | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const currentName = current ? STAGES.find((s) => s.id === current)?.name ?? current : enrolled ? "AI First Mindset (por iniciar)" : "Admisión · aún no inscrito/a";
  const target = STAGES.find((s) => s.id === to);
  return (
    <section id="etapa" className="card move-stage" aria-labelledby="ms-t">
      <div className="spread">
        <div>
          <h2 id="ms-t" className="h-card" style={{ margin: 0 }}>Etapa del journey</h2>
          <p className="muted" style={{ margin: "4px 0 0" }}>Actual: <strong>{currentName}</strong></p>
        </div>
      </div>
      <div className="move-grid">
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="ms-to">Mover a</label>
          <select id="ms-to" value={to} onChange={(e) => { setTo(e.target.value as Layer | ""); setRes(null); }}>
            <option value="">Elige una etapa…</option>
            {STAGES.map((s) => <option key={s.id} value={s.id} disabled={s.id === current}>{s.name}{s.id === current ? " (actual)" : ""}</option>)}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="ms-note">Motivo (se incluye en el correo)</label>
          <input id="ms-note" type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: completó AI First Mindset fuera de la plataforma" />
        </div>
      </div>
      <label className="check" style={{ margin: "10px 0 0" }}>
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        <span>Avisarle por correo (con copia a su Delivery)</span>
      </label>
      {target && (
        <p className="muted" style={{ margin: "10px 0 0" }}>
          <small>
            {name} pasará a <strong>{target.name}</strong> sin exigir requisitos ni pulso de cierre de la etapa actual.
            {!enrolled ? " Además quedará inscrito/a y con acceso a su portal." : ""} Queda registrado a tu nombre.
          </small>
        </p>
      )}
      {res && <div style={{ marginTop: 10 }}><Callout tone={res.ok ? (res.email === "failed" ? "warn" : "ok") : "bad"} title={res.message} /></div>}
      <div className="row" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="btn small"
          disabled={!to || pending}
          onClick={() => {
            if (!target || !confirm(`¿Mover a ${name} a ${target.name}?${notify ? " Se le enviará un correo." : ""}`)) return;
            start(async () => {
              const r = await moveParticipant(candidateId, target.id, note, notify);
              setRes(r);
              if (r.ok) { setTo(""); setNote(""); router.refresh(); }
            });
          }}
        >
          {pending ? "Moviendo…" : "Mover de etapa"}
        </button>
      </div>
    </section>
  );
}
