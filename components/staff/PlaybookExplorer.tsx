"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { DeliveryStage } from "@/lib/data/delivery-guide";
import { Icon } from "@/components/site/Icon";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type Block = { title: string; items: string[]; tone?: "never" | "risk" };
type Section = { id: string; n?: number; name: string; purpose?: string; blocks: Block[] };

/** Playbook consultable: índice por etapa, buscador transversal y bloques cortos (no un documento interminable). */
export function PlaybookExplorer({ before, stages, handoffs, faq }: {
  before: { actions: string[]; never: string[]; milestones: string[]; escalate: string[]; communicate: string[] };
  stages: DeliveryStage[];
  handoffs: Record<string, string[]>;
  faq: { q: string; a: string }[];
}) {
  const [q, setQ] = useState("");
  const sections: Section[] = useMemo(() => [
    { id: "antes", name: "Antes de la Wave", purpose: "Preparar al cliente y la Wave antes de nominar.", blocks: [
      { title: "Tu gestión", items: before.actions },
      { title: "Comunicaciones", items: before.communicate },
      { title: "Evidencia esperada", items: before.milestones },
      { title: "Cuándo escalar", items: before.escalate },
      { title: "No debes", items: before.never, tone: "never" },
    ] },
    ...stages.map((s) => ({
      id: s.id, n: s.n, name: s.name, purpose: s.purpose, blocks: [
        { title: "Tu gestión (checklist)", items: s.actions },
        { title: "El profesional hará", items: s.professional },
        { title: "Comunicaciones", items: s.communicate.map((c) => `${c.to}: ${c.what}`) },
        { title: "Hitos", items: s.milestones },
        { title: "Riesgos y mitigación", items: s.risks.map((r) => `${r.risk} → ${r.mitigation}`), tone: "risk" as const },
        { title: "Cuándo escalar", items: s.escalate },
        { title: "Traspasos", items: handoffs[s.id] ?? [] },
        { title: "No debes", items: s.never, tone: "never" as const },
      ],
    })),
    { id: "faq", name: "Preguntas frecuentes", blocks: [{ title: "Respuestas del programa", items: faq.map((f) => `${f.q} — ${f.a}`) }] },
  ], [before, stages, handoffs, faq]);

  const t = norm(q.trim());
  const visible = sections
    .map((s) => ({ ...s, blocks: s.blocks.map((b) => ({ ...b, items: t ? b.items.filter((i) => norm(i).includes(t) || norm(b.title).includes(t) || norm(s.name).includes(t)) : b.items })).filter((b) => b.items.length) }))
    .filter((s) => s.blocks.length);
  const hits = visible.reduce((n, s) => n + s.blocks.reduce((m, b) => m + b.items.length, 0), 0);

  return (
    <div className="pb">
      <header className="pb-head">
        <div>
          <div className="eyebrow"><Link href="/equipo">Área de equipo</Link> · Playbook</div>
          <h1>Playbook de acompañamiento</h1>
          <p>Qué hacer, comunicar, vigilar y escalar en cada etapa. Busca una situación o recorre por etapa.</p>
        </div>
        <label className="help-search pb-search">
          <Icon name="search" size={18} />
          <span className="sr-only">Buscar en el playbook</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej.: sin avance, cliente, confidencialidad, rescate…" />
        </label>
        {t && <p className="muted pb-count" aria-live="polite">{hits} resultado{hits === 1 ? "" : "s"} para “{q}”</p>}
      </header>

      <div className="pb-layout">
        <nav className="pb-index" aria-label="Etapas del playbook">
          <ol>
            {sections.map((s) => {
              const on = visible.some((v) => v.id === s.id);
              return (
                <li key={s.id}><a href={`#pb-${s.id}`} className={on ? "" : "off"} aria-disabled={!on}>
                  <span className="pb-n" aria-hidden="true">{s.n ?? (s.id === "faq" ? "?" : "0")}</span>{s.name}
                </a></li>
              );
            })}
          </ol>
        </nav>
        <div className="pb-body">
          {visible.length === 0 && <p className="help-none">No hay resultados para “{q}”. Prueba con otra palabra o pregunta en el canal del equipo.</p>}
          {visible.map((s) => (
            <section key={s.id} id={`pb-${s.id}`} className="pb-sec" aria-labelledby={`pb-t-${s.id}`}>
              <h2 id={`pb-t-${s.id}`}>{s.n ? <span className="pb-n" aria-hidden="true">{s.n}</span> : null}{s.name}</h2>
              {s.purpose && <p className="pb-purpose">{s.purpose}</p>}
              <div className="pb-blocks">
                {s.blocks.map((b) => (
                  <div key={b.title} className={`pb-block ${b.tone ?? ""}`}>
                    <h3>{b.title}</h3>
                    <ul>{b.items.map((i) => <li key={i}>{i}</li>)}</ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
