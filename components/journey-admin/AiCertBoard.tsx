"use client";

import { useState, useTransition } from "react";
import { saveAiCertProgress, type Result } from "@/lib/aicert/actions";
import { COURSE_LABEL, progressLabel, type AiCertCourse, type AiCertProgress, type RiskAlert } from "@/lib/aicert/progress";
import { ROLE_PATHS } from "@/lib/data/aicert";
import { layerName, type Layer } from "@/lib/journey/rules";
import { fmtYmd } from "@/components/ui";

export interface AiCertPerson {
  id: string;
  name: string;
  role: string | null;
  layer: Layer | null;
  progress: AiCertProgress | null;
  overall: number;
  attendance: number | null;
  alert: RiskAlert | null;
}

const LEVEL_ORDER = { Alta: 0, Media: 1, Preventiva: 2 } as const;

/** Avance AI CERT de la Wave: el líder del programa (admin) lo actualiza; Delivery lo ve con las alertas. */
export function AiCertBoard({ waveId, people, isAdmin }: { waveId: string; people: AiCertPerson[]; isAdmin: boolean }) {
  const sorted = [...people].sort((a, b) => (a.alert ? LEVEL_ORDER[a.alert.level] : 9) - (b.alert ? LEVEL_ORDER[b.alert.level] : 9) || a.name.localeCompare(b.name));
  const alerts = people.filter((p) => p.alert);
  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>
        Ruta por persona (curso introductorio + especialista) y avance por tramo, tal como aparece en la plataforma AI CERTs.
        {isAdmin ? " Solo tú, como líder del programa, lo actualizas; el profesional y su cliente lo ven en sus portales." : " Lo actualiza el líder del programa."}
      </p>
      {alerts.length > 0 && (
        <div className="callout">
          <strong>{alerts.length} alerta(s) en Role Enablement.</strong> Combinan avance en plataforma, asistencia y el último pulso. Primero las de nivel alto.
        </div>
      )}
      <datalist id="aic-especialistas">{ROLE_PATHS.map((r) => <option key={r.profile} value={r.profile} />)}</datalist>
      <div className="table-wrap" tabIndex={0}>
        <table className="rtable">
          <thead><tr><th>Persona</th><th>Etapa</th><th>Avance AI CERT</th><th>Asistencia</th><th>Alerta y acción recomendada</th>{isAdmin && <th><span className="sr-only">Editar</span></th>}</tr></thead>
          <tbody>
            {sorted.map((p) => <Row key={p.id} p={p} waveId={waveId} isAdmin={isAdmin} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ p, waveId, isAdmin }: { p: AiCertPerson; waveId: string; isAdmin: boolean }) {
  const [edit, setEdit] = useState(false);
  return (
    <>
      <tr>
        <td className="rt-title">{p.name}{p.role && <><br /><small className="muted">{p.role}</small></>}</td>
        <td data-label="Etapa">{layerName(p.layer)}</td>
        <td data-label="Avance AI CERT">
          <strong>{p.overall}%</strong> <small className="muted">de la ruta</small><br />
          <small>{progressLabel(p.progress)}</small>
          {p.progress?.exam_date && <><br /><small className="muted">Examen: {fmtYmd(p.progress.exam_date)}</small></>}
        </td>
        <td data-label="Asistencia">{p.attendance === null ? "—" : `${Math.round(p.attendance * 100)}%`}</td>
        <td data-label="Alerta">
          {p.alert ? (
            <><span className={`risk ${p.alert.level.toLowerCase()}`}>{p.alert.level}</span> <small>{p.alert.reason}</small><br /><small className="muted">→ {p.alert.action}</small></>
          ) : <span className="muted">Sin alertas</span>}
        </td>
        {isAdmin && <td><button type="button" className="btn small ghost" aria-expanded={edit} onClick={() => setEdit(!edit)}>{edit ? "Cerrar" : "Actualizar"}</button></td>}
      </tr>
      {edit && (
        <tr className="rt-sub"><td colSpan={6}><Editor p={p} waveId={waveId} onSaved={() => setEdit(false)} /></td></tr>
      )}
    </>
  );
}

function Editor({ p, waveId, onSaved }: { p: AiCertPerson; waveId: string; onSaved: () => void }) {
  const g = p.progress;
  const [f, setF] = useState({
    introCourse: g?.intro_course ?? "",
    specialistCourse: g?.specialist_course ?? "",
    course: (g?.course ?? "INTRO") as AiCertCourse,
    tramo: g?.tramo ?? 0,
    percent: g?.percent ?? 0,
    examDate: g?.exam_date ?? "",
    note: g?.note ?? "",
  });
  const [res, setRes] = useState<Result | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const id = (k: string) => `aic-${p.id}-${k}`;
  return (
    <form
      className="aic-edit"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveAiCertProgress({ candidateId: p.id, waveId, ...f, tramo: Number(f.tramo), percent: Number(f.percent) });
          setRes(r);
          if (r.ok) onSaved();
        });
      }}
    >
      <div className="field"><label htmlFor={id("i")}>Curso introductorio</label><input id={id("i")} value={f.introCourse} onChange={set("introCourse")} maxLength={120} /></div>
      <div className="field"><label htmlFor={id("s")}>Curso especialista</label><input id={id("s")} list="aic-especialistas" value={f.specialistCourse} onChange={set("specialistCourse")} maxLength={120} /></div>
      <div className="field"><label htmlFor={id("c")}>Va en</label>
        <select id={id("c")} value={f.course} onChange={set("course")}>{(["INTRO", "SPECIALIST"] as AiCertCourse[]).map((c) => <option key={c} value={c}>{COURSE_LABEL[c]}</option>)}</select>
      </div>
      <div className="field"><label htmlFor={id("t")}>Tramo</label>
        <select id={id("t")} value={f.tramo} onChange={set("tramo")}>{[0, 1, 2, 3, 4, 5].map((t) => <option key={t} value={t}>{t === 0 ? "Sin iniciar" : `Tramo ${t}`}</option>)}</select>
      </div>
      <div className="field"><label htmlFor={id("p")}>Avance del curso (%)</label><input id={id("p")} type="number" min={0} max={100} value={f.percent} onChange={set("percent")} /></div>
      <div className="field"><label htmlFor={id("e")}>Fecha de examen</label><input id={id("e")} type="date" value={f.examDate} onChange={set("examDate")} /></div>
      <div className="field aic-note"><label htmlFor={id("n")}>Nota interna</label><input id={id("n")} value={f.note} onChange={set("note")} maxLength={500} /></div>
      <div className="aic-actions">
        {res && !res.ok && <p className="error" role="alert">{res.message}</p>}
        <button className="btn small" disabled={pending}>{pending ? "Guardando…" : "Guardar avance"}</button>
      </div>
    </form>
  );
}
