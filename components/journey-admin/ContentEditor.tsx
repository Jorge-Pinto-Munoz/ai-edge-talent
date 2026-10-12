"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveCapsule, saveStageGuide, type CapsuleInput } from "@/lib/journey/actions";
import { LAYERS, type Layer } from "@/lib/journey/rules";
import type { Capsule, StageGuide } from "@/lib/journey/queries";
import { FileUpload } from "@/components/journey/FileUpload";
import { Callout } from "@/components/ui";

const EDITABLE: Layer[] = ["AI_MINDSET", "ROLE_ENABLEMENT", "AI_LAB_SHOWCASE", "CLOSURE"];

export function ContentEditor({ waveId, guides, capsules }: { waveId: string; guides: StageGuide[]; capsules: Capsule[] }) {
  const [layer, setLayer] = useState<Layer>("AI_MINDSET");
  const [editing, setEditing] = useState<Capsule | "new" | null>(null);
  const list = capsules.filter((c) => c.layer === layer);
  return (
    <div className="stack">
      <nav className="row" aria-label="Etapas del contenido">
        {EDITABLE.map((l) => (
          <button key={l} className={`btn small ${layer === l ? "" : "ghost"}`} onClick={() => { setLayer(l); setEditing(null); }}>
            {LAYERS.find((x) => x.id === l)!.name}
          </button>
        ))}
      </nav>
      <GuideForm key={layer} waveId={waveId} layer={layer} guide={guides.find((g) => g.layer === layer) ?? null} />
      <div className="card">
        <div className="spread">
          <h2 className="h-card" style={{ margin: 0 }}>Cápsulas</h2>
          <button className="btn small" onClick={() => setEditing("new")}>Nueva cápsula</button>
        </div>
        <ul style={{ marginTop: 10 }}>
          {list.map((c) => (
            <li key={c.id}>
              <button className="link-context" style={{ background: "none", border: 0, cursor: "pointer", font: "inherit" }} onClick={() => setEditing(c)}>
                {c.position}. {c.title}
              </button>{" "}
              <span className={`badge ${c.published ? "ok" : ""}`}>{c.published ? "Publicada" : "Borrador"}</span>
              {c.task_prompt && <span className="badge" style={{ marginLeft: 4 }}>Tarea{c.task_required ? " obligatoria" : ""}</span>}
            </li>
          ))}
          {list.length === 0 && <li className="muted">Sin cápsulas en esta etapa.</li>}
        </ul>
      </div>
      {editing && (
        <CapsuleForm
          key={editing === "new" ? "new" : editing.id}
          waveId={waveId}
          layer={layer}
          capsule={editing === "new" ? null : editing}
          nextPosition={list.length + 1}
          onDone={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function GuideForm({ waveId, layer, guide }: { waveId: string; layer: Layer; guide: StageGuide | null }) {
  const name = LAYERS.find((l) => l.id === layer)!;
  const [f, setF] = useState({
    title: guide?.title ?? name.name,
    summary: guide?.summary ?? name.description,
    whatHappens: guide?.what_happens ?? "",
    whatWeExpect: guide?.what_we_expect ?? "",
    videoUrl: guide?.video_url ?? "",
    videoPath: guide?.video_path ?? null,
  });
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="card">
      <div className="eyebrow">Video explicativo de la etapa</div>
      <div className="grid grid-2">
        <div className="field"><label htmlFor="gt">Título</label><input id="gt" type="text" value={f.title} onChange={set("title")} /></div>
        <div className="field"><label htmlFor="gv">Enlace del video</label><input id="gv" type="text" value={f.videoUrl} onChange={set("videoUrl")} placeholder="https://youtu.be/…" /></div>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <FileUpload bucket="content" waveId={waveId} accept="video/*" label={f.videoPath ? "Reemplazar video subido" : "…o subir un video"} onUploaded={(u) => setF((x) => ({ ...x, videoPath: u.path, videoUrl: "" }))} />
        {f.videoPath && <small className="muted">Archivo: {f.videoPath.split("/").pop()}</small>}
      </div>
      <div className="field"><label htmlFor="gs">Resumen</label><textarea id="gs" rows={2} value={f.summary} onChange={set("summary")} /></div>
      <div className="grid grid-2">
        <div className="field"><label htmlFor="gh">Qué ocurre</label><textarea id="gh" rows={3} value={f.whatHappens} onChange={set("whatHappens")} /></div>
        <div className="field"><label htmlFor="ge">Qué esperamos del profesional</label><textarea id="ge" rows={3} value={f.whatWeExpect} onChange={set("whatWeExpect")} /></div>
      </div>
      {msg && <Callout tone={msg.ok ? "ok" : "bad"} title={msg.message} />}
      <button className="btn small" disabled={pending} onClick={() => start(async () => { setMsg(await saveStageGuide({ waveId, layer, ...f })); router.refresh(); })}>Guardar guía</button>
    </div>
  );
}

function CapsuleForm({ waveId, layer, capsule, nextPosition, onDone }: { waveId: string; layer: Layer; capsule: Capsule | null; nextPosition: number; onDone: () => void }) {
  const [c, setC] = useState<CapsuleInput>({
    id: capsule?.id,
    waveId,
    layer,
    position: capsule?.position ?? nextPosition,
    title: capsule?.title ?? "",
    description: capsule?.description ?? "",
    durationMin: capsule?.duration_min ?? null,
    videoUrl: capsule?.video_url ?? "",
    videoPath: capsule?.video_path ?? null,
    resources: capsule?.resources ?? [],
    taskPrompt: capsule?.task_prompt ?? "",
    taskRequired: capsule?.task_required ?? false,
    maxAttempts: capsule?.max_attempts ?? (layer === "AI_MINDSET" ? 2 : null),
    dueDate: capsule?.due_date ?? "",
    published: capsule?.published ?? false,
  });
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const txt = (k: "title" | "description" | "videoUrl" | "taskPrompt" | "dueDate") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setC({ ...c, [k]: e.target.value });
  return (
    <div className="card" style={{ borderColor: "var(--accent)" }}>
      <h2 className="h-card" style={{ marginTop: 0 }}>{capsule ? "Editar cápsula" : "Nueva cápsula"}</h2>
      <div className="grid grid-3">
        <div className="field"><label htmlFor="ct">Título</label><input id="ct" type="text" value={c.title} onChange={txt("title")} /></div>
        <div className="field"><label htmlFor="cp">Orden</label><input id="cp" type="text" inputMode="numeric" value={c.position} onChange={(e) => setC({ ...c, position: Number(e.target.value) || 1 })} /></div>
        <div className="field"><label htmlFor="cm">Duración (min)</label><input id="cm" type="text" inputMode="numeric" value={c.durationMin ?? ""} onChange={(e) => setC({ ...c, durationMin: e.target.value ? Number(e.target.value) : null })} /></div>
      </div>
      <div className="field"><label htmlFor="cd">Descripción</label><textarea id="cd" rows={2} value={c.description} onChange={txt("description")} /></div>
      <div className="grid grid-2">
        <div className="field"><label htmlFor="cv">Enlace del video</label><input id="cv" type="text" value={c.videoUrl} onChange={txt("videoUrl")} placeholder="https://vimeo.com/…" /></div>
        <div className="field">
          <label>…o archivo de video</label>
          <FileUpload bucket="content" waveId={waveId} accept="video/*" label={c.videoPath ? "Reemplazar video" : "Subir video"} onUploaded={(u) => setC((x) => ({ ...x, videoPath: u.path, videoUrl: "" }))} />
          {c.videoPath && <small className="muted">{c.videoPath.split("/").pop()}</small>}
        </div>
      </div>
      <div className="field">
        <label>Material descargable</label>
        <ul>
          {c.resources.map((r) => (
            <li key={r.path}>{r.name} <button className="btn ghost small" onClick={() => setC((x) => ({ ...x, resources: x.resources.filter((y) => y.path !== r.path) }))}>Quitar</button></li>
          ))}
        </ul>
        <FileUpload bucket="content" waveId={waveId} multiple label="Agregar material" onUploaded={(u) => setC((x) => ({ ...x, resources: [...x.resources, u] }))} />
      </div>
      <div className="field"><label htmlFor="ck">Tarea (deja vacío si la cápsula no tiene entrega)</label><textarea id="ck" rows={3} value={c.taskPrompt} onChange={txt("taskPrompt")} /></div>
      {c.taskPrompt.trim() && (
        <div className="grid grid-3">
          <label className="check"><input type="checkbox" checked={c.taskRequired} onChange={(e) => setC({ ...c, taskRequired: e.target.checked })} /><span>Obligatoria para avanzar de etapa</span></label>
          <div className="field"><label htmlFor="ca">Máximo de intentos</label><input id="ca" type="text" inputMode="numeric" value={c.maxAttempts ?? ""} placeholder="sin máximo" onChange={(e) => setC({ ...c, maxAttempts: e.target.value ? Number(e.target.value) : null })} /></div>
          <div className="field"><label htmlFor="cf">Plazo (AAAA-MM-DD)</label><input id="cf" type="text" value={c.dueDate} onChange={txt("dueDate")} /></div>
        </div>
      )}
      <label className="check"><input type="checkbox" checked={c.published} onChange={(e) => setC({ ...c, published: e.target.checked })} /><span>Publicada (visible para los participantes)</span></label>
      {msg && <Callout tone={msg.ok ? "ok" : "bad"} title={msg.message} />}
      <div className="row">
        <button className="btn" disabled={pending} onClick={() => start(async () => { const r = await saveCapsule(c); setMsg(r); if (r.ok) { router.refresh(); onDone(); } })}>Guardar cápsula</button>
        <button className="btn ghost" onClick={onDone}>Cancelar</button>
      </div>
    </div>
  );
}
