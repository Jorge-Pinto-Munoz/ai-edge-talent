"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelSchedule, openStage, scheduleStage, type OpeningResult } from "@/lib/journey/opening-actions";
import { OPENING_LABEL, type OpeningStatus } from "@/lib/journey/opening-labels";
import { Callout } from "@/components/ui";

const fmt = (iso: string) => new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));

/** Valor para <input type="datetime-local"> en hora de Chile, mañana a las 09:00. */
function defaultLocal(): string {
  const d = new Date(Date.now() + 86_400_000);
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return `${day}T09:00`;
}

/** Convierte "AAAA-MM-DDTHH:MM" en hora de Chile a ISO (resuelve el desfase real de esa fecha, con horario de verano). */
function chileToIso(local: string): string {
  const guess = new Date(`${local}:00Z`);
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(guess);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const shown = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return new Date(guess.getTime() - (shown - guess.getTime())).toISOString();
}

export function StageOpeningPanel(props: { waveId: string; status: OpeningStatus; opensAt: string | null; notifiedAt: string | null; enabled: number; pending: number; firstChallenge: string | null; canEdit: boolean }) {
  const { waveId, status, opensAt, canEdit } = props;
  const [msg, setMsg] = useState<OpeningResult | null>(null);
  const [picking, setPicking] = useState(false);
  const [local, setLocal] = useState(defaultLocal);
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = (fn: () => Promise<OpeningResult>) => start(async () => { const r = await fn(); setMsg(r); if (r.ok) { setPicking(false); router.refresh(); } });

  return (
    <section className={`card open-panel st-${status}`} aria-labelledby="op-h">
      <div className="spread">
        <div>
          <h2 id="op-h" className="h-card" style={{ margin: 0 }}>Apertura de AI First Mindset</h2>
          <p className="muted" style={{ margin: "4px 0 0" }}>Las personas pueden ingresar al portal antes; el contenido de la etapa se habilita con la apertura.</p>
        </div>
        <span className={`open-state st-${status}`}>{OPENING_LABEL[status]}</span>
      </div>
      <dl className="open-stats">
        <div><dt>Habilitados</dt><dd>{props.enabled}</dd></div>
        <div><dt>Pendientes de confirmar</dt><dd>{props.pending}</dd></div>
        <div><dt>{status === "scheduled" ? "Abre el" : status === "closed" ? "Fecha" : "Abierta desde"}</dt><dd>{opensAt ? fmt(opensAt) : "Sin fecha"}</dd></div>
        <div><dt>Primer reto</dt><dd>{props.firstChallenge ?? <span className="muted">Aún no hay cápsulas publicadas</span>}</dd></div>
      </dl>
      {status !== "closed" && status !== "scheduled" && <p className="muted" style={{ margin: 0 }}><small>{props.notifiedAt ? `Aviso «primer reto disponible» enviado el ${fmt(props.notifiedAt)}.` : "El aviso de apertura está pendiente."}</small></p>}
      {canEdit && (status === "closed" || status === "scheduled") && (
        <div className="stack" style={{ gap: 10 }}>
          <div className="row" style={{ gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn" disabled={pending} onClick={() => confirm("¿Abrir AI First Mindset ahora? Se habilita el contenido y se avisa una vez a las personas inscritas.") && run(() => openStage(waveId))}>Abrir etapa</button>
            <button type="button" className="btn ghost" disabled={pending} onClick={() => run(() => scheduleStage(waveId, "48h"))}>Programar en 48 h</button>
            <button type="button" className="btn ghost" disabled={pending} onClick={() => setPicking((x) => !x)} aria-expanded={picking}>Programar fecha…</button>
            {status === "scheduled" && <button type="button" className="link-btn" disabled={pending} onClick={() => run(() => cancelSchedule(waveId))}>Cancelar programación</button>}
          </div>
          {picking && (
            <form className="row" style={{ gap: 10, flexWrap: "wrap", alignItems: "end" }} onSubmit={(e) => { e.preventDefault(); run(() => scheduleStage(waveId, chileToIso(local))); }}>
              <div className="field" style={{ margin: 0 }}>
                <label htmlFor="op-date">Fecha y hora (hora de Chile)</label>
                <input id="op-date" type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} required />
              </div>
              <button className="btn small" disabled={pending}>Programar apertura</button>
            </form>
          )}
        </div>
      )}
      {!canEdit && <p className="muted" style={{ margin: 0 }}><small>Solo Administración abre o programa la etapa.</small></p>}
      {msg && <Callout tone={msg.ok ? "ok" : "bad"} title={msg.message} />}
    </section>
  );
}
