"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { TalentRow } from "@/lib/talent/queries";
import { FAMILIES, SERVICE_LABEL, retention, talentCsv, type ServiceStatus } from "@/lib/talent/rules";
import { layerName, type Layer } from "@/lib/journey/rules";
import { Badge } from "@/components/ui";

const completed = (r: TalentRow) => r.participations.some((p) => p.journey_layer === "CLOSURE");
const SERVICE_TONE: Record<ServiceStatus, "ok" | "warn" | "bad"> = { IN_SERVICE: "ok", BENCH: "warn", LEFT: "bad" };

export function TalentPool({ rows }: { rows: TalentRow[] }) {
  const [q, setQ] = useState("");
  const [family, setFamily] = useState("");
  const [wave, setWave] = useState("");
  const [service, setService] = useState("");
  const [onlyHT, setOnlyHT] = useState(false);
  const [onlyGrad, setOnlyGrad] = useState(false);
  // Banca: personas que no quedaron en alguna Wave (o quedaron en rescate) y no han entrado después. Se pueden invitar a la próxima.
  const [onlyBench, setOnlyBench] = useState(false);
  const onBench = (r: TalentRow) => r.participations.some((p) => p.status === "NOT_SELECTED") && !r.participations.some((p) => ["ENROLLED", "MINDSET_READY"].includes(p.status));
  const waves = [...new Map(rows.flatMap((r) => r.participations.map((p) => [p.wave_id, p.wave_name] as const))).entries()].sort();

  const shown = useMemo(
    () =>
      rows
        .filter((r) => !q || `${r.full_name} ${r.email} ${r.current_client ?? ""} ${r.specialty ?? ""}`.toLowerCase().includes(q.toLowerCase()))
        .filter((r) => !family || (r.specialty_family ?? "Sin cluster") === family)
        .filter((r) => !wave || r.participations.some((p) => p.wave_id === wave))
        .filter((r) => !service || r.service_status === service)
        .filter((r) => !onlyHT || r.high_talent)
        .filter((r) => !onlyGrad || completed(r))
        .filter((r) => !onlyBench || onBench(r)),
    [rows, q, family, wave, service, onlyHT, onlyGrad, onlyBench],
  );
  const ret = retention(rows.map((r) => ({ completed: completed(r), service: r.service_status })));
  const today = new Date().toISOString().slice(0, 10);
  const overdue = rows.filter((r) => r.nextFollowUp && r.nextFollowUp.due_date <= today).length;

  const download = () => {
    const csv = talentCsv(shown.map((r) => ({ name: r.full_name, email: r.email, family: r.specialty_family, client: r.current_client, service: r.service_status, highTalent: r.high_talent, waves: r.participations.map((p) => p.wave_name).join(" · ") })));
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: `talento-aet-${today}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="stack">
      <div className="grid grid-3">
        <Kpi n={rows.length} label="personas en el pool" />
        <Kpi n={rows.filter((r) => r.service_status === "IN_SERVICE").length} label="en servicio" />
        <Kpi n={rows.filter((r) => r.high_talent).length} label="High Talent" accent />
        <Kpi n={ret.completed} label="completaron el programa" />
        <Kpi n={ret.pct === null ? "—" : `${ret.pct}%`} label="retención de quienes completaron" />
        <Kpi n={overdue} label="seguimientos vencidos" warn={overdue > 0} />
      </div>

      <h2 style={{ margin: "8px 0 0" }}>Clusters por especialidad</h2>
      <div className="grid grid-3">
        {[...FAMILIES, "Sin cluster"].map((f) => {
          const inF = rows.filter((r) => (r.specialty_family ?? "Sin cluster") === f);
          if (inF.length === 0) return null;
          return (
            <button key={f} className={`card signal`} style={{ textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit", borderColor: family === f ? "var(--accent)" : undefined }} onClick={() => setFamily(family === f ? "" : f)}>
              <div className="spread"><strong>{f}</strong><span className="kpi" style={{ fontSize: "1.4rem" }}>{inF.length}</span></div>
              <small className="muted">
                {inF.filter((r) => r.service_status === "IN_SERVICE").length} en servicio · {inF.filter((r) => r.high_talent).length} High Talent · {inF.filter(completed).length} completaron
              </small>
            </button>
          );
        })}
      </div>

      <div className="card">
        <div className="row">
          <input type="text" placeholder="Buscar nombre, correo, cliente…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 280 }} />
          <select value={wave} onChange={(e) => setWave(e.target.value)} style={{ width: "auto" }} aria-label="Wave">
            <option value="">Todas las Waves</option>
            {waves.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
          <select value={service} onChange={(e) => setService(e.target.value)} style={{ width: "auto" }} aria-label="Estado de servicio">
            <option value="">Todo estado de servicio</option>
            {Object.entries(SERVICE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label className="check" style={{ marginBottom: 0 }}><input type="checkbox" checked={onlyHT} onChange={(e) => setOnlyHT(e.target.checked)} /><span>Solo High Talent</span></label>
          <label className="check" style={{ marginBottom: 0 }}><input type="checkbox" checked={onlyGrad} onChange={(e) => setOnlyGrad(e.target.checked)} /><span>Completaron</span></label>
          <label className="check" style={{ marginBottom: 0 }}><input type="checkbox" checked={onlyBench} onChange={(e) => setOnlyBench(e.target.checked)} /><span>No quedaron · invitar a la próxima ({rows.filter(onBench).length})</span></label>
          <button className="btn ghost small" onClick={download}>Descargar CSV ({shown.length})</button>
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead><tr><th>Persona</th><th>Cluster</th><th>Cliente · Rol</th><th>Waves</th><th>Servicio</th><th>Próximo seguimiento</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id}>
                <td>
                  <Link href={`/admin/talento/${r.id}`}><strong>{r.full_name}</strong></Link> {r.high_talent && <Badge tone="brand">High Talent</Badge>}
                  <br /><small className="muted">{r.email}</small>
                </td>
                <td>{r.specialty_family ?? <span className="muted">—</span>}<br /><small className="muted">{r.specialty ?? ""}</small></td>
                <td>{r.current_client ?? "—"}<br /><small className="muted">{r.role_title ?? ""}</small></td>
                <td>
                  {r.participations.map((p) => (
                    <div key={p.wave_id}><small>{p.wave_name} · {p.journey_layer ? layerName(p.journey_layer as Layer) : p.status === "ENROLLED" || p.status === "MINDSET_READY" ? "Inscrito/a" : "Admisión"}</small></div>
                  ))}
                </td>
                <td><Badge tone={SERVICE_TONE[r.service_status]}>{SERVICE_LABEL[r.service_status]}</Badge>{r.service_status_since && <><br /><small className="muted">desde {r.service_status_since}</small></>}</td>
                <td>{r.nextFollowUp ? <small className={r.nextFollowUp.due_date <= today ? "pending-def" : ""}>{r.nextFollowUp.kind === "MONTH_1" ? "Mes 1" : r.nextFollowUp.kind === "MONTH_3" ? "Mes 3" : "Seguimiento"} · {r.nextFollowUp.due_date}</small> : <span className="muted">—</span>}</td>
              </tr>
            ))}
            {shown.length === 0 && <tr><td colSpan={6} className="muted">Sin resultados.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ n, label, accent, warn }: { n: number | string; label: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="card">
      <div className={`kpi ${accent ? "accent" : ""}`} style={warn ? { color: "var(--warn-text)" } : undefined}>{n}</div>
      <small className="muted">{label}</small>
    </div>
  );
}
