"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveCapsule, saveStageGuide, type CapsuleInput } from "@/lib/journey/actions";
import { LAYERS, type Layer } from "@/lib/journey/rules";
import type { Capsule, CapsuleLinkKind, StageGuide } from "@/lib/journey/queries";
import { FileUpload } from "@/components/journey/FileUpload";
import { FORMAT_GROUPS, FORMAT_KEYS, SUBMISSION_MAX_MB, effectiveFormats } from "@/lib/journey/formats";
import { isoToChileLocal } from "@/lib/time/chile";
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
          <div>
            <h2 className="h-card" style={{ margin: 0 }}>Módulos (cápsulas)</h2>
            <small className="muted">Se muestran en este orden a los profesionales. Recomendado: hasta 5 por etapa. Puedes editar una cápsula publicada cuando quieras: el cambio se ve al instante.</small>
          </div>
          <button className="btn small" onClick={() => setEditing("new")} disabled={editing === "new"}>Nueva cápsula</button>
        </div>
        <ul className="cap-admin-list">
          {list.map((c) => (
            <li key={c.id} className={editing !== "new" && editing?.id === c.id ? "on" : undefined}>
              <div className="cap-admin-row">
                <span className="cap-admin-n">{c.position}</span>
                <div className="cap-admin-main">
                  <strong>{c.title}</strong>
                  <small className="muted">
                    {[c.duration_min ? `${c.duration_min} min` : null, c.video_url || c.video_path ? "video principal" : null, c.resources.length ? `${c.resources.length} descargable(s)` : null, (c.extras ?? []).length ? `${c.extras.length} complementario(s)` : null, (c.links ?? []).length ? `${c.links.length} enlace(s)` : null, c.task_prompt ? `tarea${c.task_required ? " obligatoria" : ""}` : null].filter(Boolean).join(" · ") || "Sin contenido aún"}
                  </small>
                </div>
                <span className={`badge ${c.published ? "ok" : ""}`}>{c.published ? "Publicada" : "Borrador"}</span>
                <button className="btn ghost small" onClick={() => setEditing(editing !== "new" && editing?.id === c.id ? null : c)}>{editing !== "new" && editing?.id === c.id ? "Cerrar" : "Editar"}</button>
              </div>
              {editing !== "new" && editing?.id === c.id && (
                <CapsuleForm key={c.id} waveId={waveId} layer={layer} capsule={c} nextPosition={list.length + 1} onDone={() => setEditing(null)} />
              )}
            </li>
          ))}
          {list.length === 0 && <li className="muted">Sin cápsulas en esta etapa.</li>}
        </ul>
      </div>
      {editing === "new" && <CapsuleForm key="new" waveId={waveId} layer={layer} capsule={null} nextPosition={list.length + 1} onDone={() => setEditing(null)} />}
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
    extras: capsule?.extras ?? [],
    links: capsule?.links ?? [],
    taskPrompt: capsule?.task_prompt ?? "",
    taskRequired: capsule?.task_required ?? false,
    maxAttempts: capsule?.max_attempts ?? (layer === "AI_MINDSET" ? 2 : null),
    dueAt: capsule?.due_at ? isoToChileLocal(capsule.due_at) : capsule?.due_date ? `${capsule.due_date}T23:59` : "",
    formats: capsule?.submission_formats ?? [],
    published: capsule?.published ?? false,
  });
  const shown = effectiveFormats(c.formats, c.resources);
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const txt = (k: "title" | "description" | "videoUrl" | "taskPrompt" | "dueAt") => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setC({ ...c, [k]: e.target.value });
  return (
    <div className="card" style={{ borderColor: "var(--accent)" }}>
      <h2 className="h-card" style={{ marginTop: 0 }}>{capsule ? "Editar cápsula" : "Nueva cápsula"}</h2>
      <div className="grid grid-3">
        <div className="field"><label htmlFor="ct">Título</label><input id="ct" type="text" value={c.title} onChange={txt("title")} /></div>
        <div className="field"><label htmlFor="cp">Orden</label><input id="cp" type="text" inputMode="numeric" value={c.position} onChange={(e) => setC({ ...c, position: Number(e.target.value) || 1 })} /></div>
        <div className="field"><label htmlFor="cm">Duración (min)</label><input id="cm" type="text" inputMode="numeric" value={c.durationMin ?? ""} onChange={(e) => setC({ ...c, durationMin: e.target.value ? Number(e.target.value) : null })} /></div>
      </div>
      <div className="field"><label htmlFor="cd">Descripción</label><textarea id="cd" rows={2} value={c.description} onChange={txt("description")} /></div>
      <fieldset className="cap-fs">
        <legend>1 · Video principal (opcional)</legend>
        <div className="grid grid-2">
          <div className="field"><label htmlFor="cv">Enlace del video</label><input id="cv" type="url" value={c.videoUrl} onChange={txt("videoUrl")} placeholder="YouTube (no listado), Vimeo, Loom o Google Drive" /></div>
          <div className="field">
            <label>…o archivo de video</label>
            <FileUpload bucket="content" waveId={waveId} accept="video/*" label={c.videoPath ? "Reemplazar video" : "Subir video"} onUploaded={(u) => setC((x) => ({ ...x, videoPath: u.path, videoUrl: "" }))} />
            {c.videoPath && <small className="muted">{c.videoPath.split("/").pop()} <button type="button" className="link-btn" onClick={() => setC((x) => ({ ...x, videoPath: null }))}>Quitar</button></small>}
          </div>
        </div>
      </fieldset>
      <fieldset className="cap-fs">
        <legend>2 · Material descargable (plantilla o guía de la tarea)</legend>
        <FileList items={c.resources} onRemove={(path) => setC((x) => ({ ...x, resources: x.resources.filter((y) => y.path !== path) }))} />
        <FileUpload bucket="content" waveId={waveId} multiple label="Agregar material" onUploaded={(u) => setC((x) => ({ ...x, resources: [...x.resources, u] }))} />
        <small className="muted">Si hay material y tarea, el profesional ve un reto: descarga, completa y sube la misma plantilla.</small>
      </fieldset>
      <fieldset className="cap-fs">
        <legend>3 · Insumos complementarios (PDF y otros archivos para estudiar)</legend>
        <FileList items={c.extras} onRemove={(path) => setC((x) => ({ ...x, extras: x.extras.filter((y) => y.path !== path) }))} />
        <FileUpload bucket="content" waveId={waveId} multiple label="Agregar insumo" onUploaded={(u) => setC((x) => ({ ...x, extras: [...x.extras, u] }))} />
      </fieldset>
      <fieldset className="cap-fs">
        <legend>4 · Videos, podcasts y enlaces complementarios</legend>
        {c.links.map((l, i) => (
          <div key={i} className="cap-link-row">
            <select aria-label="Tipo" value={l.kind} onChange={(e) => setC((x) => ({ ...x, links: x.links.map((y, k) => (k === i ? { ...y, kind: e.target.value as CapsuleLinkKind } : y)) }))}>
              <option value="video">Video</option>
              <option value="podcast">Podcast</option>
              <option value="link">Enlace</option>
            </select>
            <input aria-label="Título" type="text" value={l.title} placeholder="Título (ej: Charla de 10 min sobre prompts)" onChange={(e) => setC((x) => ({ ...x, links: x.links.map((y, k) => (k === i ? { ...y, title: e.target.value } : y)) }))} />
            <input aria-label="Enlace" type="url" value={l.url} placeholder="https://…" onChange={(e) => setC((x) => ({ ...x, links: x.links.map((y, k) => (k === i ? { ...y, url: e.target.value } : y)) }))} />
            <button type="button" className="btn ghost small" onClick={() => setC((x) => ({ ...x, links: x.links.filter((_, k) => k !== i) }))}>Quitar</button>
          </div>
        ))}
        <button type="button" className="btn ghost small" onClick={() => setC((x) => ({ ...x, links: [...x.links, { title: "", url: "", kind: "video" }] }))}>Agregar enlace</button>
        <small className="muted">Los videos se ven en el mismo portal (YouTube, Vimeo, Loom, Drive). Podcasts y enlaces se abren en una pestaña nueva.</small>
      </fieldset>
      <div className="field"><label htmlFor="ck">Tarea (deja vacío si la cápsula no tiene entrega)</label><textarea id="ck" rows={3} value={c.taskPrompt} onChange={txt("taskPrompt")} /></div>
      {c.taskPrompt.trim() && (
        <div className="grid grid-3">
          <label className="check"><input type="checkbox" checked={c.taskRequired} onChange={(e) => setC({ ...c, taskRequired: e.target.checked })} /><span>Obligatoria para avanzar de etapa</span></label>
          <div className="field"><label htmlFor="ca">Máximo de intentos</label><input id="ca" type="text" inputMode="numeric" value={c.maxAttempts ?? ""} placeholder="sin máximo" onChange={(e) => setC({ ...c, maxAttempts: e.target.value ? Number(e.target.value) : null })} /></div>
          <div className="field"><label htmlFor="cf">Plazo de entrega (día, mes, año y hora de Chile)</label><input id="cf" type="datetime-local" value={c.dueAt} onChange={txt("dueAt")} /></div>
        </div>
      )}
      {c.taskPrompt.trim() && (
        <div className="field">
          <label>Formatos aceptados en la entrega (máx. {SUBMISSION_MAX_MB} MB por archivo)</label>
          <div className="row">
            {FORMAT_KEYS.map((k) => (
              <label key={k} className="check" style={{ marginBottom: 0 }}>
                <input type="checkbox" checked={shown.includes(k)} onChange={(e) => setC((x) => ({ ...x, formats: e.target.checked ? [...new Set([...shown, k])] : shown.filter((f) => f !== k) }))} />
                <span>{FORMAT_GROUPS[k].label}</span>
              </label>
            ))}
          </div>
          {!c.formats.length && <small className="muted">Sin marcar: se acepta PDF y el formato de la plantilla.</small>}
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

function FileList({ items, onRemove }: { items: { name: string; path: string }[]; onRemove: (path: string) => void }) {
  if (!items.length) return null;
  return (
    <ul className="cap-files">
      {items.map((r) => (
        <li key={r.path}>{r.name} <button type="button" className="btn ghost small" onClick={() => onRemove(r.path)}>Quitar</button></li>
      ))}
    </ul>
  );
}
