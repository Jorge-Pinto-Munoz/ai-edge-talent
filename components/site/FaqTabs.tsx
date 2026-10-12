"use client";

import { useState } from "react";
import { Icon } from "./Icon";

/** Preguntas agrupadas en pestañas, para no mostrar un muro de texto. */
export function FaqTabs({ groups }: { groups: { section: string; items: { q: string; a: string }[] }[] }) {
  const [tab, setTab] = useState(0);
  const g = groups[tab];
  return (
    <div>
      <div className="tabs-x" role="tablist" aria-label="Temas">
        {groups.map((x, i) => (
          <button key={x.section} role="tab" id={`faq-tab-${i}`} aria-selected={tab === i} aria-controls="faq-panel" onClick={() => setTab(i)}>
            {x.section}
          </button>
        ))}
      </div>
      <div key={tab} id="faq-panel" role="tabpanel" aria-labelledby={`faq-tab-${tab}`} className="faq-x tab-panel">
        {g.items.map((x) => (
          <details key={x.q}>
            <summary>
              {x.q}
              <span className="plus"><Icon name="plus" size={18} /></span>
            </summary>
            <p>{x.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
