"use client";

import { useState } from "react";

const FIRST = 5;

/** Personas de una columna del semáforo: las primeras a la vista y el resto con «Ver todas» (sin scroll interno). */
export function GpList({ people }: { people: { id: string; name: string; detail: string }[] }) {
  const [all, setAll] = useState(false);
  const shown = all ? people : people.slice(0, FIRST);
  return (
    <>
      <ul>
        {shown.map((r) => <li key={r.id}><strong>{r.name}</strong><small>{r.detail}</small></li>)}
        {people.length === 0 && <li className="muted"><small>Nadie</small></li>}
      </ul>
      {people.length > FIRST && (
        <button type="button" className="gp-more" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? "Ver menos" : `Ver todas (${people.length})`}
        </button>
      )}
    </>
  );
}
