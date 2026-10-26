"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/site/Icon";
import { DownloadButton, VideoPlayer } from "@/components/journey/SignedLink";
import { TaskForm } from "@/components/journey/CapsuleTask";
import { markCapsuleComplete } from "@/lib/journey/actions";
import { dueRelative, fmtDue, formatsLabel } from "@/lib/journey/formats";
import { fmtDate } from "@/components/ui";
import type { ModuleView } from "./types";

export type PlayTarget = { title: string; url: string | null; path: string | null };

const SUB: Record<string, [string, string]> = {
  SUBMITTED: ["wait", "En revisión"],
  HUMAN_REVIEW: ["wait", "Revisión humana"],
  APPROVED: ["ok", "Aprobada"],
  NOT_APPROVED: ["bad", "No aprobada"],
};

/**
 * Un módulo (cápsula) que se despliega en el mismo camino: primero el video principal, luego el reto o el material,
 * los insumos y los recursos complementarios. Los videos se ven en un modal centrado; las descargas no abren pestañas.
 */
export function ModuleItem({ id, m, open, locked, preview, onToggle, onPlay }: { id: string; m: ModuleView; open: boolean; locked: boolean; preview: boolean; onToggle: () => void; onPlay: (t: PlayTarget) => void }) {
  const router = useRouter();
  const marked = useRef(false);
  // Abrir el módulo cuenta como visto (una vez).
  useEffect(() => {
    if (!open || m.seen || preview || marked.current) return;
    marked.current = true;
    void markCapsuleComplete(id, true).then((r) => r.ok && router.refresh());
  }, [open, m.seen, preview, id, router]);

  const due = m.due ? { at: fmtDue(m.due), rel: dueRelative(m.due) } : null;
  const done = m.status.tone === "ok";
  return (
    <li id={`m-${id}`} className={`mod ${open ? "open" : ""} ${locked ? "locked" : ""} ${done ? "done" : ""}`}>
      <button type="button" className="mod-head" aria-expanded={open} aria-controls={`mb-${id}`} disabled={locked} onClick={onToggle}>
        <span className="mod-n" aria-hidden="true">{done ? <Icon name="check" size={20} /> : m.n}</span>
        <span className="mod-txt">
          <span className="mod-k">Módulo {m.n}{m.durationMin ? ` · ~${m.durationMin} min` : ""}</span>
          <strong>{m.title}</strong>
          <span className="mod-tags">
            {m.video && <span><Icon name="play" size={13} /> Video</span>}
            {m.resources.length + m.extras.length > 0 && <span><Icon name="download" size={13} /> {m.resources.length + m.extras.length} archivo(s)</span>}
            {m.links.length > 0 && <span><Icon name="layers" size={13} /> {m.links.length} complementario(s)</span>}
            {m.hasTask && <span><Icon name="upload" size={13} /> {m.challenge ? "Reto" : "Tarea"}{m.required ? " obligatorio" : ""}</span>}
          </span>
        </span>
        <span className={`mod-pill ${locked ? "todo" : m.status.tone}`}>{locked ? "Bloqueado" : m.status.label}</span>
        <Icon name={locked ? "lock" : "chevronDown"} size={20} className="mod-chev" />
      </button>

      {open && !locked && (
        <div id={`mb-${id}`} className="mod-body">
          {m.description && <p className="mod-desc">{m.description}</p>}

          {m.video && (
            <button type="button" className="mod-video" onClick={() => onPlay({ title: m.title, url: m.video!.url, path: m.video!.path })}>
              <span className="mod-play" aria-hidden="true"><Icon name="play" size={26} /></span>
              <span><strong>Ver el video del módulo</strong><small>{m.durationMin ? `~${m.durationMin} min · ` : ""}se abre aquí mismo</small></span>
            </button>
          )}

          {m.hasTask ? (
            <section className="mod-sec mod-task" aria-label={m.challenge ? "Tu reto" : "Tu tarea"}>
              <div className="mod-sec-head">
                <h4>{m.challenge ? "Tu reto" : "Tu tarea"}{m.required && <small> · obligatorio</small>}</h4>
                {m.maxAttempts && <small className="muted">Intentos usados: {m.usedAttempts} de {m.maxAttempts}</small>}
              </div>
              {due && (
                <div className={`mod-due ${due.rel.tone}`}>
                  <Icon name="calendar" size={18} />
                  <span><strong>Entrega hasta el {due.at}</strong> <small>(hora de Chile)</small></span>
                  <em>{due.rel.text}</em>
                </div>
              )}
              <ol className="mod-steps">
                {m.challenge && (
                  <li>
                    <strong>Descarga la plantilla</strong>
                    <div className="dl-list">{m.resources.map((r) => <DownloadButton key={r.path} bucket="content" path={r.path} name={r.name} size={r.size} kind="template" />)}</div>
                  </li>
                )}
                <li>
                  <strong>{m.challenge ? "Complétala" : "Lo que debes hacer"}</strong>
                  <p className="mod-prompt">{m.taskPrompt}</p>
                </li>
                <li>
                  <strong>{m.challenge ? "Sube la misma plantilla completada" : "Entrega tu trabajo"}</strong>
                  <p className="muted mod-note">Formatos aceptados: {formatsLabel(m.formats)}. Al enviarla, el módulo queda entregado y en revisión; lo aprueba el equipo AI Edge Talent y verás el feedback aquí.</p>
                  {preview ? <p className="mod-note">Vista previa: los envíos están desactivados.</p> : <TaskForm capsuleId={id} template={m.challenge} formats={m.formats} blockedReason={m.blocked} />}
                </li>
              </ol>
              {m.submissions.length > 0 && (
                <div className="mod-subs">
                  <h5>Tus entregas</h5>
                  <ul>
                    {m.submissions.map((s) => (
                      <li key={s.id}>
                        <div><strong>Intento {s.attempt}</strong> <small className="muted">· {fmtDate(s.submittedAt)}</small> <span className={`jr-pill ${SUB[s.status]?.[0] ?? ""}`}>{SUB[s.status]?.[1] ?? s.status}</span>{s.score !== null && <small> · {s.score}/100</small>}</div>
                        {s.feedback && <p className="mod-fb"><strong>Feedback:</strong> {s.feedback}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ) : (
            m.resources.length > 0 && (
              <section className="mod-sec" aria-label="Material descargable">
                <h4>Material descargable</h4>
                <div className="dl-list">{m.resources.map((r) => <DownloadButton key={r.path} bucket="content" path={r.path} name={r.name} size={r.size} />)}</div>
              </section>
            )
          )}

          {m.extras.length > 0 && (
            <section className="mod-sec" aria-label="Insumos complementarios">
              <h4>Insumos complementarios <small>para profundizar</small></h4>
              <div className="dl-list">{m.extras.map((r) => <DownloadButton key={r.path} bucket="content" path={r.path} name={r.name} size={r.size} />)}</div>
            </section>
          )}

          {m.links.length > 0 && (
            <section className="mod-sec" aria-label="Recursos complementarios">
              <h4>Recursos complementarios <small>videos, podcasts y enlaces</small></h4>
              <ul className="mod-links">
                {m.links.map((l, i) => (
                  <li key={i}>
                    {l.kind === "video" ? (
                      <button type="button" onClick={() => onPlay({ title: l.title, url: l.url, path: null })}>
                        <span className="lk-ico video"><Icon name="play" size={16} /></span>
                        <span className="lk-t">{l.title}</span>
                        <small>Video · se abre aquí</small>
                      </button>
                    ) : (
                      <a href={l.url} target="_blank" rel="noopener noreferrer">
                        <span className={`lk-ico ${l.kind}`}><Icon name={l.kind === "podcast" ? "chat" : "arrowRight"} size={16} /></span>
                        <span className="lk-t">{l.title}</span>
                        <small>{l.kind === "podcast" ? "Podcast" : "Enlace"} · pestaña nueva ↗</small>
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </li>
  );
}

/** Reproductor en un modal centrado: no se sale del módulo ni se abren ventanas. */
export function VideoModal({ target, onClose }: { target: PlayTarget | null; onClose: () => void }) {
  const closeBtn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!target) return;
    const opener = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; opener?.focus?.(); };
  }, [target, onClose]);
  if (!target) return null;
  return (
    <div className="vmodal" role="dialog" aria-modal="true" aria-label={`Video: ${target.title}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="vmodal-card">
        <div className="vmodal-head">
          <strong>{target.title}</strong>
          <button ref={closeBtn} type="button" onClick={onClose} aria-label="Cerrar video"><Icon name="close" size={20} /></button>
        </div>
        <VideoPlayer url={target.url} path={target.path} title={target.title} />
      </div>
    </div>
  );
}
