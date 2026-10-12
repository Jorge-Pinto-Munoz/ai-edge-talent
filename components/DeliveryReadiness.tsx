"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store/StoreProvider";
import { toggleDeliveryReadiness } from "@/lib/store/state";
import { DELIVERY_READINESS_ITEMS } from "@/lib/data/playbook";
import { Badge, Progress } from "./ui";

const LINKS: Record<string, string> = {
  "Revisar el programa": "/programa",
  "Revisar el journey": "/programa#etapas",
  "Conocer los gates": "/programa#etapas",
  "Conocer los riesgos": "/delivery/waves/wave-3",
  "Conocer las comunicaciones": "/delivery/playbook",
  "Conocer las responsabilidades (RACI)": "/responsabilidades",
  "Revisar el cliente asignado": "/client/journey",
  "Revisar los participantes": "/delivery/waves/wave-3",
  "Saber cuándo escalar": "/delivery/playbook",
};

export function DeliveryReadiness() {
  const { state, run } = useStore();
  const wave = state.waves.find((w) => w.isReferenceWave);
  const owners = wave?.deliveryOwners.length ? wave.deliveryOwners : ["Delivery"];
  const [who, setWho] = useState(owners[0]);
  const done = state.deliveryReadiness[who] ?? [];
  const ready = DELIVERY_READINESS_ITEMS.every((i) => done.includes(i));
  const pct = Math.round((done.length / DELIVERY_READINESS_ITEMS.length) * 100);

  return (
    <div className="stack narrow">
      <h1>Delivery readiness · {wave?.name.replace("AI Edge Talent · ", "")}</h1>
      <p className="lead">Antes de operar la Wave, cada Delivery completa su preparación.</p>
      <div className="row">
        <label htmlFor="who" style={{ margin: 0 }}>Delivery:</label>
        <select id="who" value={who} onChange={(e) => setWho(e.target.value)} style={{ width: "auto" }}>
          {owners.map((o) => <option key={o}>{o}</option>)}
        </select>
        <Badge tone={ready ? "ok" : "warn"}>{ready ? "READY" : "INCOMPLETE"}</Badge>
      </div>
      <Progress pct={pct} />
      <div className="card">
        {DELIVERY_READINESS_ITEMS.map((i) => (
          <label key={i} className="check">
            <input type="checkbox" checked={done.includes(i)} onChange={() => run((s) => toggleDeliveryReadiness(s, who, i))} />
            <span>
              {i} {LINKS[i] && <Link href={LINKS[i]}>· abrir</Link>}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
