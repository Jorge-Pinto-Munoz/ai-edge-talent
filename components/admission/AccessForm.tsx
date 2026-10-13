"use client";

import { useState, useTransition } from "react";
import { grantRole, type ActionResult } from "@/lib/admission/admin-actions";
import { Callout } from "@/components/ui";

export function AccessForm({ waves }: { waves: { id: string; name: string }[] }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "delivery" | "client" | "kiber" | "hub" | "mentor">("delivery");
  const [wave, setWave] = useState(waves[0]?.id ?? "");
  const [client, setClient] = useState("");
  const [r, setR] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="card" onSubmit={(e) => { e.preventDefault(); start(async () => setR(await grantRole(email, role, client, role === "hub" ? wave : undefined))); }}>
      <div className="grid grid-3">
        <div className="field"><label htmlFor="ae">Correo</label><input id="ae" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="field">
          <label htmlFor="ar">Rol</label>
          <select id="ar" value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
            <option value="admin">Admin (liderazgo)</option><option value="delivery">Delivery</option><option value="hub">Líder Hub AI</option><option value="mentor">AI Coach</option><option value="client">Cliente</option><option value="kiber">Kiber</option>
          </select>
        </div>
        {(role === "hub") && (
          <div className="field">
            <label htmlFor="aw">Wave</label>
            <select id="aw" value={wave} onChange={(e) => setWave(e.target.value)}>
              {waves.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}
        {role === "client" && <div className="field"><label htmlFor="ac">Cliente</label><input id="ac" type="text" required value={client} onChange={(e) => setClient(e.target.value)} /></div>}
      </div>
      <button className="btn" disabled={pending}>Guardar acceso</button>
      {r && <div style={{ marginTop: 10 }}><Callout tone={r.ok ? "ok" : "bad"} title={r.message} /></div>}
    </form>
  );
}
