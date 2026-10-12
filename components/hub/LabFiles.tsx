"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteLabFile, labFileUrl, registerLabFile, requestLabUpload } from "@/lib/hub/actions";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { Icon } from "@/components/site/Icon";

export type LabFile = { id: string; name: string; size_bytes: number | null; kind: string; created_at: string; uploaded_by: string | null };

const size = (b: number | null) => (b === null ? "" : b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

/** Presentaciones y archivos de un proyecto: descarga con URL firmada; subida si `canUpload`. */
export function LabFiles({ projectId, files, canUpload, deleteAll, myId }: { projectId: string; files: LabFile[]; canUpload: boolean; deleteAll?: boolean; myId?: string }) {
  const canDelete = (f: LabFile) => Boolean(deleteAll || (myId && f.uploaded_by === myId));
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const download = async (f: LabFile) => {
    setErr(null);
    const r = await labFileUrl(f.id);
    if (r.ok && r.data) window.location.href = r.data.url; // la URL trae Content-Disposition: attachment
    else setErr(r.message);
  };

  return (
    <div className="lab-files">
      {files.length === 0 ? (
        <p className="muted" style={{ margin: 0 }}><small>Aún no hay presentación.</small></p>
      ) : (
        <ul>
          {files.map((f) => (
            <li key={f.id}>
              <Icon name={f.kind === "PRESENTATION" ? "presentation" : "book"} size={18} />
              <button type="button" className="file-link" onClick={() => download(f)} title="Descargar">
                {f.name}
              </button>
              <small className="muted">{size(f.size_bytes)}</small>
              {canDelete(f) && (
                <button type="button" className="icon-btn" aria-label={`Quitar ${f.name}`} disabled={busy} onClick={async () => { setBusy(true); const r = await deleteLabFile(f.id); setBusy(false); if (!r.ok) setErr(r.message); router.refresh(); }}>
                  <Icon name="close" size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {canUpload && (
        <label className="btn ghost small" style={{ display: "inline-flex", gap: 6, cursor: busy ? "wait" : "pointer", marginTop: 8 }}>
          <Icon name="plus" size={16} /> {busy ? "Subiendo…" : "Subir presentación (PPT, PDF…)"}
          <input
            type="file"
            hidden
            disabled={busy}
            accept=".ppt,.pptx,.pdf,.key,.odp,.doc,.docx,.xlsx,.png,.jpg,.mp4,.zip"
            onChange={async (e) => {
              const list = Array.from(e.target.files ?? []);
              e.target.value = "";
              setErr(null);
              setBusy(true);
              for (const f of list) {
                const r = await requestLabUpload(projectId, f.name, f.size);
                if (!r.ok || !r.data) { setErr(r.message); continue; }
                const { error } = await supabaseBrowser().storage.from("lab").uploadToSignedUrl(r.data.path, r.data.token, f, { contentType: f.type || undefined });
                if (error) { setErr(`No se pudo subir ${f.name}.`); continue; }
                const reg = await registerLabFile(projectId, { path: r.data.path, name: f.name, size: f.size });
                if (!reg.ok) setErr(reg.message);
              }
              setBusy(false);
              router.refresh();
            }}
          />
        </label>
      )}
      {err && <p className="error" style={{ marginTop: 6 }}>{err}</p>}
    </div>
  );
}
