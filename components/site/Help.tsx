"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { HELP, SUPPORT_TOPICS, type HelpAudience } from "@/lib/data/help";
import { submitSupport, type SupportResult } from "@/lib/support/actions";
import { Icon } from "@/components/site/Icon";
import { Sheet } from "@/components/site/Sheet";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const OPEN_EVENT = "aet:help";

/** Abre la ayuda desde cualquier parte (p. ej. la pestaña "Ayuda" de Mi journey). */
export function openHelp() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

function audienceFrom(path: string): HelpAudience {
  if (path.startsWith("/cliente")) return "cliente";
  const m = typeof document !== "undefined" ? document.cookie.match(/(?:^|; )aet_vista=([^;]+)/) : null;
  return m?.[1] === "cliente" ? "cliente" : "profesional";
}

/** FAQ + "escríbenos" en un mismo panel. `inline` lo muestra en la página (/ayuda) en vez de en una hoja. */
export function HelpPanel({ inline = false }: { inline?: boolean }) {
  const path = usePathname();
  const [aud, setAud] = useState<HelpAudience>("profesional");
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  useEffect(() => setAud(audienceFrom(path)), [path]);

  const items = useMemo(() => {
    const t = norm(q.trim());
    // Coincidencias en la pregunta primero, luego en la respuesta.
    const score = (h: (typeof HELP)[number]) => (!t ? 1 : norm(h.q).includes(t) ? 2 : norm(h.a).includes(t) ? 1 : 0);
    return HELP.filter((h) => h.aud.includes(aud))
      .filter((h) => !topic || h.topic === topic)
      .map((h) => ({ h, s: score(h) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.h);
  }, [aud, q, topic]);
  const topics = [...new Set(HELP.filter((h) => h.aud.includes(aud)).map((h) => h.topic))];

  return (
    <div className={`help ${inline ? "inline" : ""}`}>
      <div className="help-aud" role="radiogroup" aria-label="Soy">
        {(["profesional", "cliente"] as HelpAudience[]).map((a) => (
          <button key={a} type="button" role="radio" aria-checked={aud === a} className={aud === a ? "on" : ""} onClick={() => { setAud(a); setTopic(null); }}>
            {a === "profesional" ? "Soy profesional" : "Soy cliente"}
          </button>
        ))}
      </div>
      <label className="help-search">
        <Icon name="help" size={18} />
        <span className="sr-only">Buscar en preguntas frecuentes</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Escribe tu duda: rescate, AI CERT, costo…" data-autofocus />
      </label>
      <div className="help-topics" role="group" aria-label="Filtrar por tema">
        {topics.map((t) => (
          <button key={t} type="button" aria-pressed={topic === t} className={topic === t ? "on" : ""} onClick={() => setTopic(topic === t ? null : t)}>{t}</button>
        ))}
      </div>
      {items.length === 0 ? (
        <p className="help-none">No encontramos una respuesta para eso. Escríbenos abajo y te respondemos al correo.</p>
      ) : (
        <div className="help-list">
          {items.map((h, i) => (
            <details key={h.q} open={i === 0 && !!q}>
              <summary>{h.q}<Icon name="chevronDown" size={18} /></summary>
              <p>{h.a}</p>
            </details>
          ))}
        </div>
      )}
      <SupportForm audience={aud} />
    </div>
  );
}

function SupportForm({ audience }: { audience: HelpAudience }) {
  const path = usePathname();
  const [f, setF] = useState({ name: "", email: "", topic: SUPPORT_TOPICS[0] as string, message: "", website: "" });
  const [res, setRes] = useState<SupportResult | null>(null);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  if (res?.ok) {
    return (
      <div className="help-done" role="status">
        <Icon name="check" size={26} />
        <div><strong>{res.message}</strong><p>Normalmente respondemos dentro del día hábil.</p></div>
      </div>
    );
  }
  return (
    <form className="help-form" onSubmit={(e) => { e.preventDefault(); start(async () => setRes(await submitSupport({ ...f, audience, page: path }))); }}>
      <h2 className="help-form-title">¿No encontraste tu respuesta? Escríbenos</h2>
      <div className="help-row">
        <div className="field"><label htmlFor="hs-n">Nombre</label><input id="hs-n" type="text" required autoComplete="name" value={f.name} onChange={set("name")} /></div>
        <div className="field"><label htmlFor="hs-e">Correo</label><input id="hs-e" type="email" required autoComplete="email" value={f.email} onChange={set("email")} /></div>
      </div>
      <div className="field"><label htmlFor="hs-t">Tema</label>
        <select id="hs-t" value={f.topic} onChange={set("topic")}>{SUPPORT_TOPICS.map((t) => <option key={t}>{t}</option>)}</select>
      </div>
      <div className="field"><label htmlFor="hs-m">Tu pregunta</label><textarea id="hs-m" rows={4} required minLength={10} value={f.message} onChange={set("message")} /></div>
      <div className="sr-only" aria-hidden="true"><input type="text" name="website" tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} /></div>
      {res && !res.ok && <p className="error" role="alert">{res.message}</p>}
      <button className="btn" disabled={pending}>{pending ? "Enviando…" : "Enviar pregunta"}</button>
    </form>
  );
}

/** Botón flotante: un clic abre FAQ y contacto. No aparece en el portal interno (/admin). */
export function HelpButton() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, on);
    return () => window.removeEventListener(OPEN_EVENT, on);
  }, []);
  useEffect(() => setOpen(false), [path]);
  const hidden = path.startsWith("/admin") || path === "/ayuda";
  return (
    <>
      {!hidden && (
        <button type="button" className="help-fab" onClick={() => setOpen(true)} aria-haspopup="dialog">
          <Icon name="help" size={20} /> <span>Ayuda</span>
        </button>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title="¿En qué te ayudamos?" eyebrow="Ayuda AI Edge Talent">
        <HelpPanel />
      </Sheet>
    </>
  );
}
