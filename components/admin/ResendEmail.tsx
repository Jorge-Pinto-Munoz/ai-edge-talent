"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { resendEmail } from "@/lib/email/resend-actions";
import { Callout } from "@/components/ui";

export function ResendEmail({ id, to, disabled }: { id: string; to: string; disabled?: string }) {
  const [other, setOther] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (dest?: string) => start(async () => { const r = await resendEmail(id, dest); setMsg(r); if (r.ok) router.refresh(); });
  if (disabled) return <p className="muted" style={{ margin: 0 }}><small>{disabled}</small></p>;
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "end" }}>
        <button type="button" className="btn small" disabled={pending} onClick={() => confirm(`¿Reenviar este correo a ${to}?`) && run()}>{pending ? "Enviando…" : "Reenviar"}</button>
        <input type="email" placeholder="…o a otro correo" value={other} onChange={(e) => setOther(e.target.value)} aria-label="Reenviar a otro correo" style={{ maxWidth: 260 }} />
        <button type="button" className="btn ghost small" disabled={pending || !other.trim()} onClick={() => run(other)}>Enviar a ese correo</button>
      </div>
      {msg && <Callout tone={msg.ok ? "ok" : "bad"} title={msg.message} />}
    </div>
  );
}
