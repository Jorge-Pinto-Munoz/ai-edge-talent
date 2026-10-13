"use client";

import { useState, useTransition } from "react";
import { testAiConnection, type AiCheck } from "@/lib/ai/status-actions";

/** Estado de la conexión con Claude y prueba en vivo (solo admin). */
export function AiStatus({ configured, model }: { configured: boolean; model: string }) {
  const [res, setRes] = useState<AiCheck | null>(null);
  const [pending, start] = useTransition();
  return (
    <section className="adm-card" aria-labelledby="ai-st">
      <div className="adm-card-head"><h2 id="ai-st">Conexión con Claude</h2>
        <span className={`ds-status s-${configured ? "done" : "attention"}`}>{configured ? "Llave configurada" : "Sin configurar"}</span>
      </div>
      <p className="muted" style={{ margin: "0 0 10px" }}>
        Modelo: <strong>{model}</strong>. Se usa para proponer la evaluación del Assessment (decide una persona), en Ayuda y en la síntesis de pulsos.
        {!configured && " Agrega ANTHROPIC_API_KEY en Vercel (Production) y haz Redeploy."}
      </p>
      <button type="button" className="btn small" disabled={pending} onClick={() => start(async () => setRes(await testAiConnection()))}>{pending ? "Probando…" : "Probar conexión"}</button>
      {res && <p className={res.ok ? "uc-ok" : "error"} role={res.ok ? "status" : "alert"} style={{ marginTop: 10 }}>{res.message}{res.ok && res.model ? ` Respondió ${res.model} en ${((res.ms ?? 0) / 1000).toFixed(1)} s.` : ""}</p>}
    </section>
  );
}
