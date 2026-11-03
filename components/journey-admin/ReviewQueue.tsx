"use client";

import { useState, useTransition } from "react";
import { reviewCertification, reviewSubmission } from "@/lib/journey/actions";
import { generateAiReviews, regenerateAiReview } from "@/lib/journey/ai-review-actions";
import { useRouter } from "next/navigation";
import { SignedLink } from "@/components/journey/SignedLink";
import { Callout, fmtDate, fmtYmd } from "@/components/ui";
import { layerName, type Layer } from "@/lib/journey/rules";

type AiReview = { status: "pending" | "done" | "error"; score: number | null; threshold: number | null; verdict: "APPROVED" | "NOT_APPROVED" | "HUMAN_REVIEW" | null; criteria: { criterion: string; met: "si" | "parcial" | "no"; evidence: string }[]; strengths: string[]; improvements: string[]; feedback: string | null; internal_note: string | null; error: string | null; updated_at: string };
const VERDICT: Record<string, string> = { APPROVED: "Aprobar", NOT_APPROVED: "No aprobada", HUMAN_REVIEW: "Revisión humana" };
const SUB_LABEL: Record<string, [string, string]> = { SUBMITTED: ["Por revisar", ""], HUMAN_REVIEW: ["Revisión humana", ""], APPROVED: ["Aprobada", "ok"], NOT_APPROVED: ["No aprobada · reintento", "warn"] };
const MET: Record<string, [string, string]> = { si: ["ok", "Cumple"], parcial: ["warn", "Parcial"], no: ["bad", "No cumple"] };
type Sub = { ai: AiReview | null; id: string; person: string; attempt: number; status: string; score: number | null; feedback: string | null; text_answer: string | null; files: { name: string; path: string }[]; submitted_at: string; capsules: { title: string; layer: Layer; max_attempts: number | null } };
type Cert = { id: string; person: string; attempt: number; result: string; status: string; file_path: string | null; credential_url: string | null; issued_on: string | null; review_note: string | null; created_at: string };

export function ReviewQueue({ kind, items, waveId, isAdmin = false }: { kind: "submissions" | "certifications"; items: (Sub | Cert)[]; waveId?: string; isAdmin?: boolean }) {
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
      {kind === "submissions" && isAdmin && waveId && <AiBar waveId={waveId} subs={items as Sub[]} />}
      {notice && <Callout tone="ok" title={notice} />}
      {shown.length === 0 && <p className="muted">Nada por revisar.</p>}
      {shown.map((i) => (kind === "submissions" ? <SubmissionCard key={i.id} s={i as Sub} onDone={setNotice} canReview={isAdmin} /> : <CertCard key={i.id} c={i as Cert} onDone={setNotice} canReview={isAdmin} />))}
    </div>
  );
}

function SubmissionCard({ s, onDone, canReview }: { s: Sub; onDone: (m: string) => void; canReview: boolean }) {
  // Sin revisión humana aún: los campos parten con la propuesta de la IA, para editar y enviar.
  const draft = s.ai?.status === "done" && s.score === null && !s.feedback ? s.ai : null;
  const [score, setScore] = useState(s.score?.toString() ?? (draft?.score != null ? String(Math.round(draft.score)) : ""));
  const [fb, setFb] = useState(s.feedback ?? draft?.feedback ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [notify, setNotify] = useState(true);
  const act = (status: "APPROVED" | "NOT_APPROVED" | "HUMAN_REVIEW") =>
    start(async () => {
      if (status !== "HUMAN_REVIEW" && notify && !confirm(`${status === "APPROVED" ? "Aprobar" : "Marcar como no aprobada"} la entrega de ${s.person}.\n\nSe le enviará un correo con el puntaje y el feedback${status === "NOT_APPROVED" ? ", pidiéndole los ajustes para su reintento" : ""}, con copia a su Delivery.`)) return;
      const r = await reviewSubmission(s.id, status, score ? Number(score) : null, fb, notify);
      if (r.ok) onDone(`${s.person} · ${s.capsules.title}: ${r.message}`);
      else setMsg(r.message);
    });
  return (
    <div className="card" id={`sub-${s.id}`} style={{ scrollMarginTop: 140 }}>
      <div className="spread">
        <strong>{s.person} · {s.capsules.title}{s.attempt > 1 && <span className="badge warn" style={{ marginLeft: 8 }}>Reintento · intento {s.attempt}</span>}</strong>
        <small className="muted">{layerName(s.capsules.layer)} · intento {s.attempt}{s.capsules.max_attempts ? ` de ${s.capsules.max_attempts}` : ""} · {fmtDate(s.submitted_at)}</small>
      </div>
      {s.text_answer && <p style={{ whiteSpace: "pre-wrap" }}>{s.text_answer}</p>}
      {s.files.length > 0 && <ul>{s.files.map((f) => <li key={f.path}><SignedLink bucket="submissions" path={f.path}>{f.name}</SignedLink></li>)}</ul>}
      {!canReview ? (
        <p className="muted" style={{ margin: "8px 0 0" }}>
          <span className={`badge ${SUB_LABEL[s.status]?.[1] ?? ""}`}>{SUB_LABEL[s.status]?.[0] ?? s.status}</span>
          {s.score !== null && <> · {Math.round(Number(s.score))}/100</>}
          {s.feedback && <><br /><small><strong>Feedback enviado:</strong> {s.feedback}</small></>}
          <br /><small>La revisión la hace el equipo AI Edge Talent (admin).</small>
        </p>
      ) : (<>
      <AiPanel s={s} onUse={(text, sc) => { setFb(text); if (sc != null) setScore(String(Math.round(sc))); }} />
      {draft && <p className="ai-draft-note">Puntaje y feedback precargados con la propuesta de la IA: revísalos, edítalos si quieres y elige la decisión. Nada se envía hasta que tú lo decides.</p>}
      <div className="grid grid-3">
        <div className="field"><label htmlFor={`sc-${s.id}`}>Puntaje (0–100, opcional)</label><input id={`sc-${s.id}`} type="text" inputMode="numeric" value={score} onChange={(e) => setScore(e.target.value.replace(/[^0-9.]/g, ""))} /></div>
      </div>
      <div className="field"><label htmlFor={`fb-${s.id}`}>Feedback para la persona</label><textarea id={`fb-${s.id}`} rows={3} value={fb} onChange={(e) => setFb(e.target.value)} /></div>
      <p className="muted"><small>AI First Mindset: aprobación con ≥75/100 + hard gates. “Revisión humana” no consume intento.</small></p>
      <label className="check" style={{ margin: "0 0 10px" }}>
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
        <span>Enviarle el resultado por correo (puntaje y feedback, con copia a su Delivery). Si no aprueba, el correo le pide los ajustes y le explica cómo hacer su reintento.</span>
      </label>
      <div className="row">
        <button className="btn small" disabled={pending} onClick={() => act("APPROVED")}>Aprobar</button>
        <button className="btn ghost small" disabled={pending} onClick={() => act("NOT_APPROVED")}>No aprobada</button>
        <button className="btn ghost small" disabled={pending} onClick={() => act("HUMAN_REVIEW")}>Revisión humana</button>
        <span className="badge">{s.status}</span>
      </div>
      </>)}
      {msg && <div style={{ marginTop: 8 }}><Callout tone="bad" title={msg} /></div>}
    </div>
  );
}

function CertCard({ c, onDone, canReview }: { c: Cert; onDone: (m: string) => void; canReview: boolean }) {
  const [note, setNote] = useState(c.review_note ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="card">
      <div className="spread">
        <strong>{c.person} · AI CERT · intento {c.attempt}</strong>
        <span className={`badge ${c.result === "PASSED" ? "ok" : "warn"}`}>{c.result === "PASSED" ? "Aprobado" : "No aprobado"}</span>
      </div>
      <p className="muted">Registrado {fmtDate(c.created_at)}{c.issued_on ? ` · fecha examen ${fmtYmd(c.issued_on)}` : ""}</p>
      <div className="row">
        {c.file_path && <SignedLink bucket="certificates" path={c.file_path}>Ver certificado</SignedLink>}
        {c.credential_url && <a href={c.credential_url} target="_blank" rel="noopener noreferrer">Credencial en línea ↗</a>}
      </div>
      {canReview ? (<>
      <div className="field" style={{ marginTop: 10 }}><label htmlFor={`cn-${c.id}`}>Nota</label><input id={`cn-${c.id}`} type="text" value={note} onChange={(e) => setNote(e.target.value)} /></div>
      <div className="row">
        <button className="btn small" disabled={pending} onClick={() => start(async () => { const r = await reviewCertification(c.id, "VERIFIED", note); if (r.ok) onDone(`${c.person}: ${r.message}`); else setMsg(r.message); })}>Verificar</button>
        <button className="btn ghost small" disabled={pending} onClick={() => start(async () => { const r = await reviewCertification(c.id, "REJECTED", note); if (r.ok) onDone(`${c.person}: ${r.message}`); else setMsg(r.message); })}>Rechazar registro</button>
        <span className="badge">{c.status}</span>
      </div>
      </>) : <p className="muted"><span className="badge">{c.status === "VERIFIED" ? "Verificado" : c.status === "REJECTED" ? "Rechazado" : "En verificación"}</span> <small>La verificación la hace el admin.</small></p>}
      {msg && <div style={{ marginTop: 8 }}><Callout tone="bad" title={msg} /></div>}
    </div>
  );
}

function AiBar({ waveId, subs }: { waveId: string; subs: Sub[] }) {
  const pending = subs.filter((s) => ["SUBMITTED", "HUMAN_REVIEW"].includes(s.status));
  const missing = pending.filter((s) => !s.ai || s.ai.status === "error").length;
  const running = pending.filter((s) => s.ai?.status === "pending").length;
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, start] = useTransition();
  const router = useRouter();
  return (
    <div className="ai-bar">
      <div>
        <strong>Revisión con IA (Claude)</strong>
        <small className="muted">
          {" "}· {pending.length - missing - running} de {pending.length} entregas por revisar tienen propuesta{running ? ` · ${running} en proceso` : ""}. La IA propone puntaje y feedback; la decisión es tuya.
        </small>
      </div>
      <div className="row">
        {missing > 0 && <button type="button" className="btn small" disabled={busy} onClick={() => start(async () => { setMsg(await generateAiReviews(waveId)); router.refresh(); })}>{busy ? "Enviando a Claude…" : `Generar propuestas (${missing})`}</button>}
        {running > 0 && <button type="button" className="btn small ghost" onClick={() => router.refresh()}>Actualizar</button>}
      </div>
      {msg && <div style={{ gridColumn: "1 / -1" }}><Callout tone={msg.ok ? "ok" : "bad"} title={msg.message} /></div>}
    </div>
  );
}

function AiPanel({ s, onUse }: { s: Sub; onUse: (feedback: string, score: number | null) => void }) {
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const ai = s.ai;
  const redo = <button type="button" className="link-btn" disabled={busy} onClick={() => start(async () => { const r = await regenerateAiReview(s.id); if (!r.ok) setErr(r.message); router.refresh(); })}>{busy ? "Revisando con Claude…" : ai ? "Volver a generar" : "Generar propuesta"}</button>;
  if (!ai) return <div className="ai-panel muted"><small>Sin propuesta de la IA todavía. </small>{redo}</div>;
  if (ai.status === "pending") return <div className="ai-panel"><small>Claude está revisando esta entrega… actualiza en un momento.</small></div>;
  if (ai.status === "error") return <div className="ai-panel bad"><small>La revisión con IA falló: {ai.error} </small>{redo}{err && <small className="error"> {err}</small>}</div>;
  const n = (k: "si" | "parcial" | "no") => ai.criteria.filter((c) => c.met === k).length;
  return (
    <div className="ai-panel">
      <div className="ai-head">
        <strong>Propuesta de la IA</strong> <small className="muted">· no es una decisión</small>
        <span className="ai-score">{ai.score != null ? Math.round(ai.score) : "—"}<small>/100</small></span>
        {ai.verdict && <span className={`badge ${ai.verdict === "APPROVED" ? "ok" : ai.verdict === "NOT_APPROVED" ? "warn" : ""}`}>{ai.verdict === "APPROVED" ? "Aprobado" : ai.verdict === "NOT_APPROVED" ? "No cumple" : "Revisión humana"}</span>}
        {ai.threshold != null && <small className="muted">mínimo {ai.threshold}</small>}
      </div>
      {ai.feedback && (
        <>
          <p className="ai-fb">{ai.feedback}</p>
          <div className="row" style={{ marginTop: 8 }}>
            <button type="button" className="btn small" onClick={() => onUse(ai.feedback!, ai.score)}>Usar en el feedback</button>
            <button type="button" className="btn small ghost" onClick={async () => { try { await navigator.clipboard.writeText(ai.feedback!); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setErr("No se pudo copiar: selecciona el texto y cópialo."); } }}>{copied ? "Copiado ✓" : "Copiar texto"}</button>
          </div>
        </>
      )}
      {ai.criteria.length > 0 && (
        <details className="ai-crit">
          <summary>Ver los {ai.criteria.length} criterios · {n("si")} cumple{n("parcial") ? ` · ${n("parcial")} parcial` : ""}{n("no") ? ` · ${n("no")} no cumple` : ""}</summary>
          <ul className="ai-criteria">
            {ai.criteria.map((c, i) => (
              <li key={i}><span className={`badge ${MET[c.met][0]}`}>{MET[c.met][1]}</span> <strong>{c.criterion}</strong><br /><small className="muted">{c.evidence}</small></li>
            ))}
          </ul>
          {ai.internal_note && <p className="ai-note"><strong>Nota para quien revisa:</strong> {ai.internal_note}</p>}
        </details>
      )}
      <div className="row" style={{ marginTop: 6 }}>{redo}</div>
      {err && <small className="error">{err}</small>}
    </div>
  );
}
