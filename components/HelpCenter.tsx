"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { FAQ_BY_ROLE, type FaqRole } from "@/lib/data/program";
import { FaqList } from "./journey";
import { useStore } from "@/lib/store/StoreProvider";

const TABS: { id: FaqRole; label: string }[] = [
  { id: "KIBER", label: "Kiber" },
  { id: "CLIENT", label: "Cliente" },
  { id: "DELIVERY", label: "Delivery" },
];

export function HelpCenter() {
  const params = useSearchParams();
  const { state } = useStore();
  const initial = (params.get("rol") as FaqRole) || (["CLIENT", "DELIVERY"].includes(state.session.role) ? (state.session.role as FaqRole) : "KIBER");
  const [tab, setTab] = useState<FaqRole>(TABS.some((t) => t.id === initial) ? initial : "KIBER");
  const wave3 = state.waves.find((w) => w.id === "wave-3");

  return (
    <div className="stack narrow">
      <h1>Ayuda</h1>
      <div className="row" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`btn small ${tab === t.id ? "" : "ghost"}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="card">
        <FaqList items={FAQ_BY_ROLE[tab]} />
      </div>
      <div className="card">
        <h2 className="h-card">¿Dónde pedir ayuda?</h2>
        <ul>
          {(wave3?.channels ?? []).map((c) => (
            <li key={c.label}>
              <strong>{c.label}:</strong> {c.value ?? <span className="pending-def">PENDIENTE DE DEFINICIÓN</span>}
            </li>
          ))}
        </ul>
        <p className="muted">
          Información completa del programa en <Link href="/programa">/programa</Link>.
        </p>
      </div>
    </div>
  );
}
