"use client";

import { useState, useTransition } from "react";
import { savePublicStageVideo } from "@/lib/site/stage-video-actions";
import { Callout } from "@/components/ui";

/** Videos de las páginas públicas del programa (/programa/[etapa]): uno por etapa, comunes a todas las Waves. */
export function PublicStageVideos({ stages, videos }: { stages: { slug: string; name: string }[]; videos: Record<string, string> }) {
  const [v, setV] = useState(videos);
  const [msg, setMsg] = useState<{ slug: string; ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const save = (slug: string, url: string) => start(async () => { const r = await savePublicStageVideo(slug, url); setMsg({ slug, ...r }); });
  return (
    <section className="card">
      <h2 className="h-card" style={{ marginTop: 0 }}>Video de la etapa en el sitio público</h2>
      <p className="muted" style={{ marginTop: 0 }}>Se muestra en «Programa → etapa» a cualquier visitante (no solo inscritos). Pega un enlace de YouTube (no listado), Vimeo, Loom o Google Drive compartido «cualquier persona con el enlace». Vale para todas las Waves.</p>
      <div className="stack" style={{ gap: 12 }}>
        {stages.map((s) => (
          <div key={s.slug} className="field" style={{ marginBottom: 0 }}>
            <label htmlFor={`pv-${s.slug}`}>{s.name}</label>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <input id={`pv-${s.slug}`} type="url" value={v[s.slug] ?? ""} placeholder="https://youtu.be/…" onChange={(e) => setV({ ...v, [s.slug]: e.target.value })} style={{ flex: 1 }} />
              <button className="btn small" disabled={pending} onClick={() => save(s.slug, v[s.slug] ?? "")}>Guardar</button>
              {videos[s.slug] && <a className="btn ghost small" href={`/programa/${s.slug}`} target="_blank" rel="noopener noreferrer">Ver</a>}
            </div>
            {msg?.slug === s.slug && <div style={{ marginTop: 8 }}><Callout tone={msg.ok ? "ok" : "bad"} title={msg.message} /></div>}
          </div>
        ))}
      </div>
    </section>
  );
}
