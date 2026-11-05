"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveReSession, requestSessionUpload } from "@/lib/teacher/session-actions";
import { FOCUS, attendanceMatch, MATCH_LABEL, type Focus, type SessionFile } from "@/lib/teacher/sessions-rules";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { DownloadButton } from "@/components/journey/SignedLink";
import { Icon } from "@/components/site/Icon";

export type FormPerson = { id: string; name: string; client: string | null; attended: boolean | null; focus: Focus; note: string; checkedIn: boolean };
type Init = { heldOn: string; title: string; studentNotes: string; adminComments: string; materials: SessionFile[] };

/**
 * Registro de una sesión de Role Enablement (profesor o admin): lo que ven los profesionales (fecha, tema, notas, material),
 * comentarios solo para el admin y la asistencia con la concentración observada de cada persona.
 */
export function ReSessionForm({ waveId, n, init, people, today }: { waveId: string; n: number; init: Init; people: FormPerson[]; today: string }) {
  const router = useRouter();
  const [f, setF] = useState(init);
  const [att, setAtt] = useState(() => Object.fromEntries(people.map((p) => [p.id, { attended: p.attended, focus: p.focus, note: p.note }])));
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const marked = people.filter((p) => att[p.id]?.attended !== null && att[p.id]?.attended !== undefined).length;

  const upload = async (list: File[]) => {
    setBusy(true);
    setMsg(null);
    const added: SessionFile[] = [];
    for (const file of list) {
      const r = await requestSessionUpload(waveId, n, file.name, file.size);
      if (!r.ok || !r.data) { setMsg({ ok: false, message: r.message }); continue; }
      const { error } = await supabaseBrowser().storage.from("content").uploadToSignedUrl(r.data.path, r.data.token, file, { contentType: file.type || undefined });
      if (error) { setMsg({ ok: false, message: `No se pudo subir ${file.name}.` }); continue; }
      added.push({ name: file.name, path: r.data.path, size: file.size });
    }
    setF((x) => ({ ...x, materials: [...x.materials, ...added] }));
    setBusy(false);
    if (added.length) setMsg({ ok: true, message: `${added.length} archivo(s) listos: guarda la sesión para publicarlos.` });
  };

  const save = () =>
    start(async () => {
      const attendance = people
        .filter((p) => att[p.id]?.attended !== null && att[p.id]?.attended !== undefined)
        .map((p) => ({ candidateId: p.id, attended: Boolean(att[p.id].attended), focus: att[p.id].focus, note: att[p.id].note }));
      const r = await saveReSession({ waveId, n, ...f, attendance });
      setMsg(r);
      if (r.ok) router.refresh();
    });

  return (
    <form className="res-form" onSubmit={(e) => { e.preventDefault(); save(); }}>
      <fieldset className="res-block">
        <legend><Icon name="users" size={16} /> Para los profesionales</legend>
        <div className="grid grid-2">
          <label className="field">Fecha de la sesión
            <input type="date" value={f.heldOn} onChange={(e) => setF({ ...f, heldOn: e.target.value })} />
          </label>
          <label className="field">Tema
            <input type="text" maxLength={160} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Ej.: Prompting avanzado para QA" />
          </label>
        </div>
        <label className="field">Notas para los profesionales
          <textarea rows={4} maxLength={4000} value={f.studentNotes} onChange={(e) => setF({ ...f, studentNotes: e.target.value })} placeholder="Resumen, tareas para la semana, enlaces útiles. Lo ven en su journey." />
        </label>
        <div className="field">
          <span className="label">Material de la sesión</span>
          {f.materials.length > 0 && (
            <ul className="res-files">
              {f.materials.map((m) => (
                <li key={m.path}>
                  <DownloadButton bucket="content" path={m.path} name={m.name} size={m.size} />
                  <button type="button" className="icon-btn" aria-label={`Quitar ${m.name}`} onClick={() => setF({ ...f, materials: f.materials.filter((x) => x.path !== m.path) })}><Icon name="close" size={16} /></button>
                </li>
              ))}
            </ul>
          )}
          <label className="btn ghost small" style={{ alignSelf: "start", cursor: busy ? "wait" : "pointer" }}>
            <Icon name="upload" size={16} /> {busy ? "Subiendo…" : "Subir material (PPT, PDF, video…)"}
            <input type="file" hidden multiple disabled={busy} onChange={(e) => { const l = Array.from(e.target.files ?? []); e.target.value = ""; if (l.length) void upload(l); }} />
          </label>
        </div>
      </fieldset>

      <fieldset className="res-block private">
        <legend><Icon name="lock" size={16} /> Solo para el admin</legend>
        <label className="field">Cómo fluyó la clase
          <textarea rows={3} maxLength={4000} value={f.adminComments} onChange={(e) => setF({ ...f, adminComments: e.target.value })} placeholder="Participación, ritmo, dudas frecuentes, qué ajustar para la próxima." />
        </label>
      </fieldset>

      <fieldset className="res-block private">
        <legend><Icon name="check" size={16} /> Asistencia y concentración <small className="muted">({marked} de {people.length} marcados · solo admin)</small></legend>
        {f.heldOn > today && <p className="muted" style={{ margin: 0 }}><small>Sesión programada: la asistencia se marca desde el día de la sesión.</small></p>}
        {people.length === 0 ? <p className="muted" style={{ margin: 0 }}>Aún no hay profesionales en Role Enablement en esta Wave.</p> : (
          <ul className="res-people">
            {people.map((p) => {
              const a = att[p.id];
              const m = MATCH_LABEL[attendanceMatch(a.attended, p.checkedIn)];
              return (
                <li key={p.id} className={a.focus === "LOW" ? "low" : ""}>
                  <div className="res-who">
                    <strong>{p.name}</strong>
                    <small className="muted">{p.client ?? "—"}{p.checkedIn ? " · hizo check-in" : ""}</small>
                    {(a.attended !== null || p.checkedIn) && <span className={`badge ${m.tone === "muted" ? "" : m.tone}`}>{m.label}</span>}
                  </div>
                  <div className="seg" role="radiogroup" aria-label={`Asistencia de ${p.name}`}>
                    <button type="button" role="radio" aria-checked={a.attended === true} className={`seg-btn ${a.attended === true ? "on" : ""}`} onClick={() => setAtt({ ...att, [p.id]: { ...a, attended: true } })}>Asistió</button>
                    <button type="button" role="radio" aria-checked={a.attended === false} className={`seg-btn ${a.attended === false ? "on" : ""}`} onClick={() => setAtt({ ...att, [p.id]: { ...a, attended: false } })}>No asistió</button>
                  </div>
                  <select aria-label={`Concentración de ${p.name}`} value={a.focus} disabled={a.attended !== true} onChange={(e) => setAtt({ ...att, [p.id]: { ...a, focus: e.target.value as Focus } })}>
                    {FOCUS.map((x) => <option key={x.id} value={x.id} title={x.hint}>{x.label}</option>)}
                  </select>
                  <input type="text" aria-label={`Comentario sobre ${p.name}`} maxLength={600} value={a.note} placeholder="Comentario (opcional)" onChange={(e) => setAtt({ ...att, [p.id]: { ...a, note: e.target.value } })} />
                </li>
              );
            })}
          </ul>
        )}
        {people.length > 0 && (
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="link-btn" onClick={() => setAtt(Object.fromEntries(people.map((p) => [p.id, { ...att[p.id], attended: true }])))}>Marcar a todos como presentes</button>
            <button type="button" className="link-btn" onClick={() => setAtt(Object.fromEntries(people.map((p) => [p.id, { ...att[p.id], attended: p.checkedIn ? true : att[p.id].attended }])))}>Usar los check-in</button>
          </div>
        )}
      </fieldset>

      <div className="row" style={{ gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="submit" className="btn" disabled={pending || busy}>{pending ? "Guardando…" : `Guardar sesión ${n}`}</button>
        {msg && <span className={msg.ok ? "ok-text" : "error"} role="status">{msg.message}</span>}
      </div>
    </form>
  );
}
