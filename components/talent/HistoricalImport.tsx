"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { importHistorical, type TalentResult } from "@/lib/talent/actions";
import { parseHistoricalCsv, SERVICE_LABEL } from "@/lib/talent/rules";
import { Callout } from "@/components/ui";

export function HistoricalImport() {
  const [text, setText] = useState("");
  const [res, setRes] = useState<TalentResult | null>(null);
  const [pending, start] = useTransition();
  const preview = text.trim() ? parseHistoricalCsv(text) : null;
  return (
    <div className="stack">
      <div className="card">
        <label htmlFor="hf">Archivo CSV</label>
        <input id="hf" type="file" accept=".csv,text/csv" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); }} />
        <label htmlFor="ht" style={{ marginTop: 12 }}>…o pega el contenido</label>
        <textarea id="ht" rows={7} value={text} onChange={(e) => setText(e.target.value)} placeholder={"Nombre;Correo;Wave;Cliente;Rol;Especialidad;Resultado;Estado servicio\nAna Pérez;ana@kibernum.com;Wave 1;Cliente Alfa;QA;Calidad;Completó;En servicio"} />
      </div>
      {preview && (
        <div className="card">
          <strong>{preview.rows.length} fila(s) válida(s)</strong>
          {preview.errors.length > 0 && <ul className="error" style={{ fontWeight: 400 }}>{preview.errors.map((e) => <li key={e}>{e}</li>)}</ul>}
          <div className="table-wrap" tabIndex={0} style={{ marginTop: 8 }}>
            <table>
              <thead><tr><th>Nombre</th><th>Wave</th><th>Completó</th><th>Servicio</th></tr></thead>
              <tbody>{preview.rows.slice(0, 8).map((r) => <tr key={r.corporate_email + r.wave_id}><td>{r.full_name}</td><td>{r.wave_id}</td><td>{r.completed ? "Sí" : "No"}</td><td>{SERVICE_LABEL[r.service_status]}</td></tr>)}</tbody>
            </table>
          </div>
          <button className="btn" style={{ marginTop: 10 }} disabled={pending || !preview.rows.length} onClick={() => start(async () => setRes(await importHistorical(text)))}>{pending ? "Cargando…" : `Cargar ${preview.rows.length}`}</button>
        </div>
      )}
      {res && (
        <Callout tone={res.ok ? "ok" : "bad"} title={res.message}>
          {res.details && res.details.length > 0 && <ul style={{ margin: 0 }}>{res.details.map((d) => <li key={d}><small>{d}</small></li>)}</ul>}
          {res.ok && <Link href="/admin/talento">Ver pool de talento →</Link>}
        </Callout>
      )}
    </div>
  );
}
