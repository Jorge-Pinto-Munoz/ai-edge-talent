"use client";

import { useEffect, useState } from "react";
import type { CandidateListItem } from "@/lib/admission/queries";
import { confirmSelection, previewDecisionEmail, type DecisionResult } from "@/lib/admission/decision-actions";
import { shownEmail } from "@/lib/talent/rules";

const DECIDABLE = ["ASSESSMENT_EVALUATED", "HUMAN_REVIEW", "RESCUE_REQUIRED"];

/**
 * Seleccionar a varias personas a la vez. Antes de ejecutar muestra qué va a pasar (estado, acceso, correo y copia
 * al Delivery) y a quiénes; después, el resultado real de cada uno. Usa la misma acción que la selección individual.
 */
export function BulkSelectDialog({ people, onClose }: { people: CandidateListItem[]; onClose: (done: boolean) => void }) {
  const ok = people.filter((p) => DECIDABLE.includes(p.status));
  const skip = people.filter((p) => !DECIDABLE.includes(p.status));
  const [preview, setPreview] = useState<{ subject: string; text: string } | null>(null);
  const [note, setNote] = useState("");
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState<{ name: string; r: DecisionResult }[] | null>(null);
  useEffect(() => { if (ok[0]) void previewDecisionEmail(ok[0].id, "selected").then(setPreview); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async () => {
    setRunning(true);
    const out: { name: string; r: DecisionResult }[] = [];
    for (const p of ok) out.push({ name: p.full_name, r: await confirmSelection(p.id, note) });
    setDone(out);
    setRunning(false);
  };

  return (
    <div className="adm-modal" role="dialog" aria-modal="true" aria-labelledby="bs-t" onKeyDown={(e) => e.key === "Escape" && !running && onClose(Boolean(done))}>
      <div className="adm-modal-card bulk-sel">
        <h2 id="bs-t">{done ? "Resultado de la selección" : ok.length === 1 ? `Seleccionar a ${ok[0].full_name}` : `Seleccionar a ${ok.length} personas`}</h2>
        {!done && (
          <>
            {ok.length > 0 ? (
              <>
                <div className="bulk-what">
                  <strong>Qué va a pasar con {ok.length === 1 ? "esta persona" : "cada una"}:</strong>
                  <ul>
                    <li>Pasa a <strong>Seleccionado/a</strong> y queda registrado a tu nombre.</li>
                    <li>Se habilita su acceso al portal (ingresa con su correo y un código).</li>
                    <li>Recibe el correo <strong>{preview?.subject ?? "de bienvenida"}</strong>, con copia a su Delivery.</li>
                    <li>Su próximo paso es confirmar el compromiso y luego comenzar <strong>AI First Mindset</strong>.</li>
                  </ul>
                </div>
                <ul className="adm-del-list">{ok.map((p) => <li key={p.id}><strong>{p.full_name}</strong> <small className="muted">{shownEmail(p.corporate_email)}{p.eval ? ` · ${Math.round(p.eval.total)}/100` : ""}</small></li>)}</ul>
              </>
            ) : <p>Ninguna de las personas marcadas está en condiciones de ser seleccionada.</p>}
            {skip.length > 0 && <p className="muted"><small>No se incluyen ({skip.length}) porque no tienen una decisión pendiente: {skip.map((p) => p.full_name).join(", ")}.</small></p>}
            {preview && (
              <details className="bulk-mail"><summary>Ver el correo que recibirán</summary><pre>{preview.text}</pre></details>
            )}
            {ok.length > 0 && <div className="field"><label htmlFor="bs-n">Nota interna (opcional)</label><input id="bs-n" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Motivo o contexto de la decisión" /></div>}
            <div className="adm-modal-actions">
              <button type="button" className="btn ghost" disabled={running} onClick={() => onClose(false)}>Cancelar</button>
              {ok.length > 0 && <button type="button" className="btn adm-go" disabled={running} onClick={() => void run()}>{running ? "Seleccionando y enviando…" : `Confirmar y enviar ${ok.length === 1 ? "correo" : `${ok.length} correos`}`}</button>}
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
