"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type CSSProperties } from "react";
import { setWaveReference } from "@/lib/admission/admin-actions";
import { capacityView } from "@/lib/admission/phases";
import { Icon } from "@/components/site/Icon";

/**
 * Seleccionados respecto de la referencia de la Wave. La referencia orienta la planificación: no limita las
 * postulaciones ni la selección. La barra llega como máximo al 100 % y el excedente se informa aparte.
 */
export function CapacityMeter({ waveId, selected, received, reference, canEdit }: { waveId: string; selected: number; received: number; reference: number; canEdit: boolean }) {
  const v = capacityView(selected, reference);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(v.reference));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const save = () => start(async () => {
    const r = await setWaveReference(waveId, Number(value));
    setMsg(r.ok ? null : r.message);
    if (r.ok) { setEditing(false); router.refresh(); }
  });

  return (
    <section className={`cap${v.reached ? " reached" : ""}`} aria-labelledby={`cap-${waveId}`}>
      <div className="cap-head">
        <div>
          <h2 id={`cap-${waveId}`}>Selección respecto de la referencia</h2>
          <p className="muted">La referencia orienta la planificación: no limita postulaciones ni selecciones.</p>
        </div>
        {canEdit && !editing && <button type="button" className="btn ghost small" onClick={() => { setValue(String(v.reference)); setEditing(true); }}>Editar referencia</button>}
        {canEdit && editing && (
          <form className="cap-edit" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <label htmlFor={`cap-in-${waveId}`}>Referencia</label>
            <input id={`cap-in-${waveId}`} type="number" inputMode="numeric" min={1} max={500} value={value} onChange={(e) => setValue(e.target.value)} />
            <button className="btn small" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button>
            <button type="button" className="btn ghost small" onClick={() => { setEditing(false); setMsg(null); }}>Cancelar</button>
          </form>
        )}
      </div>

      <div className="cap-main">
        <p className="cap-figure"><strong>{v.selected}</strong> <span>de {v.reference} seleccionados</span></p>
        <div className="cap-bar" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v.pct} aria-label={`Seleccionados: ${v.selected} de una referencia de ${v.reference}`}>
          <span style={{ "--w": v.pct / 100 } as CSSProperties} />
        </div>
        <small className="muted">{v.pct}% de la referencia</small>
      </div>

      <dl className="cap-stats">
        <div><dt>Referencia</dt><dd>{v.reference}</dd></div>
        <div><dt>Seleccionados</dt><dd>{v.selected}</dd></div>
        <div><dt>{v.over ? "Sobre la referencia" : "Disponibles respecto de la referencia"}</dt><dd>{v.over ? `+${v.over}` : v.available}</dd></div>
        <div><dt>Postulaciones recibidas</dt><dd>{received}</dd></div>
      </dl>

      {v.over > 0 ? (
        <p className="cap-note" role="status"><Icon name="alert" size={16} /> Referencia superada: hay {v.over === 1 ? "1 profesional adicional" : `${v.over} profesionales adicionales`}. No es un error; puedes seguir seleccionando si el programa lo decide.</p>
      ) : v.reached ? (
        <p className="cap-note" role="status"><Icon name="alert" size={16} /> Se alcanzó la referencia de {v.reference} profesionales. Puedes seleccionar más si el programa lo decide.</p>
      ) : null}
      {msg && <p className="error" role="alert">{msg}</p>}
    </section>
  );
}
