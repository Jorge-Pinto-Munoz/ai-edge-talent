"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { assignCertification } from "@/lib/aicert/assign-actions";
import { CERT_OPTIONS } from "@/lib/aicert/certs";

/** Elegir la certificación AI CERT de una persona (o de varias seleccionadas). Se guarda al elegir. */
export function CertAssign({ waveId, ids, value, label }: { waveId: string; ids: string[]; value: string | null; label?: string }) {
  const router = useRouter();
  const [v, setV] = useState(value ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const options = value && !(CERT_OPTIONS as readonly string[]).includes(value) ? [value, ...CERT_OPTIONS] : [...CERT_OPTIONS];
  return (
    <span className="cert-assign">
      <select
        aria-label={label ?? "Certificación AI CERT"}
        value={v}
        disabled={pending || !ids.length}
        onChange={(e) => {
          const next = e.target.value;
          setV(next);
          start(async () => { const r = await assignCertification(waveId, ids, next); setMsg(r.ok ? null : r); if (r.ok) router.refresh(); });
        }}
      >
        <option value="">{ids.length > 1 ? "Asignar certificación…" : "Sin asignar"}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {msg && <small className="error">{msg.message}</small>}
    </span>
  );
}
