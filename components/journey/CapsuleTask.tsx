"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { markCapsuleComplete, submitTask } from "@/lib/journey/actions";
import { FileUpload, type UploadedFile } from "./FileUpload";
import { Callout } from "@/components/ui";

/** Al abrir la cápsula queda como vista (una vez, sin que la persona tenga que marcar nada). */
export function AutoSeen({ capsuleId, done }: { capsuleId: string; done: boolean }) {
  const router = useRouter();
  const sent = useRef(false);
  useEffect(() => {
    if (done || sent.current) return;
    sent.current = true;
    void markCapsuleComplete(capsuleId, true).then((r) => r.ok && router.refresh());
  }, [capsuleId, done, router]);
  return null;
}

export function TaskForm({ capsuleId, blockedReason, template = false }: { capsuleId: string; blockedReason: string | null; template?: boolean }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (blockedReason) return <Callout tone="warn" title={blockedReason} />;
  return (
    <div className="stack">
      {!template && (
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="ta">Tu respuesta</label>
          <textarea id="ta" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe tu trabajo y la evidencia. Puedes además adjuntar archivos." />
        </div>
      )}
      <div className="row">
        <FileUpload bucket="submissions" multiple={!template} label={template ? (files.length ? "Cambiar archivo" : "Subir plantilla completada") : "Adjuntar archivos"} onUploaded={(f) => setFiles((x) => (template ? [f] : [...x, f]))} />
        {files.map((f) => (
          <span key={f.path} className="badge">
            {f.name} <button type="button" aria-label={`Quitar ${f.name}`} onClick={() => setFiles((x) => x.filter((y) => y.path !== f.path))} style={{ border: 0, background: "none", cursor: "pointer" }}>×</button>
          </span>
        ))}
      </div>
      {template && (
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="ta">Comentario (opcional)</label>
          <textarea id="ta" rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Algo que quieras contarle a quien revisa" />
        </div>
      )}
      {msg && <Callout tone={msg.ok ? "ok" : "bad"} title={msg.text} />}
      <button
        className="btn"
        disabled={pending || (template && files.length === 0)}
        onClick={() =>
          start(async () => {
            if (!confirm("¿Enviar tu entrega? Quedará registrada como un intento.")) return;
            const r = await submitTask(capsuleId, text, files);
            setMsg({ ok: r.ok, text: r.message });
            if (r.ok) { setText(""); setFiles([]); router.refresh(); }
          })
        }
      >
        Enviar entrega
      </button>
    </div>
  );
}
