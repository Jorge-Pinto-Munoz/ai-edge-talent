"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { importCandidates, type ActionResult } from "@/lib/admission/admin-actions";
import { parseCandidatesCsv } from "@/lib/import/candidates";
import { Callout } from "@/components/ui";

export function ImportForm({ waveId }: { waveId: string }) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  const preview = text.trim() ? parseCandidatesCsv(text) : null;
  return (
    <div className="stack">
      <div className="card">
        <label htmlFor="file">Archivo CSV</label>
        <input id="file" type="file" accept=".csv,text/csv" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); }} />
        <label htmlFor="csv" style={{ marginTop: 12 }}>…o pega el contenido</label>
        <textarea id="csv" rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Nombre;Correo;Cliente;Rol;Especialidad\nAna Pérez;ana@kibernum.com;Cliente Alfa;QA Analyst;Calidad"} />
      </div>
      {preview && (
        <div className="card">
          <strong>Vista previa: {preview.rows.length} fila(s) válida(s)</strong>
          {preview.errors.length + preview.duplicates.length > 0 && (
            <ul className="error" style={{ fontWeight: 400 }}>
              {preview.errors.map((e) => <li key={e.line + e.message}>Línea {e.line}: {e.message}</li>)}
              {preview.duplicates.map((d) => <li key={d}>Duplicado en el archivo: {d}</li>)}
            </ul>
          )}
          {preview.rows.length > 0 && (
            <div className="table-wrap" tabIndex={0} style={{ marginTop: 10 }}>
              <table>
                <thead><tr><th>Nombre</th><th>Correo</th><th>Cliente</th><th>Rol</th><th>Especialidad</th></tr></thead>
                <tbody>
                  {preview.rows.slice(0, 8).map((r) => (
                    <tr key={r.corporate_email}><td>{r.full_name}</td><td>{r.corporate_email}</td><td>{r.client_name ?? "—"}</td><td>{r.role_title ?? "—"}</td><td>{r.specialty ?? "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button className="btn" style={{ marginTop: 12 }} disabled={pending || preview.rows.length === 0} onClick={() => start(async () => setResult(await importCandidates(waveId, text)))}>
            {pending ? "Importando…" : `Importar ${preview.rows.length} candidato(s)`}
          </button>
        </div>
      )}
      {result && (
        <Callout tone={result.ok ? "ok" : "bad"} title={result.message}>
          {result.details && result.details.length > 0 && <ul style={{ margin: 0 }}>{result.details.map((d) => <li key={d}><small>{d}</small></li>)}</ul>}
          {result.ok && <Link href={`/admin/admision/${waveId}`}>Ver candidatos e invitar →</Link>}
        </Callout>
      )}
    </div>
  );
}
