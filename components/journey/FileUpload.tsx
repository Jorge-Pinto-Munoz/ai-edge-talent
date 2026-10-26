"use client";

import { useState } from "react";
import { requestUpload } from "@/lib/journey/actions";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Icon } from "@/components/site/Icon";

export type UploadedFile = { name: string; path: string; size: number };
type Bucket = "content" | "submissions" | "certificates";

/** Sube archivos a Storage con URL firmada (el servidor valida permisos y tamaño antes). Devuelve el error, si hubo. */
async function uploadAll(bucket: Bucket, files: File[], waveId: string | undefined, onUploaded: (f: UploadedFile) => void): Promise<string | null> {
  let error: string | null = null;
  for (const f of files) {
    const r = await requestUpload(bucket, f.name, f.size, waveId);
    if (!r.ok || !r.data) { error = r.message; continue; }
    const { error: upErr } = await supabaseBrowser().storage.from(bucket).uploadToSignedUrl(r.data.path, r.data.token, f, { contentType: f.type || undefined });
    if (upErr) error = `No se pudo subir ${f.name}.`;
    else onUploaded({ name: f.name, path: r.data.path, size: f.size });
  }
  return error;
}

/** Botón de subida directa a Storage. */
export function FileUpload({
  bucket,
  waveId,
  accept,
  multiple,
  onUploaded,
  label = "Subir archivo",
}: {
  bucket: Bucket;
  waveId?: string;
  accept?: string;
  multiple?: boolean;
  onUploaded: (f: UploadedFile) => void;
  label?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <label className="btn ghost small" style={{ display: "inline-flex", cursor: busy ? "wait" : "pointer", marginBottom: 0 }}>
        {busy ? "Subiendo…" : label}
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          hidden
          disabled={busy}
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            setError(null);
            setBusy(true);
            setError(await uploadAll(bucket, files, waveId, onUploaded));
            setBusy(false);
          }}
        />
      </label>
      {error && <p className="error" style={{ marginTop: 6 }}>{error}</p>}
    </div>
  );
}

/**
 * Zona para arrastrar y soltar (o elegir) archivos, con los formatos y el tamaño máximo a la vista.
 * Valida formato y tamaño antes de subir; el servidor vuelve a validar al recibir la entrega.
 */
export function DropUpload({
  bucket,
  accept,
  formatsText,
  maxMb,
  multiple,
  allowed,
  onUploaded,
  title = "Arrastra tu archivo aquí",
}: {
  bucket: Bucket;
  accept: string;
  formatsText: string;
  maxMb: number;
  multiple?: boolean;
  allowed: (name: string) => boolean;
  onUploaded: (f: UploadedFile) => void;
  title?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const take = async (list: File[]) => {
    const files = multiple ? list : list.slice(0, 1);
    if (!files.length) return;
    const wrong = files.find((f) => !allowed(f.name));
    if (wrong) return setError(`«${wrong.name}» no es un formato aceptado. Sube: ${formatsText}.`);
    const big = files.find((f) => f.size > maxMb * 1024 * 1024);
    if (big) return setError(`«${big.name}» pesa ${(big.size / 1048576).toFixed(1)} MB y el máximo es ${maxMb} MB.`);
    setError(null);
    setBusy(true);
    setError(await uploadAll(bucket, files, undefined, onUploaded));
    setBusy(false);
  };
  return (
    <div>
      <label
        className={`drop${over ? " over" : ""}${busy ? " busy" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!busy) void take(Array.from(e.dataTransfer.files)); }}
      >
        <Icon name="upload" size={26} />
        <strong>{busy ? "Subiendo…" : title}</strong>
        <span>o <u>elige un archivo</u> desde tu equipo</span>
        <small>Formatos: {formatsText} · Máximo {maxMb} MB{multiple ? " por archivo" : ""}</small>
        <input type="file" accept={accept} multiple={multiple} hidden disabled={busy} onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; void take(f); }} />
      </label>
      {error && <p className="error" role="alert" style={{ marginTop: 6 }}>{error}</p>}
    </div>
  );
}
