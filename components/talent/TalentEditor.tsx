"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setHighTalent, updateServiceStatus, updateTalentProfile, type TalentResult } from "@/lib/talent/actions";
import { FAMILIES, SERVICE_LABEL, type ServiceStatus } from "@/lib/talent/rules";
import { Callout } from "@/components/ui";

interface T { id: string; specialty: string | null; specialty_family: string | null; current_client: string | null; role_title: string | null; notes: string | null; service_status: ServiceStatus; high_talent: boolean; high_talent_reason: string | null }

export function TalentEditor({ talent, isAdmin }: { talent: T; isAdmin: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<TalentResult | null>(null);
  const run = (fn: () => Promise<TalentResult>) => start(async () => { const r = await fn(); setMsg(r); if (r.ok) router.refresh(); });
  const [svc, setSvc] = useState<ServiceStatus>(talent.service_status);
  const [since, setSince] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState("");
  const [p, setP] = useState({ specialty: talent.specialty ?? "", family: talent.specialty_family ?? "", client: talent.current_client ?? "", role: talent.role_title ?? "", notes: talent.notes ?? "" });
  const [htReason, setHtReason] = useState(talent.high_talent_reason ?? "");

  return (
    <div className="stack">
    <div className="grid grid-2">
      <div className="card">
        <h2 className="h-card" style={{ marginTop: 0 }}>Estado de servicio</h2>
        <div className="grid grid-2">
          <div className="field"><label htmlFor="svc">Estado</label>
            <select id="svc" value={svc} onChange={(e) => setSvc(e.target.value as ServiceStatus)}>
              {Object.entries(SERVICE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="since">Desde (AAAA-MM-DD)</label><input id="since" type="text" value={since} onChange={(e) => setSince(e.target.value)} /></div>
        </div>
        <div className="field"><label htmlFor="reason">{svc === "LEFT" ? "Motivo de salida *" : "Nota (opcional)"}</label><input id="reason" type="text" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
        <button className="btn small" disabled={pending} onClick={() => run(() => updateServiceStatus(talent.id, svc, since, reason))}>Guardar estado</button>

        <h2 className="h-card" style={{ marginTop: 24 }}>High Talent</h2>
        {isAdmin ? (
          <>
            <div className="field"><label htmlFor="ht">Evidencia / motivo</label><input id="ht" type="text" value={htReason} onChange={(e) => setHtReason(e.target.value)} placeholder="p.ej. nivel A + caso con continuidad en Showcase" /></div>
            <div className="row">
              {!talent.high_talent && <button className="btn small" disabled={pending} onClick={() => run(() => setHighTalent(talent.id, true, htReason))}>Marcar High Talent</button>}
              {talent.high_talent && <button className="btn ghost small" disabled={pending} onClick={() => run(() => setHighTalent(talent.id, false, ""))}>Quitar High Talent</button>}
            </div>
          </>
        ) : <p className="muted"><small>Solo un admin marca High Talent.</small></p>}
      </div>
      <div className="card">
        <h2 className="h-card" style={{ marginTop: 0 }}>Ficha</h2>
        <div className="grid grid-2">
          <div className="field"><label htmlFor="sp">Especialidad</label><input id="sp" type="text" value={p.specialty} onChange={(e) => setP({ ...p, specialty: e.target.value })} /></div>
          <div className="field"><label htmlFor="fa">Cluster</label>
            <select id="fa" value={p.family} onChange={(e) => setP({ ...p, family: e.target.value })}>
              <option value="">Automático según especialidad</option>
              {FAMILIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div className="field"><label htmlFor="cl">Cliente actual</label><input id="cl" type="text" value={p.client} onChange={(e) => setP({ ...p, client: e.target.value })} /></div>
          <div className="field"><label htmlFor="ro">Rol</label><input id="ro" type="text" value={p.role} onChange={(e) => setP({ ...p, role: e.target.value })} /></div>
        </div>
        <div className="field"><label htmlFor="no">Notas</label><textarea id="no" rows={3} value={p.notes} onChange={(e) => setP({ ...p, notes: e.target.value })} /></div>
        <button className="btn small" disabled={pending} onClick={() => run(() => updateTalentProfile(talent.id, p))}>Guardar ficha</button>
      </div>
    </div>
      {msg && <Callout tone={msg.ok ? "ok" : "bad"} title={msg.message} />}
    </div>
  );
}
