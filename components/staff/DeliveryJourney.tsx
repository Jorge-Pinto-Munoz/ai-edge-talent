"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { DeliveryStage } from "@/lib/data/delivery-guide";
import { Icon } from "@/components/site/Icon";
import { StatusPill, type StatusKind } from "@/components/ds/Status";

export interface StageLive {
  id: string;
  status: StatusKind;
  people: number;
  attention: { id: string; name: string; reason: string; action: string; level: string }[];
}

/** Journey visual para Delivery: recorrido de etapas con estado real y, al elegir una, qué hace el profesional y tu gestión. */
export function DeliveryJourney({ stages, live, waveId }: { stages: DeliveryStage[]; live: StageLive[]; waveId: string | null }) {
  const first = live.find((l) => l.status === "attention") ?? live.find((l) => l.status === "progress") ?? live[0];
  const [sel, setSel] = useState(first?.id ?? stages[0].id);
  const s = stages.find((x) => x.id === sel)!;
  const rail = useRef<HTMLDivElement>(null);
  // En celular el riel es horizontal: la etapa elegida siempre queda a la vista.
  useEffect(() => {
    const r = rail.current, el = r?.querySelector<HTMLElement>(".dj-rail-item.on");
    if (!r || !el || r.scrollWidth <= r.clientWidth) return;
    // Posición relativa al riel (offsetLeft se mide contra la página cuando el riel no está posicionado).
    const left = r.scrollLeft + el.getBoundingClientRect().left - r.getBoundingClientRect().left - 8;
    r.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [sel]);
  const l = live.find((x) => x.id === sel);

  return (
    <div className="dj">
      <div className="dj-rail" ref={rail} role="tablist" aria-label="Etapas del programa" aria-orientation="vertical">
        {stages.map((st) => {
          const lv = live.find((x) => x.id === st.id);
          const on = st.id === sel;
          return (
            <button key={st.id} type="button" role="tab" aria-selected={on} aria-controls="dj-panel" id={`dj-tab-${st.id}`} tabIndex={on ? 0 : -1}
              className={`dj-rail-item k-${lv?.status ?? "pending"} ${on ? "on" : ""}`}
              onClick={() => setSel(st.id)}
              onKeyDown={(e) => {
                const i = stages.findIndex((x) => x.id === sel);
                const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
                if (!d) return;
                e.preventDefault();
                const n = stages[(i + d + stages.length) % stages.length];
                setSel(n.id);
                document.getElementById(`dj-tab-${n.id}`)?.focus();
              }}>
              <span className="dj-rail-n" aria-hidden="true">{lv?.status === "done" ? <Icon name="check" size={16} /> : st.n}</span>
              <span className="dj-rail-txt">
                <strong>{st.name}</strong>
                <small>{lv && lv.people > 0 ? `${lv.people} profesional${lv.people === 1 ? "" : "es"}` : "Sin profesionales"}{lv?.status === "attention" ? " · requiere atención" : ""}</small>
              </span>
              {lv?.status === "attention" && <span className="dj-rail-dot" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <section className="dj-panel" id="dj-panel" role="tabpanel" aria-labelledby={`dj-tab-${s.id}`} key={s.id}>
        <header className="dj-head">
          <span className="dj-ico"><Icon name={s.icon} size={24} /></span>
          <div>
            <div className="dj-eyebrow">Etapa {s.n}</div>
            <h2>{s.name}</h2>
            <p>{s.purpose}</p>
          </div>
          {l && <StatusPill kind={l.status} />}
        </header>

        {l && l.attention.length > 0 && (
          <div className="dj-attn" role="region" aria-label="Requieren tu atención">
            <h3><Icon name="alert" size={18} /> Requieren tu atención</h3>
            <ul>
              {l.attention.map((a) => (
                <li key={a.id}>
                  <span className={`risk ${a.level.toLowerCase()}`}>{a.level}</span>
                  <div><strong>{a.name}</strong><p>{a.reason}</p><p className="dj-next">→ {a.action}</p></div>
                </li>
              ))}
            </ul>
            {waveId && <Link className="more-link" href={`/admin/journey/${waveId}?tab=aicert`}>Ver avance y alertas <Icon name="arrowRight" size={16} /></Link>}
          </div>
        )}

        <div className="dj-cols">
          <div className="dj-pro">
            <h3>El profesional hará</h3>
            <ul>{s.professional.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          <div className="dj-you">
            <h3>Tu gestión como Delivery</h3>
            <ul className="ds-checklist">{s.actions.map((x) => <li key={x}><Icon name="check" size={16} /><span>{x}</span></li>)}</ul>
            <div className="dj-grid">
              <div>
                <h4>Comunicaciones</h4>
                <ul className="dj-comms">{s.communicate.map((c) => <li key={c.what}><span className="dj-to">{c.to}</span>{c.what}</li>)}</ul>
              </div>
              <div>
                <h4>Hitos a monitorear</h4>
                <ol className="ds-milestones">{s.milestones.map((m) => <li key={m}>{m}</li>)}</ol>
              </div>
            </div>
            <details className="dj-more">
              <summary>Riesgos, escalamiento y lo que no debes hacer <Icon name="chevronDown" size={18} /></summary>
              <div className="dj-grid">
                <div>
                  <h4>Riesgos y cómo anticiparlos</h4>
                  <ul className="dj-risks">{s.risks.map((r) => <li key={r.risk}><strong>{r.risk}</strong><span>{r.mitigation}</span></li>)}</ul>
                </div>
                <div>
                  <h4>Cuándo escalar</h4>
                  <ul>{s.escalate.map((x) => <li key={x}>{x}</li>)}</ul>
                  <h4>No debes</h4>
                  <ul className="dj-never">{s.never.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              </div>
            </details>
            {s.where && waveId && (
              <div className="dj-where">
                <span>En la plataforma:</span>
                {s.where.map((w) => <Link key={w.href} href={w.href.replace("{wave}", waveId)} className="ds-chip">{w.label} <Icon name="arrowRight" size={14} /></Link>)}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
