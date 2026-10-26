"use client";

import { useEffect, useState } from "react";
import { signedFileUrl } from "@/lib/journey/actions";
import { embedUrl } from "@/lib/journey/rules";

/**
 * Enlace a un archivo privado: pide una URL firmada al momento del clic (vence en 10 min). Por defecto lo DESCARGA
 * al dispositivo sin abrir pestañas (en iPhone queda en Archivos). `view`: lo abre en una pestaña (p. ej. un video).
 */
export function SignedLink({ bucket, path, children, view = false }: { bucket: "content" | "submissions" | "certificates"; path: string; children: React.ReactNode; view?: boolean }) {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <button
        type="button"
        className="link-context"
        aria-busy={busy}
        style={{ background: "none", border: 0, borderTop: "2px solid var(--accent)", cursor: "pointer", font: "inherit", padding: 0 }}
        onClick={async () => {
          setErr(null);
          if (view) {
            // La ventana se abre en el mismo gesto del clic (si no, el navegador la bloquea) y recibe la URL firmada después.
            const w = window.open("", "_blank");
            const r = await signedFileUrl(bucket, path);
            if (r.ok && r.data && w) { w.opener = null; w.location.href = r.data.url; }
            else { w?.close(); setErr(r.ok ? "Permite ventanas emergentes para ver el archivo." : r.message); }
            return;
          }
          setBusy(true);
          const name = (path.split("/").pop() ?? "archivo").replace(/^\d{10,}-/, "");
          const r = await signedFileUrl(bucket, path, name);
          setBusy(false);
          if (!r.ok || !r.data) return setErr(r.message);
          const a = document.createElement("a");
          a.href = r.data.url;
          a.download = name;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }}
      >
        {children}
      </button>
      {err && <small className="error" role="alert"> {err}</small>}
    </>
  );
}

/** Descarga directa: el archivo baja en la misma pestaña (sin abrir ventanas nuevas). */
export function DownloadButton({ bucket, path, name, size, kind = "file" }: { bucket: "content" | "submissions" | "certificates"; path: string; name: string; size?: number; kind?: "file" | "template" }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const ext = name.split(".").pop()?.toUpperCase() ?? "";
  return (
    <button
      type="button"
      className={`dl-row ${kind}`}
      disabled={state === "busy"}
      onClick={async () => {
        setState("busy");
        const r = await signedFileUrl(bucket, path, name);
        if (!r.ok || !r.data) return setState("error");
        const a = document.createElement("a");
        a.href = r.data.url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setState("done");
      }}
    >
      <span className="dl-ext" aria-hidden="true">{ext.slice(0, 4)}</span>
      <span className="dl-name">{name}</span>
      <small>{state === "busy" ? "Preparando…" : state === "error" ? "No disponible" : state === "done" ? "Descargado" : size ? (size > 1048576 ? `${(size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(size / 1024))} KB`) : ""}</small>
      <span className="dl-ico" aria-hidden="true">↓</span>
    </button>
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
