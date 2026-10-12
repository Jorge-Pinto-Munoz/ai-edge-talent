"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitCertification } from "@/lib/journey/actions";
import { FileUpload, type UploadedFile } from "./FileUpload";
import { Callout } from "@/components/ui";

export function CertificationForm() {
  const [result, setResult] = useState<"PASSED" | "FAILED">("PASSED");
  const [issuedOn, setIssuedOn] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="stack" style={{ marginTop: 12 }}>
      <div className="grid grid-3">
        <div className="field">
          <label htmlFor="cr">Resultado del examen</label>
          <select id="cr" value={result} onChange={(e) => setResult(e.target.value as typeof result)}>
            <option value="PASSED">Aprobado</option>
            <option value="FAILED">No aprobado</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="cd">Fecha</label>
          <input id="cd" type="date" max={new Date().toISOString().slice(0, 10)} value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cu">Enlace de la credencial (opcional)</label>
          <input id="cu" type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
        </div>
      </div>
      <div className="row">
        <FileUpload bucket="certificates" accept=".pdf,image/*" label={file ? "Cambiar certificado" : "Subir certificado (PDF o imagen)"} onUploaded={setFile} />
        {file && <small className="muted">{file.name}</small>}
      </div>
      {msg && <Callout tone={msg.ok ? "ok" : "bad"} title={msg.text} />}
      <button
        className="btn"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await submitCertification({ result, issuedOn, credentialUrl: url, filePath: file?.path ?? null });
            setMsg({ ok: r.ok, text: r.message });
            if (r.ok) router.refresh();
          })
        }
      >
        Registrar certificación
      </button>
    </div>
  );
}
