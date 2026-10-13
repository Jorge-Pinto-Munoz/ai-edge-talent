"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setShareExperience } from "@/lib/identity/admin-actions";

/** El Líder de Servicio decide si los Delivery de la Wave ven la experiencia declarada de sus profesionales. */
export function ShareExperience({ waveId, shared }: { waveId: string; shared: boolean }) {
  const [on, setOn] = useState(shared);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const router = useRouter();
  return (
    <div className="ex-share">
      <label>
        <input
          type="checkbox"
          checked={on}
          disabled={busy}
          onChange={(e) => {
            const v = e.target.checked;
            start(async () => {
              const r = await setShareExperience(waveId, v);
              setMsg(r.message);
              if (r.ok) { setOn(v); router.refresh(); }
            });
          }}
        />{" "}
        <strong>Compartir la experiencia con los Delivery de esta Wave</strong>
      </label>
      <small className="muted">Cada Delivery verá solo a los profesionales que tiene asignados: satisfacción y respuestas de sus pulsos de cierre, en modo lectura. Sin compartir, ve solo su avance.</small>
      {msg && <small role="status">{msg}</small>}
    </div>
  );
}
