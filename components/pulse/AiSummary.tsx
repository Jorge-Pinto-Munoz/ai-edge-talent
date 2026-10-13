"use client";

import { useState, useTransition } from "react";
import { summarizeStage } from "@/lib/pulse/summary-actions";
import type { PulseSummary } from "@/lib/ai/pulse-summary";
import type { Layer } from "@/lib/journey/rules";
import { Icon } from "@/components/site/Icon";

const LABEL = { aprendizaje: "Aprendizajes", valioso: "Lo más valorado", mejorar: "Mejoras propuestas", aplicacion: "Aplicaciones al trabajo" } as const;

/** Síntesis con IA de los textos de un pulso de cierre (solo admin). Se genera a pedido y se guarda. */
export function AiSummary({ waveId, layer, initial, stale, texts, configured }: { waveId: string; layer: Layer; initial: PulseSummary | null; stale: boolean; texts: number; configured: boolean }) {
  const [sum, setSum] = useState(initial);
  const [isStale, setStale] = useState(stale);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  if (texts < 3 && !sum) return null;
  const run = () => start(async () => {
    const r = await summarizeStage(waveId, layer);
    setMsg({ ok: r.ok, text: r.message });
    if (r.summary) { setSum(r.summary); setStale(false); }
  });
  return (
    <div className="ai-sum">
      <div className="spread">
        <strong><Icon name="spark" size={16} /> Síntesis con IA</strong>
        {configured && texts >= 3 && (
          <button type="button" className="btn small secondary" disabled={busy || (!!sum && !isStale)} onClick={run}>
            {busy ? "Resumiendo…" : !sum ? `Resumir ${texts} respuestas` : isStale ? "Actualizar con respuestas nuevas" : "Al día"}
          </button>
        )}
      </div>
      {!configured && !sum && <p className="muted"><small>Disponible cuando se configure la IA en el servidor (ANTHROPIC_API_KEY).</small></p>}
      {msg && !msg.ok && <p className="error" role="alert">{msg.text}</p>}
      {sum && (
        <>
          <p style={{ margin: "8px 0" }}>{sum.overview}</p>
          <div className="ai-sum-grid">
            {sum.fields.filter((f) => f.themes.length).map((f) => (
              <div key={f.field}>
                <h4>{LABEL[f.field]}</h4>
                <ul>{f.themes.map((t) => <li key={t.theme}><strong>{t.theme}</strong> <span className="muted">· {t.count}</span><br /><small className="muted">«{t.example}»</small></li>)}</ul>
              </div>
            ))}
          </div>
          {sum.watch.length > 0 && <div className="ai-sum-watch"><strong>Para revisar:</strong><ul>{sum.watch.map((w) => <li key={w}>{w}</li>)}</ul></div>}
          <p className="muted" style={{ margin: "8px 0 0" }}><small>Generada con IA a partir de los textos, sin nombres. Es experiencia declarada, no mide adopción: confírmala leyendo las respuestas abajo.</small></p>
        </>
      )}
    </div>
  );
}
