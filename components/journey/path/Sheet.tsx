"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "@/components/site/Icon";

/**
 * Hoja que sube desde abajo (móvil) o panel lateral (escritorio).
 * Escape o tocar fuera la cierra; el foco entra al abrir y vuelve al elemento que la abrió al cerrar.
 */
export function Sheet({ open, onClose, title, eyebrow, accent, children }: { open: boolean; onClose: () => void; title: string; eyebrow?: string; accent?: string; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => panel.current?.querySelector<HTMLElement>("[data-autofocus], button, a, input, textarea, select")?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && panel.current) {
        // Mantiene el foco dentro de la hoja.
        const f = [...panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input, textarea, select, [tabindex='0']")];
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  return (
    <div className={`jsheet ${open ? "open" : ""}`} aria-hidden={!open} inert={!open}>
      <div className="jsheet-backdrop" onClick={onClose} />
      <div ref={panel} className="jsheet-panel" role="dialog" aria-modal="true" aria-labelledby="jsheet-title" style={accent ? ({ "--stage": accent } as React.CSSProperties) : undefined}>
        <div className="jsheet-grip" aria-hidden="true" />
        <header className="jsheet-head">
          <div>
            {eyebrow && <div className="jsheet-eyebrow">{eyebrow}</div>}
            <h2 id="jsheet-title">{title}</h2>
          </div>
          <button type="button" className="jsheet-close" onClick={onClose} aria-label="Cerrar">
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className="jsheet-body">{open && children}</div>
      </div>
    </div>
  );
}
