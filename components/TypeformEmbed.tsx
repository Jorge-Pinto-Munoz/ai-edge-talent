"use client";

import { useEffect, useRef, useState } from "react";
import "@typeform/embed/build/css/widget.css";

/**
 * Embed del Assessment (Typeform).
 * - Hidden fields: solo applicationId y waveId (sin datos personales en la URL).
 *   En el enlace de respaldo van en el fragmento (#), que no se envía a servidores intermedios.
 * - Si el embed falla o el navegador lo bloquea, se ofrece abrirlo en una pestaña nueva.
 *   Nunca se deja al participante bloqueado por un error del iframe.
 */
export function TypeformEmbed({
  url,
  applicationId,
  waveId,
  onSubmitted,
}: {
  url: string;
  applicationId: string;
  waveId: string;
  onSubmitted: (source: "typeform-embed" | "manual-confirmation") => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [openedExternally, setOpenedExternally] = useState(false);
  const submitted = useRef(false);

  const parsed = new URL(url);
  const formId = parsed.pathname.split("/").filter(Boolean).pop() ?? "";
  const hidden = { applicationId, waveId };
  const fallbackHref = `${url}#${new URLSearchParams(hidden).toString()}`;

  useEffect(() => {
    let widget: { unmount: () => void } | null = null;
    let cancelled = false;
    const timeout = window.setTimeout(() => setStatus((s) => (s === "loading" ? "failed" : s)), 12000);

    import("@typeform/embed")
      .then(({ createWidget }) => {
        if (cancelled || !ref.current) return;
        widget = createWidget(formId, {
          container: ref.current,
          domain: parsed.host,
          hidden,
          height: 640,
          onReady: () => setStatus("ready"),
          onSubmit: () => {
            if (submitted.current) return;
            submitted.current = true;
            onSubmitted("typeform-embed");
          },
        });
      })
      .catch(() => setStatus("failed"));

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      widget?.unmount();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formId, applicationId, waveId]);

  return (
    <div className="stack">
      {status === "failed" && (
        <div className="callout warn">
          <strong>No pudimos cargar el Assessment dentro de la plataforma.</strong>
          Puede deberse a un bloqueador o a la red. Ábrelo en una nueva pestaña; tu postulación queda asociada igualmente.
        </div>
      )}
      <div ref={ref} className="embed-frame" style={{ display: status === "failed" ? "none" : "block" }} aria-label="Assessment AI Edge Talent" />
      <div className="spread">
        <a className="btn ghost small" href={fallbackHref} target="_blank" rel="noopener noreferrer" onClick={() => setOpenedExternally(true)}>
          Abrir Assessment en una nueva pestaña ↗
        </a>
        {(openedExternally || status === "failed") && (
          <button
            className="btn small"
            onClick={() => {
              if (confirm("¿Confirmas que enviaste el Assessment completo en la otra pestaña?")) {
                submitted.current = true;
                onSubmitted("manual-confirmation");
              }
            }}
          >
            Ya envié mi Assessment
          </button>
        )}
      </div>
    </div>
  );
}
