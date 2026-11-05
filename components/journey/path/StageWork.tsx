"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/site/Icon";
import { DownloadButton } from "@/components/journey/SignedLink";
import { LabFiles } from "@/components/hub/LabFiles";
import { checkInSession, reportMyAicertProgress } from "@/lib/teacher/session-actions";
import { describeMyProject } from "@/lib/hub/actions";
import { fmtDate, fmtYmd } from "@/components/ui";
import type { JourneyView } from "./types";

type Msg = { ok: boolean; message: string } | null;
const Note = ({ msg }: { msg: Msg }) => (msg ? <p className={msg.ok ? "ok-text" : "error"} role="status" style={{ margin: 0 }}>{msg.message}</p> : null);

/* ───────── Role Enablement: una sesión semanal ───────── */
export function SessionSheet({ v, n }: { v: JourneyView; n: number }) {
  const s = v.sessions.find((x) => x.n === n);
  const router = useRouter();
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const held = Boolean(s?.heldOn && s.heldOn <= v.today);
  const canCheckIn = !v.preview && v.path.currentLayer === "ROLE_ENABLEMENT" && !s?.checkedInAt;
  return (
    <div className="jr-sheet-stack">
      <ul className="jr-meta">
        <li><Icon name="calendar" size={16} /> Semana {n}{s?.heldOn ? ` · ${fmtYmd(s.heldOn)}` : " · fecha por confirmar"}</li>
        {s?.materials.length ? <li><Icon name="download" size={16} /> {s.materials.length} material(es)</li> : null}
      </ul>
      {s?.title && <h4 style={{ margin: 0 }}>{s.title}</h4>}
      {s?.studentNotes ? (
        <div className="jr-feedback"><strong>Notas del profesor</strong><p style={{ whiteSpace: "pre-line" }}>{s.studentNotes}</p></div>
      ) : (
        <p className="muted">{held ? "El profesor aún no deja notas de esta sesión." : "Después de la sesión, el profesor deja aquí sus notas y el material."}</p>
      )}
      {s?.materials.length ? <div className="dl-list">{s.materials.map((m) => <DownloadButton key={m.path} bucket="content" path={m.path} name={m.name} size={m.size} />)}</div> : null}

      <div className="jr-project">
        <span className="jr-k">Tu check-in</span>
        {s?.checkedInAt ? (
          <p style={{ margin: 0 }}><Icon name="check" size={16} /> Hiciste check-in el {fmtDate(s.checkedInAt)}.</p>
        ) : (
          <p className="muted" style={{ margin: 0 }}>Marca que fuiste a la sesión. No reemplaza la asistencia que registra el profesor: se cruzan para tu seguimiento.</p>
        )}
        {s && s.attended !== null && <p style={{ margin: 0 }}><small className="muted">Asistencia registrada por el profesor:</small> <strong>{s.attended ? "Asististe" : "No asististe"}</strong></p>}
        {canCheckIn && (
          <button type="button" className="jr-cta" disabled={pending} onClick={() => start(async () => { const r = await checkInSession(n); setMsg(r); if (r.ok) router.refresh(); })}>
            <Icon name="check" size={18} /> {pending ? "Registrando…" : "Fui a la sesión · hacer check-in"}
          </button>
        )}
        <Note msg={msg} />
      </div>
    </div>
  );
}

/* ───────── Role Enablement: el profesional reporta su avance en AI CERT ───────── */
export function AiCertSelfReport({ v }: { v: JourneyView }) {
  const p = v.aicert;
  const router = useRouter();
  const [f, setF] = useState({ course: p?.course ?? "INTRO", tramo: p?.tramo ?? 0, percent: p?.percent ?? 0, note: "" });
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  if (v.preview || v.path.currentLayer !== "ROLE_ENABLEMENT") return null;
  return (
    <form className="jr-project self-report" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await reportMyAicertProgress(f); setMsg(r); if (r.ok) router.refresh(); }); }}>
      <span className="jr-k">Reporta tu avance en AI CERT</span>
      <p className="muted" style={{ margin: 0 }}>Míralo en tu plataforma de estudiante AI CERT y anótalo aquí, idealmente cada semana.{p?.selfReportedAt ? ` Último reporte: ${fmtDate(p.selfReportedAt)}.` : ""}</p>
      <div className="sr-grid">
        <label className="field">Curso
          <select value={f.course} onChange={(e) => setF({ ...f, course: e.target.value as "INTRO" | "SPECIALIST" })}>
            <option value="INTRO">Introductorio</option>
            <option value="SPECIALIST">Especialista</option>
          </select>
        </label>
        <label className="field">Tramo (0 a 5)
          <input type="number" min={0} max={5} value={f.tramo} onChange={(e) => setF({ ...f, tramo: Number(e.target.value) })} />
        </label>
        <label className="field">Avance del curso (%)
          <input type="number" min={0} max={100} value={f.percent} onChange={(e) => setF({ ...f, percent: Number(e.target.value) })} />
        </label>
      </div>
      <label className="field">Comentario (opcional)
        <input type="text" maxLength={500} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Ej.: terminé el módulo 3, me cuesta el tema de prompts" />
      </label>
      <button type="submit" className="jr-cta" disabled={pending}>{pending ? "Guardando…" : "Guardar mi avance"}</button>
      <Note msg={msg} />
    </form>
  );
}

/* ───────── Plantilla oficial del Showcase ───────── */
export function TemplateBox({ v, text }: { v: JourneyView; text: string }) {
  return (
    <div className="jr-project">
      <span className="jr-k">Plantilla oficial del Showcase</span>
      <p className="muted" style={{ margin: 0 }}>{text}</p>
      {v.showcaseTemplate ? <DownloadButton bucket="content" path={v.showcaseTemplate.path} name={v.showcaseTemplate.name} size={v.showcaseTemplate.size} kind="template" /> : <p className="muted" style={{ margin: 0 }}><small>El equipo publicará aquí la plantilla.</small></p>}
    </div>
  );
}

/* ───────── AI Lab: describe tu proyecto y sube tus avances ───────── */
export function ProjectSheet({ v }: { v: JourneyView }) {
  const lab = v.lab;
  const router = useRouter();
  const [f, setF] = useState({ title: lab?.title ?? "", problem: lab?.problem ?? "", solution: lab?.solution ?? "" });
  const [msg, setMsg] = useState<Msg>(null);
  const [pending, start] = useTransition();
  const editable = !v.preview && (v.path.currentLayer === "AI_LAB_SHOWCASE" || (v.path.currentLayer === "SHOWCASE" && Boolean(lab)));
  return (
    <div className="jr-sheet-stack">
      <p>En el AI Lab construyes, con el Hub AI, una solución con IA para un problema real de tu cliente. Descríbela aquí y ve subiendo tus avances: el Hub AI los revisa y decide cuándo está lista para el Showcase.</p>
      {editable ? (
        <form className="jr-project" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await describeMyProject(f); setMsg(r); if (r.ok) router.refresh(); }); }}>
          <span className="jr-k">{lab ? "Tu proyecto" : "Registra tu proyecto"}</span>
          <label className="field">Nombre del proyecto
            <input type="text" required maxLength={160} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ej.: Asistente IA para conciliación de pagos" />
          </label>
          <label className="field">El desafío (problema real del cliente)
            <textarea rows={3} required maxLength={3000} value={f.problem} onChange={(e) => setF({ ...f, problem: e.target.value })} placeholder="Qué duele hoy, a quién y cuánto cuesta (tiempo, errores, dinero)" />
          </label>
          <label className="field">Tu solución con IA
            <textarea rows={3} required maxLength={3000} value={f.solution} onChange={(e) => setF({ ...f, solution: e.target.value })} placeholder="Qué construyes, qué herramientas de IA usas y cómo medirás el impacto" />
          </label>
          <button type="submit" className="jr-cta" disabled={pending}>{pending ? "Guardando…" : lab ? "Guardar cambios" : "Registrar mi proyecto"}</button>
          <Note msg={msg} />
          {lab && <small className="muted">{lab.mode === "GROUP" ? `Proyecto grupal · ${lab.teammates} personas: cualquiera del equipo puede editarlo.` : "Proyecto individual."}</small>}
        </form>
      ) : lab ? (
        <div className="jr-project">
          <span className="jr-k">Tu proyecto</span>
          <strong>{lab.title}</strong>
          {lab.problem && <p style={{ margin: 0 }}><strong>Desafío:</strong> {lab.problem}</p>}
          {lab.solution && <p style={{ margin: 0 }}><strong>Solución:</strong> {lab.solution}</p>}
        </div>
      ) : (
        <p className="muted">Aquí registrarás tu proyecto cuando estés en el AI Lab.</p>
      )}
      {lab && (
        <div className="jr-project">
          <span className="jr-k">Avances del proyecto</span>
          <LabFiles projectId={lab.id} files={lab.files} canUpload={!v.preview && v.path.currentLayer === "AI_LAB_SHOWCASE"} myId={v.preview ? undefined : v.myId} />
        </div>
      )}
      <TemplateBox v={v} text="Descárgala desde ya para ir armando tu caso: es la que usarás en el Showcase." />
    </div>
  );
}

/* ───────── Showcase: solo la presentación final ───────── */
export function FinalSheet({ v }: { v: JourneyView }) {
  const lab = v.lab;
  return (
    <div className="jr-sheet-stack">
      <p>Arma tu presentación con la plantilla oficial y súbela aquí: es la versión final que verá el cliente (PPT, PPTX, PDF o Keynote). Puedes reemplazarla hasta el día del Showcase.</p>
      <TemplateBox v={v} text="Usa esta estructura: problema, solución, demo, impacto medido y próximos pasos." />
      <div className="jr-project">
        <span className="jr-k">Tu presentación final</span>
        {lab ? <LabFiles projectId={lab.id} files={lab.files} canUpload={!v.preview && v.path.currentLayer === "SHOWCASE"} myId={v.preview ? undefined : v.myId} final /> : <p className="muted" style={{ margin: 0 }}>Podrás subirla cuando tu proyecto esté registrado.</p>}
      </div>
    </div>
  );
}
