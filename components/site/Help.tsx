"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { HELP, SUPPORT_TOPICS, type HelpAudience, type HelpItem } from "@/lib/data/help";
import { askHelp } from "@/lib/help/actions";
import { bestMatch } from "@/lib/help/match";
import { submitSupport, type SupportResult } from "@/lib/support/actions";
import { Icon } from "@/components/site/Icon";
import { Sheet } from "@/components/site/Sheet";

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

type Topic = HelpItem["topic"];
const TOPIC_LABEL: Record<Topic, string> = {
  Programa: "El programa y sus etapas",
  Postulación: "Postular",
  Selección: "Selección y resultados",
  Certificación: "Certificación AI CERT",
  "AI Lab": "AI Lab y Showcase",
  Después: "Después del programa",
  Cliente: "Para clientes",
  Plataforma: "Ingresar a la plataforma",
};
const TOPIC_ORDER: Record<HelpAudience, Topic[]> = {
  profesional: ["Postulación", "Selección", "Programa", "Certificación", "AI Lab", "Plataforma", "Después"],
  cliente: ["Cliente", "Programa", "Selección", "Certificación", "AI Lab", "Después", "Plataforma"],
};
const SUPPORT_OF: Partial<Record<Topic, (typeof SUPPORT_TOPICS)[number]>> = {
  Postulación: "Postulación", Selección: "Selección y resultados", Certificación: "Certificación AI CERT", "AI Lab": "AI Lab y Showcase", Plataforma: "Acceso a la plataforma",
};
type Msg = { id: number; from: "bot" | "me"; text: string; ai?: boolean };
type Step = { kind: "topics" } | { kind: "questions"; topic: Topic } | { kind: "answered"; topic: Topic | null; item: HelpItem | null } | { kind: "confirm"; item: HelpItem; asked: string } | { kind: "thinking" } | { kind: "form"; topic: Topic | null; message: string };

/**
 * Ayuda como conversación: el bot ofrece temas, luego preguntas, y responde con textos preparados.
 * Si la persona escribe, busca primero en las respuestas preparadas; si no hay, consulta al asistente (solo
 * con la información oficial) y, si tampoco, deriva al equipo con la pregunta ya escrita. `inline`: en /ayuda.
 */
export function HelpPanel({ inline = false }: { inline?: boolean }) {
  const path = usePathname();
  const [aud, setAud] = useState<HelpAudience>("profesional");
  const seq = useRef(0);
  const hello = (a: HelpAudience): Msg => ({ id: seq.current++, from: "bot", text: a === "cliente" ? "Hola. ¿Sobre qué tema tiene dudas?" : "Hola. ¿Sobre qué tema tienes dudas?" });
  const [msgs, setMsgs] = useState<Msg[]>(() => [hello("profesional")]);
  const [step, setStep] = useState<Step>({ kind: "topics" });
  const [draft, setDraft] = useState("");
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => { const a = audienceFrom(path); setAud(a); setMsgs([hello(a)]); setStep({ kind: "topics" }); }, [path]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" }); }, [msgs, step]);

  const items = useMemo(() => HELP.filter((h) => h.aud.includes(aud)), [aud]);
  const topics = TOPIC_ORDER[aud].filter((t) => items.some((h) => h.topic === t));
  const say = (...m: Omit<Msg, "id">[]) => setMsgs((x) => [...x, ...m.map((y) => ({ ...y, id: seq.current++ }))]);
  const you = aud === "cliente" ? "usted" : "tú";

  const pickTopic = (t: Topic) => { say({ from: "me", text: TOPIC_LABEL[t] }, { from: "bot", text: `Estas son las preguntas más comunes sobre ${TOPIC_LABEL[t].toLowerCase()}:` }); setStep({ kind: "questions", topic: t }); };
  const pickQuestion = (h: HelpItem) => { say({ from: "me", text: h.q }, { from: "bot", text: h.a }); setStep({ kind: "answered", topic: h.topic, item: h }); };
  const toTeam = (topic: Topic | null, message: string, intro?: string) => {
    say({ from: "bot", text: intro ?? (aud === "cliente" ? "Escríbanos y el equipo le responde por correo, normalmente dentro del día hábil." : "Escríbenos y el equipo te responde por correo, normalmente dentro del día hábil.") });
    setStep({ kind: "form", topic, message });
  };
  const askAi = async (text: string) => {
    setStep({ kind: "thinking" });
    const r = await askHelp(text, aud, path).catch(() => ({ kind: "team" as const, message: "No pude responder ahora." }));
    if (r.kind === "ai") { say({ from: "bot", text: r.answer, ai: true }); setStep({ kind: "answered", topic: null, item: null }); }
    else toTeam(null, text, r.message);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    say({ from: "me", text });
    const m = bestMatch(text, items);
    if (m) { say({ from: "bot", text: `Creo que te refieres a: «${m.q}»` }, { from: "bot", text: m.a }); setStep({ kind: "confirm", item: m, asked: text }); }
    else void askAi(text);
  };
  const restart = () => { say({ from: "bot", text: `¿Sobre qué otro tema te ayudo?` }); setStep({ kind: "topics" }); };

  return (
    <div className={`help hc ${inline ? "inline" : ""}`}>
      <div className="help-aud" role="radiogroup" aria-label="Soy">
        {(["profesional", "cliente"] as HelpAudience[]).map((a) => (
          <button key={a} type="button" role="radio" aria-checked={aud === a} className={aud === a ? "on" : ""} onClick={() => { setAud(a); setMsgs([hello(a)]); setStep({ kind: "topics" }); }}>
            {a === "profesional" ? "Soy profesional" : "Soy cliente"}
          </button>
        ))}
      </div>

      <div className="hc-log" ref={log} role="log" aria-live="polite" aria-label="Conversación de ayuda">
        {msgs.map((m) => (
          <div key={m.id} className={`hc-msg ${m.from}`}>
            <p>{m.text}</p>
            {m.ai && <small>Respuesta generada con IA a partir de la información oficial del programa.</small>}
          </div>
        ))}
        {step.kind === "thinking" && <div className="hc-msg bot hc-typing" aria-label="Escribiendo"><span /><span /><span /></div>}
      </div>

      {step.kind !== "form" && step.kind !== "thinking" && (
        <div className="hc-opts" role="group" aria-label="Opciones">
          {step.kind === "topics" && topics.map((t) => <button key={t} type="button" onClick={() => pickTopic(t)}>{TOPIC_LABEL[t]}</button>)}
          {step.kind === "questions" && (
            <>
              {items.filter((h) => h.topic === step.topic).map((h) => <button key={h.q} type="button" onClick={() => pickQuestion(h)}>{h.q}</button>)}
              <button type="button" className="ghost" onClick={restart}>Ver otros temas</button>
            </>
          )}
          {step.kind === "answered" && (
            <>
              <button type="button" onClick={() => { say({ from: "me", text: "Sí, me sirvió" }, { from: "bot", text: `¡Qué bueno! Si ${you === "usted" ? "necesita" : "necesitas"} algo más, aquí estoy.` }); setStep({ kind: "topics" }); }}>Sí, me sirvió</button>
              {step.topic && <button type="button" onClick={() => pickTopic(step.topic!)}>Otra pregunta de este tema</button>}
              <button type="button" className="ghost" onClick={restart}>Otro tema</button>
              <button type="button" className="ghost" onClick={() => { say({ from: "me", text: "Prefiero hablar con el equipo" }); toTeam(step.topic, step.item ? `Sobre «${step.item.q}»: ` : ""); }}>Hablar con el equipo</button>
            </>
          )}
          {step.kind === "confirm" && (
            <>
              <button type="button" onClick={() => { say({ from: "me", text: "Sí, era eso" }, { from: "bot", text: "¡Perfecto! ¿Te ayudo con algo más?" }); setStep({ kind: "topics" }); }}>Sí, era eso</button>
              <button type="button" className="ghost" onClick={() => { say({ from: "me", text: "No, mi pregunta es otra" }); void askAi(step.asked); }}>No, mi pregunta es otra</button>
            </>
          )}
        </div>
      )}

      {step.kind === "form" ? (
        <SupportForm audience={aud} initialMessage={step.message} initialTopic={step.topic ? SUPPORT_OF[step.topic] : undefined} onCancel={restart} />
      ) : (
        <form className="hc-input" onSubmit={submit}>
          <label htmlFor={inline ? "hc-q-inline" : "hc-q"} className="sr-only">Escribe tu pregunta</label>
          <input id={inline ? "hc-q-inline" : "hc-q"} type="text" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="O escribe tu pregunta…" maxLength={600} disabled={step.kind === "thinking"} autoComplete="off" />
          <button className="btn small" disabled={!draft.trim() || step.kind === "thinking"} aria-label="Enviar pregunta"><Icon name="arrowRight" size={18} /></button>
        </form>
      )}
    </div>
  );
}

function SupportForm({ audience, initialMessage = "", initialTopic, onCancel }: { audience: HelpAudience; initialMessage?: string; initialTopic?: string; onCancel?: () => void }) {
  const path = usePathname();
  const [f, setF] = useState({ name: "", email: "", topic: (initialTopic ?? SUPPORT_TOPICS[0]) as string, message: initialMessage, website: "" });
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
      <h2 className="help-form-title">Escríbele al equipo</h2>
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
      <div className="row">
        <button className="btn" disabled={pending}>{pending ? "Enviando…" : "Enviar pregunta"}</button>
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Volver a los temas</button>}
      </div>
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
  const hidden = path.startsWith("/admin") || path === "/ayuda" || path === "/equipo" || path.startsWith("/equipo/") || path === "/responsabilidades";
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
