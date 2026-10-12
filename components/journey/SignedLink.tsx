"use client";

import { useEffect, useState } from "react";
import { signedFileUrl } from "@/lib/journey/actions";
import { embedUrl } from "@/lib/journey/rules";

/** Enlace de descarga: pide una URL firmada al momento del clic (vence en 10 min). */
export function SignedLink({ bucket, path, children }: { bucket: "content" | "submissions" | "certificates"; path: string; children: React.ReactNode }) {
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        className="link-context"
        style={{ background: "none", border: 0, borderTop: "2px solid var(--accent)", cursor: "pointer", font: "inherit" }}
        onClick={async () => {
          // La ventana se abre en el mismo gesto del clic (si no, el navegador la bloquea como popup)
          // y recibe la URL firmada apenas el servidor la entrega.
          const w = window.open("", "_blank");
          const r = await signedFileUrl(bucket, path);
          if (r.ok && r.data && w) {
            w.opener = null;
            w.location.href = r.data.url;
          } else {
            w?.close();
            setErr(r.ok ? "Permite ventanas emergentes para ver el archivo." : r.message);
          }
        }}
      >
        {children}
      </button>
      {err && <small className="error"> {err}</small>}
    </>
  );
}

/** Reproductor: enlace externo (YouTube/Vimeo/Stream) o archivo en Storage. */
export function VideoPlayer({ url, path, title }: { url: string | null; path: string | null; title: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    if (!url && path) signedFileUrl("content", path).then((r) => alive && r.ok && setSrc(r.data!.url));
    return () => {
      alive = false;
    };
  }, [url, path]);
  if (url) {
    const e = embedUrl(url);
    return e.kind === "video" ? (
      <video controls src={e.src} style={{ width: "100%", borderRadius: 12, background: "#000" }} />
    ) : (
      <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 12, overflow: "hidden", background: "#000" }}>
        <iframe src={e.src} title={title} allow="fullscreen; picture-in-picture" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
      </div>
    );
  }
  if (path) return src ? <video controls src={src} style={{ width: "100%", borderRadius: 12, background: "#000" }} /> : <p className="muted">Cargando video…</p>;
  return null;
}
