"use client";

import { useState } from "react";
import type { PulseDef } from "@/lib/pulse/definitions";
import { Icon } from "@/components/site/Icon";
import { Sheet } from "@/components/site/Sheet";
import { PulseForm } from "./PulseForm";

/** Aviso de pulso pendiente con su formulario en una hoja (portal del cliente). */
export function PulseCard({ def, waveId, preview = false, text }: { def: PulseDef; waveId: string; preview?: boolean; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="pulse-card">
        <Icon name="chat" size={26} />
        <div><strong>{def.title} · 2 minutos</strong><p>{text}</p></div>
        <button type="button" className="btn small" onClick={() => setOpen(true)} aria-haspopup="dialog">Responder</button>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} eyebrow="Pulso" title={def.title}>
        <PulseForm def={def} waveId={waveId} preview={preview} onDone={() => setOpen(false)} />
      </Sheet>
    </>
  );
}
