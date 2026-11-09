"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { grantExtraAttempt } from "@/lib/journey/attempt-actions";
import { Icon } from "@/components/site/Icon";

/** Intentos del desafío de una persona y, si los agotó, el botón para darle uno extra (solo admin). */
export function GrantAttempt({ candidateId, capsuleId, name, used, max, extra, blocked }: { candidateId: string; capsuleId: string; name: string; used: number; max: number | null; extra: number; blocked: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  if (max === null) return null;
  const left = Math.max(0, max - used);
  return (
    <section className={`card ga-card${blocked ? " blocked" : ""}`} aria-label="Intentos del desafío">
      <div className="ga-head">
        <span className="ga-ico" aria-hidden="true"><Icon name={blocked ? "lock" : "cycle"} size={20} /></span>
        <div>
          <strong>{blocked ? `Usó sus ${max} intentos` : `Intentos no aprobados: ${used} de ${max}`}</strong>
          <p className="muted">
            {blocked ? "No puede volver a subir su entrega. Puedes darle un intento extra solo a esta persona." : left === 1 ? "Le queda 1 intento." : `Le quedan ${left} intentos.`}
            {extra > 0 && ` Incluye ${extra} intento${extra === 1 ? "" : "s"} extra dado${extra === 1 ? "" : "s"} por el admin.`}
          </p>
        </div>
        {!open && <button type="button" className={`btn small${blocked ? "" : " ghost"}`} onClick={() => setOpen(true)}>Dar un intento extra</button>}
      </div>
      {open && (
        <form className="ga-form" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await grantExtraAttempt(candidateId, capsuleId, note, notify); setMsg(r); if (r.ok) { setOpen(false); setNote(""); router.refresh(); } }); }}>
          <label className="field">Motivo (queda registrado)
            <textarea rows={2} maxLength={500} required value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej.: está cerca del puntaje y entendió el feedback; se acuerda un último ajuste." />
          </label>
          <label className="ga-check"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Avisarle por correo a {name.split(" ")[0]} (con copia a su Delivery)</label>
          <div className="row" style={{ gap: 8 }}>
            <button type="submit" className="btn small" disabled={pending}>{pending ? "Guardando…" : `Dar intento ${max + 1}`}</button>
            <button type="button" className="btn small ghost" onClick={() => setOpen(false)}>Cancelar</button>
          </div>
        </form>
      )}
      {msg && <p className={msg.ok ? "ok-text" : "error"} role="status" style={{ margin: 0 }}>{msg.message}</p>}
    </section>
  );
}
