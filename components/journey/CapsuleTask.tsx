"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitTask } from "@/lib/journey/actions";
import { DropUpload, type UploadedFile } from "./FileUpload";
import { SUBMISSION_MAX_MB, acceptAttr, fileAllowed, formatsLabel, type FormatKey } from "@/lib/journey/formats";
import { Callout } from "@/components/ui";

export function TaskForm({ capsuleId, blockedReason, template = false, formats = ["pdf"] }: { capsuleId: string; blockedReason: string | null; template?: boolean; formats?: FormatKey[] }) {
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
      {(!template || files.length === 0) && (
        <DropUpload
          bucket="submissions"
          accept={acceptAttr(formats)}
          formatsText={formatsLabel(formats)}
          maxMb={SUBMISSION_MAX_MB}
          multiple={!template}
          allowed={(n) => fileAllowed(n, formats)}
          title={template ? "Arrastra aquí tu plantilla completada" : "Arrastra aquí tus archivos"}
          onUploaded={(f) => setFiles((x) => (template ? [f] : [...x, f]))}
        />
      )}
      {files.length > 0 && (
        <ul className="drop-files">
          {files.map((f) => (
            <li key={f.path}>
              <span>{f.name}</span>
              <small>{f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1024))} KB`}</small>
              <button type="button" className="link-btn" aria-label={`Quitar ${f.name}`} onClick={() => setFiles((x) => x.filter((y) => y.path !== f.path))}>Quitar</button>
            </li>
          ))}
        </ul>
      )}
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
