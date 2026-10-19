"use client";

import { useEffect, useState } from "react";
import type { CandidateListItem } from "@/lib/admission/queries";
import { closeNotSelected, confirmSelection, offerSuggestedRescue, previewDecisionEmail, type DecisionResult } from "@/lib/admission/decision-actions";
import { shownEmail } from "@/lib/talent/rules";

export type BulkKind = "select" | "rescue" | "reject";

const COPY: Record<BulkKind, { verb: string; title: (n: number, name: string) => string; what: (subject?: string) => React.ReactNode[]; confirm: (n: number) => string; running: string; tone: string }> = {
  select: {
    verb: "Seleccionar",
    title: (n, name) => (n === 1 ? `Seleccionar a ${name}` : `Seleccionar a ${n} personas`),
    what: (subject) => [
      <>Pasa a <strong>Seleccionado/a</strong> y queda registrado a tu nombre.</>,
      <>Se habilita su acceso al portal (ingresa con su correo y un código).</>,
      <>Recibe el correo <strong>{subject ?? "de bienvenida"}</strong>, con copia a su Delivery.</>,
      <>Su próximo paso es confirmar el compromiso y luego comenzar <strong>AI First Mindset</strong>.</>,
    ],
    confirm: (n) => `Confirmar y enviar ${n === 1 ? "correo" : `${n} correos`}`,
    running: "Seleccionando y enviando…",
    tone: "adm-go",
  },
  rescue: {
    verb: "Ofrecer rescate",
    title: (n, name) => (n === 1 ? `Ofrecer rescate a ${name}` : `Ofrecer rescate a ${n} personas`),
    what: (subject) => [
      <>Pasa a <strong>Rescate activo</strong> y queda registrado a tu nombre.</>,
      <>Tiene <strong>24 horas</strong> (hora del servidor, desde ahora) para enviar un video breve.</>,
      <>Recibe el correo <strong>{subject ?? "de invitación al rescate"}</strong>, con copia a su Delivery, con el foco de su video según sus brechas en la rúbrica.</>,
      <>Cuando envíe el video, aparecerá como <strong>Rescate enviado</strong> para revisarlo y decidir.</>,
    ],
    confirm: (n) => `Confirmar y enviar ${n === 1 ? "invitación" : `${n} invitaciones`}`,
    running: "Habilitando rescates y enviando…",
    tone: "adm-violet",
  },
  reject: {
    verb: "No seleccionar",
    title: (n, name) => (n === 1 ? `No seleccionar a ${name}` : `No seleccionar a ${n} personas`),
    what: () => [
      <>Su proceso se cierra como <strong>No seleccionado/a</strong> (estado final) y queda registrado a tu nombre.</>,
      <>Se avisa a su Delivery. No se envía correo a la persona.</>,
    ],
    confirm: (n) => `Confirmar cierre de ${n === 1 ? "1 persona" : `${n} personas`}`,
    running: "Cerrando…",
    tone: "adm-danger",
  },
};

/**
 * Decisión sobre varias personas a la vez. Antes de ejecutar muestra qué va a pasar y a quiénes; después, el
 * resultado real de cada uno. Usa las mismas acciones que la decisión individual (validan estado y no duplican).
 */
export function BulkDecisionDialog({ kind, people, skipped, onClose }: { kind: BulkKind; people: CandidateListItem[]; skipped: CandidateListItem[]; onClose: (done: boolean) => void }) {
  const t = COPY[kind];
  const [preview, setPreview] = useState<{ subject: string; text: string } | null>(null);
  const [note, setNote] = useState("");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<{ name: string; r: DecisionResult }[] | null>(null);
  useEffect(() => {
    if (people[0] && kind !== "reject") void previewDecisionEmail(people[0].id, kind === "select" ? "selected" : "rescue", null).then(setPreview);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const act = (id: string) => (kind === "select" ? confirmSelection(id, note) : kind === "rescue" ? offerSuggestedRescue(id, note) : closeNotSelected(id, note));
  const run = async () => {
    setRunning(true);
    const out: { name: string; r: DecisionResult }[] = [];
    for (const p of people) out.push({ name: p.full_name, r: await act(p.id) });
    setDone(out);
    setRunning(false);
  };
  const n = people.length;

  return (
    <div className="adm-modal" role="dialog" aria-modal="true" aria-labelledby="bs-t" onKeyDown={(e) => e.key === "Escape" && !running && onClose(Boolean(done))}>
      <div className="adm-modal-card bulk-sel">
        <h2 id="bs-t">{done ? "Resultado" : t.title(n, people[0]?.full_name ?? "")}</h2>
        {!done && (
          <>
            {n > 0 ? (
              <>
                <div className={`bulk-what${kind === "reject" ? " bad" : kind === "rescue" ? " violet" : ""}`}>
                  <strong>Qué va a pasar con {n === 1 ? "esta persona" : "cada una"}:</strong>
                  <ul>{t.what(preview?.subject).map((li, i) => <li key={i}>{li}</li>)}</ul>
                </div>
                <ul className="adm-del-list">{people.map((p) => <li key={p.id}><strong>{p.full_name}</strong> <small className="muted">{shownEmail(p.corporate_email)}{p.eval ? ` · ${Math.round(p.eval.total)}/100` : ""}</small></li>)}</ul>
              </>
            ) : <p>Ninguna de las personas marcadas tiene «{t.verb}» como siguiente paso.</p>}
            {skipped.length > 0 && <p className="muted"><small>No se incluyen ({skipped.length}) porque su siguiente paso es otro: {skipped.map((p) => p.full_name).join(", ")}.</small></p>}
            {preview && <details className="bulk-mail"><summary>{kind === "rescue" ? `Ver la invitación (ejemplo: ${people[0].full_name})` : "Ver el correo que recibirán"}</summary><pre>{preview.text}</pre></details>}
            {n > 0 && <div className="field"><label htmlFor="bs-n">Nota interna (opcional)</label><input id="bs-n" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motivo o contexto de la decisión" /></div>}
            <div className="adm-modal-actions">
              <button type="button" className="btn ghost" disabled={running} onClick={() => onClose(false)}>Cancelar</button>
              {n > 0 && <button type="button" className={`btn ${t.tone}`} disabled={running} onClick={() => void run()}>{running ? t.running : t.confirm(n)}</button>}
            </div>
          </>
        )}
        {done && (
          <>
            <ul className="bulk-res">{done.map(({ name, r }) => <li key={name} className={r.ok ? (r.email === "failed" ? "warn" : "ok") : "bad"}><strong>{name}</strong> <small>{r.message}</small></li>)}</ul>
            <div className="adm-modal-actions"><button type="button" className="btn" onClick={() => onClose(true)}>Listo</button></div>
          </>
        )}
      </div>
    </div>
  );
}
