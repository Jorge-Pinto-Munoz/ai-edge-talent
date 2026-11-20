"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { previewReWelcome, sendReWelcomeAll } from "@/lib/journey/welcome-actions";
import { Icon } from "@/components/site/Icon";

/** Role Enablement: correo con lo que deben hacer los profesionales en la plataforma (vista previa y envío en lote). */
export function ReWelcomeCard({ waveId, total, pending }: { waveId: string; total: number; pending: string[] }) {
  const router = useRouter();
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, start] = useTransition();
  const sent = total - pending.length;
  return (
    <section className="adm-card rew" aria-label="Instrucciones de Role Enablement para los profesionales">
      <div className="ps-head">
        <span className="ps-ico" aria-hidden="true"><Icon name="send" size={20} /></span>
        <div>
          <h2>Instrucciones para los profesionales</h2>
          <p className="muted">
            Correo «Bienvenido/a a Role Enablement»: 4 sesiones con check-in, reporte semanal de avance AI CERT, registro de la certificación y pulso de cierre.
            Sale solo a quien llega a la etapa; aquí lo envías a quienes ya estaban. Va con copia a su Delivery y nunca se duplica.
          </p>
        </div>
      </div>
      <div className="ps-stats">
        <div><strong>{total}</strong><small>En Role Enablement</small></div>
        <div><strong>{sent}</strong><small>Ya recibieron las instrucciones</small></div>
        <div className={pending.length ? "warn" : ""}><strong>{pending.length}</strong><small>Por enviar</small></div>
      </div>
      {pending.length > 0 && <p className="muted" style={{ margin: 0 }}><small>Por enviar: {pending.join(", ")}.</small></p>}
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn small ghost" disabled={busy} onClick={() => start(async () => { const r = await previewReWelcome(); if (r.ok && r.data) setPreview(r.data); else setMsg(r); })}>Ver el correo</button>
        {pending.length > 0 && (
          <button type="button" className="btn small" disabled={busy} onClick={() => confirm(`¿Enviar las instrucciones a ${pending.length} persona(s) con copia a su Delivery?`) && start(async () => { const r = await sendReWelcomeAll(waveId); setMsg(r); router.refresh(); })}>
            {busy ? "Enviando…" : `Enviar a ${pending.length} pendiente(s)`}
          </button>
        )}
      </div>
      {msg && <p className={msg.ok ? "ok-text" : "error"} role="status" style={{ margin: 0 }}>{msg.message}</p>}
      {preview && (
        <div className="adm-modal" role="dialog" aria-modal="true" aria-label="Vista previa del correo" onKeyDown={(e) => e.key === "Escape" && setPreview(null)}>
          <div className="adm-modal-card mail-preview">
            <h2>Vista previa</h2>
            <p><strong>Asunto:</strong> {preview.subject}</p>
            <iframe title="Correo de bienvenida a Role Enablement" srcDoc={preview.html} sandbox="" className="mail-frame" />
            <div className="row"><button type="button" className="btn small" autoFocus onClick={() => setPreview(null)}>Cerrar</button></div>
          </div>
        </div>
      )}
    </section>
  );
}
