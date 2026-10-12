"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestRescueUpload, submitRescue } from "@/lib/admission/candidate-actions";
import { RESCUE_MAX_MINUTES, RESCUE_QUESTIONS } from "@/lib/admission/rescue";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Callout } from "@/components/ui";

/** Video de rescate: preguntas guía + subida directa o enlace. */
export function RescueForm({ token, sent }: { token: string; sent: { at: string; reviewed: boolean } | null }) {
  const [mode, setMode] = useState<"file" | "link">("file");
  const [file, setFile] = useState<{ name: string; path: string } | null>(null);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="stack">
      <ol className="rescue-qs">
        {RESCUE_QUESTIONS.map((q) => (
          <li key={q.key}><strong>{q.question}</strong></li>
        ))}
      </ol>
      <p className="muted" style={{ margin: 0 }}>Máximo {RESCUE_MAX_MINUTES} minutos. Puede ser grabado con el celular o una videollamada contigo mismo/a; no necesitas editarlo. No muestres datos confidenciales de tu cliente.</p>

      {sent && <Callout tone="ok" title={sent.reviewed ? "Tu video ya fue revisado." : "Ya recibimos tu video."}>{sent.reviewed ? "Te escribiremos con el resultado." : "Si quieres, puedes reemplazarlo antes de que lo revisemos."}</Callout>}

      {!sent?.reviewed && (
        <div className="card" style={{ padding: 20 }}>
          <div className="row" role="tablist" style={{ marginBottom: 12 }}>
            <button type="button" role="tab" aria-selected={mode === "file"} className={`btn small ${mode === "file" ? "" : "ghost"}`} onClick={() => setMode("file")}>Subir archivo (hasta 50 MB)</button>
            <button type="button" role="tab" aria-selected={mode === "link"} className={`btn small ${mode === "link" ? "" : "ghost"}`} onClick={() => setMode("link")}>Pegar enlace</button>
          </div>
          {mode === "file" ? (
            <label className="btn ghost" style={{ display: "inline-flex", cursor: busy ? "wait" : "pointer", marginBottom: 0 }}>
              {busy ? "Subiendo…" : file ? `✓ ${file.name} · cambiar` : "Elegir video"}
              <input
                type="file"
                accept="video/*"
                hidden
                disabled={busy}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  setMsg(null);
                  setBusy(true);
                  const r = await requestRescueUpload(token, f.name, f.size);
                  if (!r.ok || !r.path || !r.uploadToken) {
                    setMsg(r);
                  } else {
                    const { error } = await supabaseBrowser().storage.from("submissions").uploadToSignedUrl(r.path, r.uploadToken, f, { contentType: f.type || undefined });
                    if (error) setMsg({ ok: false, message: "No se pudo subir el video. Prueba con un enlace." });
                    else setFile({ name: f.name, path: r.path });
                  }
                  setBusy(false);
                }}
              />
            </label>
          ) : (
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="rv-url">Enlace al video</label>
              <input id="rv-url" type="text" inputMode="url" placeholder="https://youtu.be/… (no listado), Drive u OneDrive" value={url} onChange={(e) => setUrl(e.target.value)} />
              <p className="hint">Asegúrate de que el enlace se pueda ver sin pedir permiso.</p>
            </div>
          )}
          <div className="field" style={{ marginTop: 14 }}>
            <label htmlFor="rv-note">Comentario (opcional)</label>
            <textarea id="rv-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Algo que quieras agregar" />
          </div>
          <button
            type="button"
            className="btn"
            disabled={pending || busy || (mode === "file" ? !file : !url.trim())}
            onClick={() =>
              start(async () => {
                const r = await submitRescue(token, mode === "file" ? { path: file?.path, note } : { url, note });
                setMsg(r);
                if (r.ok) router.refresh();
              })
            }
          >
            {pending ? "Enviando…" : sent ? "Reemplazar mi video" : "Enviar mi video"}
          </button>
          {msg && <p className={msg.ok ? "" : "error"} style={{ marginTop: 10 }}>{msg.message}</p>}
        </div>
      )}
    </div>
  );
}
