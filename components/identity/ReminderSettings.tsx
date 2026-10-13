"use client";

import { useState, useTransition } from "react";
import { saveReminderSettings, type AdminResult } from "@/lib/identity/admin-actions";

/** Frecuencia de recordatorios de pulsos pendientes y aviso al Delivery. */
export function ReminderSettings({ value }: { value: { every_days: number; max: number; delivery_after_days: number } }) {
  const [v, setV] = useState(value);
  const [res, setRes] = useState<AdminResult | null>(null);
  const [busy, start] = useTransition();
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV((x) => ({ ...x, [k]: Number(e.target.value) }));
  return (
    <form className="card stack narrow" onSubmit={(e) => { e.preventDefault(); start(async () => setRes(await saveReminderSettings(v))); }}>
      <h2 style={{ margin: 0 }}>Recordatorios de pulsos pendientes</h2>
      <p className="muted" style={{ margin: 0 }}>Cuando un profesional completa los requisitos de su etapa y aún no responde su pulso, recibe un recordatorio por correo. Un proceso diario los envía sin duplicar.</p>
      <div className="field"><label htmlFor="rs-e">Recordar cada (días)</label><input id="rs-e" type="number" min={1} max={30} value={v.every_days} onChange={set("every_days")} /></div>
      <div className="field"><label htmlFor="rs-m">Máximo de recordatorios por etapa</label><input id="rs-m" type="number" min={0} max={10} value={v.max} onChange={set("max")} /></div>
      <div className="field"><label htmlFor="rs-d">Avisar al Delivery después de (días pendiente)</label><input id="rs-d" type="number" min={1} max={60} value={v.delivery_after_days} onChange={set("delivery_after_days")} /></div>
      {res && <p className={res.ok ? "uc-ok" : "error"}>{res.message}</p>}
      <button className="btn" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
    </form>
  );
}
