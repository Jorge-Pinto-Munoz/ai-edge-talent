"use client";

import { useState } from "react";
import { Icon } from "@/components/site/Icon";

/** Enlace público de postulación de la Wave, listo para copiar y compartir. */
export function ApplyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="apply-link">
      <span className="ico"><Icon name="send" size={18} /></span>
      <span className="txt">
        <small>Link de postulación · compártelo con los profesionales</small>
        <code>{url}</code>
      </span>
      <button
        type="button"
        className="btn small"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            window.prompt("Copia el enlace:", url);
          }
        }}
      >
        {copied ? "¡Copiado!" : "Copiar"}
      </button>
    </div>
  );
}
