"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markCapsuleComplete, submitTask } from "@/lib/journey/actions";
import { FileUpload, type UploadedFile } from "./FileUpload";
import { Callout } from "@/components/ui";

export function CompleteToggle({ capsuleId, done }: { capsuleId: string; done: boolean }) {
  const [checked, setChecked] = useState(done);
  const [, start] = useTransition();
  const router = useRouter();
  return (
    <label className="check" style={{ marginBottom: 0 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => {
          const v = e.target.checked;
          setChecked(v); // optimista: se revierte si falla
          start(async () => {
            const r = await markCapsuleComplete(capsuleId, v);
            if (!r.ok) setChecked(!v);
            router.refresh();
          });
        }}
      />
      <span>Vi esta cápsula</span>
    </label>
  );
}

export function TaskForm({ capsuleId, blockedReason }: { capsuleId: string; blockedReason: string | null }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (blockedReason) return <Callout tone="warn" title={blockedReason} />;
  return (
    <div className="stack">
      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor="ta">Tu respuesta</label>
        <textarea id="ta" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe tu trabajo y la evidencia. Puedes además adjuntar archivos." />
      </div>
      <div className="row">
        <FileUpload bucket="submissions" multiple label="Adjuntar archivos" onUploaded={(f) => setFiles((x) => [...x, f])} />
        {files.map((f) => (
          <span key={f.path} className="badge">
            {f.name} <button type="button" aria-label={`Quitar ${f.name}`} onClick={() => setFiles((x) => x.filter((y) => y.path !== f.path))} style={{ border: 0, background: "none", cursor: "pointer" }}>×</button>
          </span>
        ))}
      </div>
      {msg && <Callout tone={msg.ok ? "ok" : "bad"} title={msg.text} />}
      <button
        className="btn"
        disabled={pending}
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
