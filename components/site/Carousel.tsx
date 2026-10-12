"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * Carrusel horizontal deslizable (scroll-snap nativo): se arrastra con el dedo en el teléfono
 * y con las flechas o el trackpad en el computador. La barra muestra cuánto falta por recorrer.
 */
export function Carousel({ children, label, dark = false }: { children: ReactNode; label: string; dark?: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [edges, setEdges] = useState({ start: true, end: false });
  const count = Children.count(children);

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const p = max <= 0 ? 1 : el.scrollLeft / max;
    setProgress(p);
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft > max - 8 });
  }, []);

  useEffect(() => {
    update();
    const el = track.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const go = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(":scope > *");
    const step = card ? card.offsetWidth + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <div className={`carousel ${dark ? "on-dark" : ""}`} role="region" aria-roledescription="carrusel" aria-label={label}>
      <div className="carousel-track" ref={track}>
        {children}
      </div>
      <div className="carousel-foot">
        <div className="carousel-bar" aria-hidden="true">
          <span style={{ width: `${Math.max(1 / Math.max(count, 1), progress) * 100}%` }} />
        </div>
        <div className="carousel-arrows">
          <button type="button" className="round-btn" onClick={() => go(-1)} disabled={edges.start} aria-label="Anterior">
            <Icon name="arrowLeft" size={20} />
          </button>
          <button type="button" className="round-btn" onClick={() => go(1)} disabled={edges.end} aria-label="Siguiente">
            <Icon name="arrowRight" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
