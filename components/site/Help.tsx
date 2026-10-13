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
type Step = { kind: "topics" } | { kind: "questions"; topic: Topic } | { kind: "answered"; topic: Topic | null; item: HelpItem | null } | { kind: "confirm"; item: HelpItem; asked: string } | { kind: "thinking" } | { kind: "unanswered"; asked: string };
type Mode = "chat" | "request";
const GREETING = /^(hola|holi|buenas|buen(os|as)? (d[ií]as|tardes|noches)|hey|hi|saludos|gracias|ok|okay|dale)[\s!.¡,]*$/i;

/**
 * Ayuda en dos modos que conviven (cada uno guarda su estado):
 * - Chat de asistencia: temas → preguntas → respuestas preparadas; lo escrito se busca primero en ellas y, si no
 *   calza, responde el asistente (solo con información oficial). Si tampoco, lo dice y ofrece dejar una solicitud.
 * - Dejar una solicitud: formulario al equipo, que se puede abrir directo o con la pregunta del chat ya escrita.
 * `inline`: en /ayuda.
 */
export function HelpPanel({ inline = false }: { inline?: boolean }) {
  const path = usePathname();
  const [aud, setAud] = useState<HelpAudience>("profesional");
  const seq = useRef(0);
  const hello = (a: HelpAudience): Msg => ({ id: seq.current++, from: "bot", text: a === "cliente" ? "Hola. ¿Sobre qué tema tiene dudas?" : "Hola. ¿Sobre qué tema tienes dudas?" });
  const [msgs, setMsgs] = useState<Msg[]>(() => [hello("profesional")]);
  const [step, setStep] = useState<Step>({ kind: "topics" });
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<Mode>("chat");
  const [request, setRequest] = useState<{ message: string; topic?: string; n: number }>({ message: "", n: 0 });
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => { const a = audienceFrom(path); setAud(a); setMsgs([hello(a)]); setStep({ kind: "topics" }); }, [path]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { log.current?.scrollTo({ top: log.current.scrollHeight, behavior: "smooth" }); }, [msgs, step]);

  const items = useMemo(() => HELP.filter((h) => h.aud.includes(aud)), [aud]);
  const topics = TOPIC_ORDER[aud].filter((t) => items.some((h) => h.topic === t));
  const say = (...m: Omit<Msg, "id">[]) => setMsgs((x) => [...x, ...m.map((y) => ({ ...y, id: seq.current++ }))]);
  const you = aud === "cliente" ? "usted" : "tú";

  const pickTopic = (t: Topic) => { say({ from: "me", text: TOPIC_LABEL[t] }, { from: "bot", text: `Estas son las preguntas más comunes sobre ${TOPIC_LABEL[t].toLowerCase()}:` }); setStep({ kind: "questions", topic: t }); };
  const pickQuestion = (h: HelpItem) => { say({ from: "me", text: h.q }, { from: "bot", text: h.a }); setStep({ kind: "answered", topic: h.topic, item: h }); };
  /** Pasa a "Dejar una solicitud" con la pregunta ya escrita; la conversación queda donde estaba. */
  const toRequest = (topic: Topic | null, message: string) => {
    setRequest((r) => ({ message, topic: topic ? SUPPORT_OF[topic] : undefined, n: r.n + 1 }));
    setMode("request");
  };
  const askAi = async (text: string) => {
    setStep({ kind: "thinking" });
    const r = await askHelp(text, aud, path).catch(() => ({ kind: "team" as const, message: "No pude responder ahora." }));
    if (r.kind === "ai") { say({ from: "bot", text: r.answer, ai: true }); setStep({ kind: "answered", topic: null, item: null }); }
    else { say({ from: "bot", text: r.message.replace(/ ?Déjanos tus datos.*$/, "") || "No tengo una respuesta preparada para eso." }, { from: "bot", text: aud === "cliente" ? "Puede dejarnos una solicitud y el equipo le responde por correo, o seguir preguntando aquí." : "Puedes dejarnos una solicitud y el equipo te responde por correo, o seguir preguntando aquí." }); setStep({ kind: "unanswered", asked: text }); }
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    say({ from: "me", text });
    if (GREETING.test(text)) { say({ from: "bot", text: aud === "cliente" ? "¡Hola! Elija un tema o escríbame su pregunta." : "¡Hola! Elige un tema o escríbeme tu pregunta." }); setStep({ kind: "topics" }); return; }
    if (text.length < 8) { say({ from: "bot", text: aud === "cliente" ? "Cuénteme un poco más de su pregunta, o elija un tema." : "Cuéntame un poco más de tu pregunta, o elige un tema." }); setStep({ kind: "topics" }); return; }
    const m = bestMatch(text, items);
    if (m) { say({ from: "bot", text: `Creo que te refieres a: «${m.q}»` }, { from: "bot", text: m.a }); setStep({ kind: "confirm", item: m, asked: text }); }
    else void askAi(text);
  };
  const restart = () => { say({ from: "bot", text: `¿Sobre qué otro tema te ayudo?` }); setStep({ kind: "topics" }); };

  return (
    <div className={`help hc ${inline ? "inline" : ""}`}>
      <div className="hc-modes" role="tablist" aria-label="Cómo te ayudamos">
        {([["chat", "Chat de asistencia", "chat"], ["request", "Dejar una solicitud", "send"]] as const).map(([k, label, icon]) => (
          <button key={k} type="button" role="tab" id={`hc-tab-${k}${inline ? "-i" : ""}`} aria-selected={mode === k} aria-controls={`hc-pane-${k}${inline ? "-i" : ""}`} className={mode === k ? "on" : ""} onClick={() => setMode(k)}>
            <Icon name={icon} size={18} /> {label}
          </button>
        ))}
      </div>

      <div className="hc-pane" role="tabpanel" id={`hc-pane-chat${inline ? "-i" : ""}`} aria-labelledby={`hc-tab-chat${inline ? "-i" : ""}`} hidden={mode !== "chat"}>
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

      {step.kind !== "thinking" && (
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
              <button type="button" className="ghost" onClick={() => toRequest(step.topic, step.item ? `Sobre «${step.item.q}»: ` : "")}>Dejar una solicitud</button>
            </>
          )}
          {step.kind === "confirm" && (
            <>
              <button type="button" onClick={() => { say({ from: "me", text: "Sí, era eso" }, { from: "bot", text: "¡Perfecto! ¿Te ayudo con algo más?" }); setStep({ kind: "topics" }); }}>Sí, era eso</button>
              <button type="button" className="ghost" onClick={() => { say({ from: "me", text: "No, mi pregunta es otra" }); void askAi(step.asked); }}>No, mi pregunta es otra</button>
            </>
          )}
          {step.kind === "unanswered" && (
            <>
              <button type="button" onClick={() => toRequest(null, step.asked)}>Dejar una solicitud con esta pregunta</button>
              <button type="button" className="ghost" onClick={restart}>Ver temas</button>
            </>
          )}
        </div>
      )}

      <form className="hc-input" onSubmit={submit}>
        <label htmlFor={inline ? "hc-q-inline" : "hc-q"} className="sr-only">Escribe tu pregunta</label>
        <input id={inline ? "hc-q-inline" : "hc-q"} type="text" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={aud === "cliente" ? "O escriba su pregunta…" : "O escribe tu pregunta…"} maxLength={600} disabled={step.kind === "thinking"} autoComplete="off" />
        <button className="btn small" disabled={!draft.trim() || step.kind === "thinking"} aria-label="Enviar pregunta"><Icon name="arrowRight" size={18} /></button>
      </form>
      </div>

      <div className="hc-pane" role="tabpanel" id={`hc-pane-request${inline ? "-i" : ""}`} aria-labelledby={`hc-tab-request${inline ? "-i" : ""}`} hidden={mode !== "request"}>
        <SupportForm key={request.n} audience={aud} initialMessage={request.message} initialTopic={request.topic} onCancel={() => setMode("chat")} />
      </div>
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
      <p className="muted" style={{ margin: "0 0 8px" }}>Te respondemos por correo, normalmente dentro del día hábil. Tu conversación del chat sigue disponible.</p>
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
        {onCancel && <button type="button" className="btn ghost" onClick={onCancel}>Volver al chat</button>}
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
