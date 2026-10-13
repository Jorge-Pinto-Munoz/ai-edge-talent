"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { WAVE_STATUS_LABEL, type WaveStatus } from "@/lib/domain/types";
import { Icon } from "@/components/site/Icon";
import type { ShellWave } from "./AdminShell";

const short = (n: string) => n.replace("AI Edge Talent · ", "");

/**
 * Selector de Wave: panel con las Waves en curso arriba y las anteriores abajo (de la más nueva a la más antigua),
 * cada una con su estado y cuántos profesionales tiene. Teclado: flechas, Inicio/Fin, Enter y Escape.
 */
export function WavePicker({ waves, value, onChange }: { waves: ShellWave[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<CSSProperties>({});
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();
  const current = waves.find((w) => w.id === value) ?? waves[0];
  const groups = [
    { label: "En curso", list: waves.filter((w) => w.status !== "CLOSED") },
    { label: "Waves anteriores", list: waves.filter((w) => w.status === "CLOSED") },
  ].filter((g) => g.list.length);
  const flat = groups.flatMap((g) => g.list);

  useEffect(() => {
    if (!open) return;
    const k = Math.max(0, flat.findIndex((w) => w.id === value));
    setFocus(k);
    requestAnimationFrame(() => items.current[k]?.focus());
    const out = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node) && !panel.current?.contains(e.target as Node)) setOpen(false); };
    // El panel vive en <body> (la barra móvil del portal recorta lo que se sale de ella); se ubica bajo el botón.
    const place = () => {
      const r = root.current?.getBoundingClientRect();
      if (!r) return;
      const narrow = window.innerWidth < 960;
      setPos(narrow ? { top: r.bottom + 8, left: 16, right: 16 } : { top: r.bottom + 8, left: r.left, width: Math.max(r.width, 260) });
    };
    place();
    document.addEventListener("mousedown", out);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => { document.removeEventListener("mousedown", out); window.removeEventListener("resize", place); window.removeEventListener("scroll", place, true); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const move = (k: number) => { const n = (k + flat.length) % flat.length; setFocus(n); items.current[n]?.focus(); };
  const pick = (w: ShellWave) => { setOpen(false); if (w.id !== value) onChange(w.id); };

  if (!current) return null;
  let n = -1;
  return (
    <div className="wave-picker" ref={root} onKeyDown={(e) => { if (e.key === "Escape" && open) { setOpen(false); root.current?.querySelector<HTMLButtonElement>(".wave-switch")?.focus(); } }}>
      <button type="button" className="wave-switch" aria-haspopup="listbox" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        <Icon name="layers" size={18} />
        <span className="wp-cur"><strong>{short(current.name)}</strong><small>{WAVE_STATUS_LABEL[current.status as WaveStatus] ?? current.status}</small></span>
        <Icon name="chevronDown" size={16} />
      </button>
      {open && createPortal(
        <div className="wp-panel" id={id} ref={panel} style={pos} role="listbox" aria-label="Elegir Wave"
          onKeyDown={(e) => {
            if (e.key === "Escape") { setOpen(false); root.current?.querySelector<HTMLButtonElement>(".wave-switch")?.focus(); }
            if (e.key === "ArrowDown") { e.preventDefault(); move(focus + 1); }
            if (e.key === "ArrowUp") { e.preventDefault(); move(focus - 1); }
            if (e.key === "Home") { e.preventDefault(); move(0); }
            if (e.key === "End") { e.preventDefault(); move(flat.length - 1); }
          }}>
          {groups.map((g) => (
            <div key={g.label} role="group" aria-label={g.label}>
              <div className="wp-group">{g.label}</div>
              {g.list.map((w) => {
                n++;
                const k = n;
                const on = w.id === value;
                return (
                  <button key={w.id} ref={(el) => { items.current[k] = el; }} type="button" role="option" aria-selected={on} tabIndex={k === focus ? 0 : -1}
                    className={`wp-item${on ? " on" : ""}`} onClick={() => pick(w)}>
                    <span className={`wp-dot ${w.status === "CLOSED" ? "closed" : "live"}`} aria-hidden="true" />
                    <span className="wp-txt">
                      <strong>{short(w.name)}</strong>
                      <small>{WAVE_STATUS_LABEL[w.status as WaveStatus] ?? w.status}{typeof w.people === "number" ? ` · ${w.people} ${w.people === 1 ? "profesional" : "profesionales"}` : ""}</small>
                    </span>
                    {on && <Icon name="check" size={16} />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
