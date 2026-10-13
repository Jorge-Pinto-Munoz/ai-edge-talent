"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setCommunityConsent } from "@/lib/identity/profile-actions";

export function ProfileForms({ community, communityText, communityDetail, isPro }: { community: string | null; communityText: string; communityDetail: string; isPro: boolean }) {
  const router = useRouter();
  const [cmsg, setCmsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, start] = useTransition();
  return (
    <>
      <section className="card stack">
        <h2 style={{ margin: 0 }}>Cómo ingresas</h2>
        <p className="muted" style={{ margin: 0 }}>Ingresas con tu correo y un código de 6 dígitos que te enviamos en el momento. No hay contraseñas ni códigos que recordar, y nadie del equipo puede ver tus códigos.</p>
      </section>
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
