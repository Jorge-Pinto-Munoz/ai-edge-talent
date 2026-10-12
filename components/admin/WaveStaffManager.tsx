"use client";

import { useState, useTransition } from "react";
import { addWaveStaff, removeWaveStaff, type ActionResult } from "@/lib/admission/admin-actions";
import { Callout } from "@/components/ui";

/** Admin: quién es profesor/a o líder del Hub AI en esta Wave (por correo, aunque aún no haya ingresado). */
export function WaveStaffManager({ waveId, role, people }: { waveId: string; role: "profesor" | "hub"; people: { email: string; name: string | null }[] }) {
  const [email, setEmail] = useState("");
  const [r, setR] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const label = role === "profesor" ? "profesor/a" : "líder del Hub AI";
  return (
    <section className="adm-card">
      <div className="adm-card-head">
        <h2>{role === "profesor" ? "Profesores de la Wave" : "Líderes del Hub AI de la Wave"}</h2>
        <span className="muted">Solo admin</span>
      </div>
      {people.length === 0 ? (
        <p className="muted" style={{ marginTop: 0 }}>Aún no hay {label} asignado/a.</p>
      ) : (
        <ul className="staff-list">
          {people.map((p) => (
            <li key={p.email}>
              <span><strong>{p.name ?? p.email}</strong>{p.name && <small className="muted"> · {p.email}</small>}</span>
              <button type="button" className="btn ghost small" disabled={pending} onClick={() => start(async () => setR(await removeWaveStaff(waveId, p.email, role)))}>Quitar</button>
            </li>
          ))}
        </ul>
      )}
      <form className="row" style={{ gap: 8, flexWrap: "wrap" }} onSubmit={(e) => { e.preventDefault(); start(async () => { const x = await addWaveStaff(waveId, email, role); setR(x); if (x.ok) setEmail(""); }); }}>
        <input type="email" required aria-label={`Correo del ${label}`} placeholder="correo@kibernum.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: "1 1 220px" }} />
        <button className="btn small" disabled={pending}>Agregar {label}</button>
      </form>
      {r && <div style={{ marginTop: 10 }}><Callout tone={r.ok ? "ok" : "bad"} title={r.message} /></div>}
    </section>
  );
}
