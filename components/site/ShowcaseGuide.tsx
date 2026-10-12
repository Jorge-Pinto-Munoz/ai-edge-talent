"use client";

import { useEffect, useState } from "react";
import { SHOWCASE_AVOID, SHOWCASE_CHECKLIST, SHOWCASE_CONTRAST, SHOWCASE_CRITERIA, SHOWCASE_FORMAT, SHOWCASE_IDEA, SHOWCASE_STRUCTURE, efficiency } from "@/lib/data/showcase";
import { Icon } from "@/components/site/Icon";

const KEY = "aet-showcase-checklist";

/** Guía del Showcase: estructura, criterios, calculadora de eficiencia y checklist (se recuerda en este navegador). */
export function ShowcaseGuide({ compact = false }: { compact?: boolean }) {
  const [done, setDone] = useState<boolean[]>(() => SHOWCASE_CHECKLIST.map(() => false));
  const [calc, setCalc] = useState({ before: "8", after: "3", freq: "4" });
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (Array.isArray(saved) && saved.length === SHOWCASE_CHECKLIST.length) setDone(saved.map(Boolean));
    } catch {}
  }, []);
  const toggle = (i: number) =>
    setDone((d) => {
      const n = d.map((x, k) => (k === i ? !x : x));
      try { localStorage.setItem(KEY, JSON.stringify(n)); } catch {}
      return n;
    });
  const eff = efficiency(Number(calc.before), Number(calc.after), Number(calc.freq));
  const ready = done.filter(Boolean).length;

  return (
    <div className={`scg ${compact ? "compact" : ""}`}>
      <p className="scg-idea"><Icon name="target" size={18} /> {SHOWCASE_IDEA}</p>
      <ul className="scg-format">
        <li><Icon name="presentation" size={16} /> {SHOWCASE_FORMAT.slides}</li>
        <li><Icon name="clock" size={16} /> {SHOWCASE_FORMAT.duration}</li>
        <li><Icon name="play" size={16} /> {SHOWCASE_FORMAT.demo}</li>
      </ul>

      <h3>Estructura recomendada</h3>
      <ol className="scg-steps">
        {SHOWCASE_STRUCTURE.map((s, i) => (
          <li key={s.title}>
            <span className="min">{s.min}</span>
            <div><strong>{i + 1}. {s.title}</strong><p>{s.body}</p></div>
          </li>
        ))}
      </ol>

      {!compact && (
        <>
          <h3>Lo que hace que un Showcase deje huella</h3>
          <ul className="scg-criteria">
            {SHOWCASE_CRITERIA.map((c) => <li key={c.title}><strong>{c.title}</strong><p>{c.body}</p></li>)}
          </ul>
        </>
      )}

      <h3>Cierra con el contraste</h3>
      <ul className="scg-contrast">{SHOWCASE_CONTRAST.map((c) => <li key={c}>{c}</li>)}</ul>

      <div className="scg-calc" role="group" aria-labelledby="scg-calc-t">
        <h3 id="scg-calc-t">Calcula tu eficiencia</h3>
        <div className="scg-calc-row">
          <label>Antes (h por vez)<input type="number" min={0} step={0.5} inputMode="decimal" value={calc.before} onChange={(e) => setCalc({ ...calc, before: e.target.value })} /></label>
          <label>Ahora (h por vez)<input type="number" min={0} step={0.5} inputMode="decimal" value={calc.after} onChange={(e) => setCalc({ ...calc, after: e.target.value })} /></label>
          <label>Veces al mes<input type="number" min={0} step={1} inputMode="numeric" value={calc.freq} onChange={(e) => setCalc({ ...calc, freq: e.target.value })} /></label>
        </div>
        <p className="scg-calc-out" aria-live="polite">
          {eff ? <>Ahorras <strong>{eff.savedPerTime} h</strong> por vez ({eff.pct} % menos): <strong>{eff.savedPerMonth} h al mes</strong> liberadas para trabajo de mayor valor.</> : "Ingresa tiempos válidos: el de ahora no puede ser mayor que el de antes."}
        </p>
      </div>

      <h3>Checklist final <small>{ready} de {SHOWCASE_CHECKLIST.length}</small></h3>
      <ul className="scg-check">
        {SHOWCASE_CHECKLIST.map((c, i) => (
          <li key={c}>
            <label>
              <input type="checkbox" checked={done[i]} onChange={() => toggle(i)} />
              <span>{c}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="scg-avoid"><Icon name="alert" size={16} /> <span><strong>Lo que no debe pasar:</strong> {SHOWCASE_AVOID}</span></p>
    </div>
  );
}
