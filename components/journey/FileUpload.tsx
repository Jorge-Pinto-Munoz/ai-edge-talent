"use client";

import { useState } from "react";
import { requestUpload } from "@/lib/journey/actions";
import { supabaseBrowser } from "@/lib/supabase/browser";

export type UploadedFile = { name: string; path: string; size: number };

/** Subida directa a Storage con URL firmada (el servidor valida permisos y tamaño antes). */
export function FileUpload({
  bucket,
  waveId,
  accept,
  multiple,
  onUploaded,
  label = "Subir archivo",
}: {
  bucket: "content" | "submissions" | "certificates";
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
            for (const f of files) {
              const r = await requestUpload(bucket, f.name, f.size, waveId);
              if (!r.ok || !r.data) {
                setError(r.message);
                continue;
              }
              const { error: upErr } = await supabaseBrowser().storage.from(bucket).uploadToSignedUrl(r.data.path, r.data.token, f, { contentType: f.type || undefined });
              if (upErr) setError(`No se pudo subir ${f.name}.`);
              else onUploaded({ name: f.name, path: r.data.path, size: f.size });
            }
            setBusy(false);
          }}
        />
      </label>
      {error && <p className="error" style={{ marginTop: 6 }}>{error}</p>}
    </div>
  );
}
