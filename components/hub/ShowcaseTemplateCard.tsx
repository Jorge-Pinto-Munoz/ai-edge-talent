"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DownloadButton } from "@/components/journey/SignedLink";
import { FileUpload } from "@/components/journey/FileUpload";
import { saveShowcaseTemplate } from "@/lib/hub/template-actions";
import { Icon } from "@/components/site/Icon";
import { fmtDate } from "@/components/ui";

export type TemplateFile = { name: string; path: string; size: number; updatedAt: string } | null;

/**
 * Plantilla oficial de la presentación del Showcase. Una para todo el programa: la sube el admin y la descargan
 * los participantes (en AI Lab y en Showcase), el Hub AI y el equipo.
 */
export function ShowcaseTemplateCard({ template, canEdit, compact = false }: { template: TemplateFile; canEdit: boolean; compact?: boolean }) {
  const router = useRouter();
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const save = (f: { name: string; path: string; size: number } | null) =>
    start(async () => { const r = await saveShowcaseTemplate(f); setMsg(r); if (r.ok) router.refresh(); });

  return (
    <section className={compact ? "tpl-card compact" : "tpl-card adm-card"} aria-label="Plantilla del Showcase">
      <div className="tpl-head">
        <span className="tpl-ico" aria-hidden="true"><Icon name="presentation" size={22} /></span>
        <div>
          <h2>Plantilla oficial del Showcase</h2>
          <p className="muted">
            {canEdit
              ? "La ven los participantes en AI Lab (para ir armando su caso) y en Showcase (para su presentación final)."
              : "Úsala para armar tu presentación: la misma estructura para todos los casos."}
          </p>
        </div>
      </div>
      {template ? (
        <div className="tpl-file">
          <DownloadButton bucket="content" path={template.path} name={template.name} size={template.size} kind="template" />
          {canEdit && <small className="muted">Actualizada {fmtDate(template.updatedAt)}</small>}
        </div>
      ) : (
        <p className="muted tpl-empty">{canEdit ? "Aún no hay plantilla. Súbela aquí (PPT, PPTX o PDF)." : "El equipo publicará aquí la plantilla."}</p>
      )}
      {canEdit && (
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <FileUpload bucket="content" waveId="programa" accept=".ppt,.pptx,.pdf,.key,.odp" label={template ? "Reemplazar plantilla" : "Subir plantilla"} onUploaded={(f) => save(f)} />
          {template && <button type="button" className="btn ghost small" disabled={pending} onClick={() => confirm("¿Quitar la plantilla? Los participantes dejarán de verla.") && save(null)}>Quitar</button>}
        </div>
      )}
      {msg && <p className={msg.ok ? "ok-text" : "error"} role="status" style={{ margin: 0 }}>{msg.message}</p>}
    </section>
  );
}
