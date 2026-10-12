"use client";

import { useEffect, useState } from "react";

/** Cuenta regresiva al cierre. Se calcula solo en el navegador para no desalinear el render del servidor. */
export function Countdown({ to, compact = false }: { to: string; compact?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const end = new Date(to).getTime();
  if (now === null) return <span className="countdown" aria-hidden="true">&nbsp;</span>;
  const ms = end - now;
  if (ms <= 0) return <span className="countdown closed">Postulación cerrada</span>;
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (compact) return <span className="countdown">Cierra en {d > 0 ? `${d} d ${h} h` : `${h} h ${m} min`}</span>;
  return (
    <span className="countdown big" role="timer" aria-label={`Faltan ${d} días, ${h} horas y ${m} minutos`}>
      {[[d, "días"], [h, "horas"], [m, "min"]].map(([v, l]) => (
        <span key={l as string} className="cd-unit">
          <strong>{String(v).padStart(2, "0")}</strong>
          <small>{l}</small>
        </span>
      ))}
    </span>
  );
}
