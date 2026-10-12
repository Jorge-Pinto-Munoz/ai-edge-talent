"use client";

import { useState, useTransition } from "react";
import { reviewCertification, reviewSubmission } from "@/lib/journey/actions";
import { SignedLink } from "@/components/journey/SignedLink";
import { Callout, fmtDate } from "@/components/ui";
import { layerName, type Layer } from "@/lib/journey/rules";

type Sub = { id: string; person: string; attempt: number; status: string; score: number | null; feedback: string | null; text_answer: string | null; files: { name: string; path: string }[]; submitted_at: string; capsules: { title: string; layer: Layer; max_attempts: number | null } };
type Cert = { id: string; person: string; attempt: number; result: string; status: string; file_path: string | null; credential_url: string | null; issued_on: string | null; review_note: string | null; created_at: string };

export function ReviewQueue({ kind, items }: { kind: "submissions" | "certifications"; items: (Sub | Cert)[] }) {
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [notice, setNotice] = useState<string | null>(null);
  const pendingStatuses = kind === "submissions" ? ["SUBMITTED", "HUMAN_REVIEW"] : ["PENDING_REVIEW"];
  const shown = items.filter((i) => filter === "all" || pendingStatuses.includes(i.status));
  return (
    <div className="stack">
      <div className="row">
        <button className={`btn small ${filter === "pending" ? "" : "ghost"}`} onClick={() => setFilter("pending")}>Por revisar ({items.filter((i) => pendingStatuses.includes(i.status)).length})</button>
        <button className={`btn small ${filter === "all" ? "" : "ghost"}`} onClick={() => setFilter("all")}>Todas</button>
      </div>
      {notice && <Callout tone="ok" title={notice} />}
      {shown.length === 0 && <p className="muted">Nada por revisar.</p>}
      {shown.map((i) => (kind === "submissions" ? <SubmissionCard key={i.id} s={i as Sub} onDone={setNotice} /> : <CertCard key={i.id} c={i as Cert} onDone={setNotice} />))}
    </div>
  );
}

function SubmissionCard({ s, onDone }: { s: Sub; onDone: (m: string) => void }) {
  const [score, setScore] = useState(s.score?.toString() ?? "");
  const [fb, setFb] = useState(s.feedback ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const act = (status: "APPROVED" | "NOT_APPROVED" | "HUMAN_REVIEW") =>
    start(async () => {
      const r = await reviewSubmission(s.id, status, score ? Number(score) : null, fb);
      if (r.ok) onDone(`${s.person} · ${s.capsules.title}: ${r.message}`);
      else setMsg(r.message);
    });
  return (
    <div className="card">
      <div className="spread">
        <strong>{s.person} · {s.capsules.title}</strong>
        <small className="muted">{layerName(s.capsules.layer)} · intento {s.attempt}{s.capsules.max_attempts ? ` de ${s.capsules.max_attempts}` : ""} · {fmtDate(s.submitted_at)}</small>
      </div>
      {s.text_answer && <p style={{ whiteSpace: "pre-wrap" }}>{s.text_answer}</p>}
      {s.files.length > 0 && <ul>{s.files.map((f) => <li key={f.path}><SignedLink bucket="submissions" path={f.path}>{f.name}</SignedLink></li>)}</ul>}
      <div className="grid grid-3">
        <div className="field"><label htmlFor={`sc-${s.id}`}>Puntaje (0–100, opcional)</label><input id={`sc-${s.id}`} type="text" inputMode="numeric" value={score} onChange={(e) => setScore(e.target.value.replace(/[^0-9.]/g, ""))} /></div>
      </div>
      <div className="field"><label htmlFor={`fb-${s.id}`}>Feedback para la persona</label><textarea id={`fb-${s.id}`} rows={3} value={fb} onChange={(e) => setFb(e.target.value)} /></div>
      <p className="muted"><small>AI First Mindset: aprobación con ≥75/100 + hard gates. “Revisión humana” no consume intento.</small></p>
      <div className="row">
        <button className="btn small" disabled={pending} onClick={() => act("APPROVED")}>Aprobar</button>
        <button className="btn ghost small" disabled={pending} onClick={() => act("NOT_APPROVED")}>No aprobada</button>
        <button className="btn ghost small" disabled={pending} onClick={() => act("HUMAN_REVIEW")}>Revisión humana</button>
        <span className="badge">{s.status}</span>
      </div>
      {msg && <div style={{ marginTop: 8 }}><Callout tone="bad" title={msg} /></div>}
    </div>
  );
}

function CertCard({ c, onDone }: { c: Cert; onDone: (m: string) => void }) {
  const [note, setNote] = useState(c.review_note ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="card">
      <div className="spread">
        <strong>{c.person} · AI CERT · intento {c.attempt}</strong>
        <span className={`badge ${c.result === "PASSED" ? "ok" : "warn"}`}>{c.result === "PASSED" ? "Aprobado" : "No aprobado"}</span>
      </div>
      <p className="muted">Registrado {fmtDate(c.created_at)}{c.issued_on ? ` · fecha examen ${c.issued_on}` : ""}</p>
      <div className="row">
        {c.file_path && <SignedLink bucket="certificates" path={c.file_path}>Ver certificado</SignedLink>}
        {c.credential_url && <a href={c.credential_url} target="_blank" rel="noopener noreferrer">Credencial en línea ↗</a>}
      </div>
      <div className="field" style={{ marginTop: 10 }}><label htmlFor={`cn-${c.id}`}>Nota</label><input id={`cn-${c.id}`} type="text" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <div className="row">
        <button className="btn small" disabled={pending} onClick={() => start(async () => { const r = await reviewCertification(c.id, "VERIFIED", note); if (r.ok) onDone(`${c.person}: ${r.message}`); else setMsg(r.message); })}>Verificar</button>
        <button className="btn ghost small" disabled={pending} onClick={() => start(async () => { const r = await reviewCertification(c.id, "REJECTED", note); if (r.ok) onDone(`${c.person}: ${r.message}`); else setMsg(r.message); })}>Rechazar registro</button>
        <span className="badge">{c.status}</span>
      </div>
      {msg && <div style={{ marginTop: 8 }}><Callout tone="bad" title={msg} /></div>}
    </div>
  );
}
