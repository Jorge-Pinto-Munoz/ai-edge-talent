"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeMyPin } from "@/lib/identity/actions";
import { setCommunityConsent } from "@/lib/identity/profile-actions";

export function ProfileForms({ hasPin, pinSetAt, community, communityText, communityDetail, isPro }: { hasPin: boolean; pinSetAt: string | null; community: string | null; communityText: string; communityDetail: string; isPro: boolean }) {
  const router = useRouter();
  const [cur, setCur] = useState("");
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [cmsg, setCmsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, start] = useTransition();
  const pinInput = (id: string, label: string, v: string, set: (x: string) => void) => (
    <div className="field"><label htmlFor={id}>{label}</label><input id={id} type="password" inputMode="numeric" pattern="\\d{4}" maxLength={4} autoComplete={id === "pp-c" ? "current-password" : "new-password"} value={v} onChange={(e) => set(e.target.value.replace(/\D/g, ""))} /></div>
  );
  return (
    <>
      <form className="card stack" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await changeMyPin(cur, p1, p2); setMsg(r); if (r.ok) { setCur(""); setP1(""); setP2(""); } }); }}>
        <h2 style={{ margin: 0 }}>{hasPin ? "Cambiar mi código personal" : "Crear mi código personal"}</h2>
        <p className="muted" style={{ margin: 0 }}>{hasPin && pinSetAt ? `Último cambio: ${new Date(pinSetAt).toLocaleDateString("es-CL")}.` : "Aún no tienes código personal."} Nunca lo mostramos ni lo conoce nadie del equipo.</p>
        <div className="pp-grid">
          {hasPin && pinInput("pp-c", "Código actual", cur, setCur)}
          {pinInput("pp-1", "Nuevo código", p1, setP1)}
          {pinInput("pp-2", "Confirmar código", p2, setP2)}
        </div>
        {msg && <p className={msg.ok ? "uc-ok" : "error"} role={msg.ok ? "status" : "alert"}>{msg.message}</p>}
        <button className="btn" disabled={busy || p1.length !== 4 || p2.length !== 4 || (hasPin && cur.length !== 4)}>Guardar código</button>
      </form>
      {isPro && (
        <section className="card stack">
          <h2 style={{ margin: 0 }}>Comunidad AI Edge Talent</h2>
          <p style={{ margin: 0 }}>{communityText}</p>
          <p className="muted" style={{ margin: 0 }}>{communityDetail}</p>
          <p style={{ margin: 0 }}><strong>{community ? `Autorizado desde el ${new Date(community).toLocaleDateString("es-CL")}.` : "No autorizado."}</strong></p>
          {cmsg && <p className={cmsg.ok ? "uc-ok" : "error"}>{cmsg.message}</p>}
          <button type="button" className={`btn ${community ? "ghost" : ""}`} disabled={busy} onClick={() => start(async () => { const r = await setCommunityConsent(!community); setCmsg(r); router.refresh(); })}>{community ? "Retirar mi autorización" : "Quiero sumarme al grupo"}</button>
        </section>
      )}
    </>
  );
}
