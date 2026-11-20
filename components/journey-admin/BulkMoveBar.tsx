"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { moveMany } from "@/lib/journey/move-actions";
import { layerName, type Layer } from "@/lib/journey/rules";
import { Icon } from "@/components/site/Icon";

/**
 * Barra para pasar a varias personas a la siguiente etapa (siempre visible para el admin): se activa al marcar
 * casillas en la lista. Cada persona queda registrada y, si se marca, recibe su correo con copia a su Delivery.
 */
export function BulkMoveBar({ selected, total, to, onSelectAll, onClear, extra }: { selected: string[]; total: number; to: Layer | null; onSelectAll: () => void; onClear: () => void; extra?: ReactNode }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [msg, setMsg] = useState<{ ok: boolean; message: string; details?: string[] } | null>(null);
  const [pending, start] = useTransition();
  if (!to && !extra) return null;
  const n = selected.length;
  return (
    <div className={`bulk-move${n ? " on" : ""}`} role="region" aria-label="Pasar a la siguiente etapa">
      <div className="bm-row">
        <span className="bm-ico" aria-hidden="true"><Icon name="arrowRight" size={18} /></span>
        <strong>{n ? `${n} seleccionado${n === 1 ? "" : "s"}` : "Marca a las personas que pasan"}</strong>
        <button type="button" className="link-btn" onClick={n === total ? onClear : onSelectAll}>{n === total && n > 0 ? "Quitar selección" : `Seleccionar todos (${total})`}</button>
        <span className="bm-spacer" />
        {extra}
        {to && <button
          type="button"
          className="btn small"
          disabled={!n || pending}
          onClick={() => to && confirm(`¿Pasar a ${n} persona(s) a ${layerName(to)}?${notify ? " Recibirán un correo con copia a su Delivery." : ""}`) && start(async () => { const r = await moveMany(selected, to!, note, notify); setMsg(r); if (r.ok) { onClear(); setNote(""); } router.refresh(); })}
        >
          {pending ? "Moviendo…" : `Pasar a ${layerName(to)}`}
        </button>}
      </div>
      {n > 0 && to && (
        <div className="bm-row">
          <input type="text" aria-label="Motivo (opcional, va en el correo)" placeholder="Motivo (opcional, va en el correo)" value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
          <label className="bm-check"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} /> Avisar por correo</label>
        </div>
      )}
      {msg && (
        <div className={msg.ok ? "ok-text" : "error"} role="status">
          {msg.message}
          {msg.details?.length ? <ul>{msg.details.map((d) => <li key={d}><small>{d}</small></li>)}</ul> : null}
        </div>
      )}
    </div>
  );
}
