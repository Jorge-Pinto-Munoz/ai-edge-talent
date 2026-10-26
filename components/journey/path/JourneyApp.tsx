"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { PathNode, PathStage } from "@/lib/journey/path";
import { certificationAttemptNote, type Layer } from "@/lib/journey/rules";
import { LAB_CLASSES, labDecisionLabel, labStatusLabel } from "@/lib/hub/rules";
import { Icon, type IconName } from "@/components/site/Icon";
import { StageIcon } from "@/components/site/StageIcon";
import { SignedLink, VideoPlayer } from "@/components/journey/SignedLink";
import { CertificationForm } from "@/components/journey/CertificationForm";
import { LabFiles } from "@/components/hub/LabFiles";
import { ModuleItem, VideoModal, type PlayTarget } from "./Modules";
import { SignOut } from "@/components/admission/SignOut";
import { fmtDate, fmtYmd } from "@/components/ui";
import { Sheet } from "@/components/site/Sheet";
import { openHelp } from "@/components/site/Help";
import { AiCertSection } from "@/components/site/AiCertSection";
import { ShowcaseGuide } from "@/components/site/ShowcaseGuide";
import { PulseForm } from "@/components/pulse/PulseForm";
import { AiCertProgressView } from "@/components/journey/AiCertProgressView";
import type { JourneyView } from "./types";
import { STAGE_STATUS } from "@/lib/journey/closure";
import { STAGE_RULES } from "@/lib/data/consents";
import { acceptStageRules } from "@/lib/identity/profile-actions";

/** Color de cada etapa (texto oscuro encima: contraste AA en todas). */
const STAGE_COLOR: Record<Layer, { c: string; d: string; icon: IconName }> = {
  ASSESSMENT: { c: "#3dc9d4", d: "#1f8f99", icon: "spark" },
  AI_MINDSET: { c: "#d98ad3", d: "#a2549c", icon: "brain" },
  ROLE_ENABLEMENT: { c: "#b9aad4", d: "#7f6aa8", icon: "badge" },
  AI_LAB_SHOWCASE: { c: "#9fd39a", d: "#5c9a57", icon: "flask" },
  CLOSURE: { c: "#f7c46c", d: "#c08a2c", icon: "flag" },
};
const UNLOCK: Partial<Record<Layer, string>> = {
  ROLE_ENABLEMENT: "Se desbloquea al aprobar tu desafío de AI Mindset y responder su pulso de cierre.",
  AI_LAB_SHOWCASE: "Se desbloquea con tu AI CERT aprobada y verificada, y el pulso de cierre de Role Enablement.",
  CLOSURE: "Llega después de tu Showcase y su pulso de cierre.",
};
/** Zigzag del camino (px), como una ruta que serpentea. */

const nodeIcon = (n: PathNode): IconName => {
  if (n.state === "done") return "check";
  if (n.state === "locked") return "lock";
  if (n.state === "review") return "clock";
  return { milestone: "flag", capsule: "play", cert: "badge", "lab-class": n.labClass === 2 ? "flask" : "users", presentation: "presentation", showcase: "star" }[n.kind] as IconName;
};
const stageVars = (l: Layer) => ({ "--stage": STAGE_COLOR[l].c, "--stage-d": STAGE_COLOR[l].d }) as CSSProperties;

/** Reglas de cada etapa que el profesional aceptó en su compromiso: se recuerdan al estar en ella, no en el sitio público. */
const REMIND: Partial<Record<Layer, string>> = {
  AI_MINDSET: "tienes dos intentos para aprobar tu desafío (75/100 o más). Una revisión humana no consume intento.",
  ROLE_ENABLEMENT: "Kibernum financia hasta dos intentos de examen AI CERT. Prepáralo con tu profesor y tu AI Coach.",
  AI_LAB_SHOWCASE: "no hay un máximo de intentos: ajustas tu solución con el Hub AI hasta que esté lista para mostrar su impacto.",
};

type Tab = "camino" | "materiales" | "entregas";
type Open = { type: "node"; node: PathNode; stage: PathStage } | { type: "guide"; stage: PathStage } | null;

export function JourneyApp({ v }: { v: JourneyView }) {
  const [tab, setTab] = useState<Tab>("camino");
  const [open, setOpen] = useState<Open>(null);
  const [pulseOpen, setPulseOpen] = useState(false);
  const [closingOpen, setClosingOpen] = useState(false);
  // Al enviar el pulso de cierre la etapa avanza y `v.closing` desaparece: conservamos la hoja abierta para ver el agradecimiento.
  const lastClosing = useRef(v.closing);
  if (v.closing) lastClosing.current = v.closing;
  const closing = v.closing ?? (closingOpen ? lastClosing.current : null);
  const [rulesOpen, setRulesOpen] = useState(false);
  useEffect(() => { if (v.showStageRules) setRulesOpen(true); }, [v.showStageRules]);
  const close = useCallback(() => setOpen(null), []);
  // Módulos (cápsulas): se despliegan en el mismo camino; un video se ve en un modal centrado.
  const [mod, setMod] = useState<string | null>(null);
  const [play, setPlay] = useState<PlayTarget | null>(null);
  const closePlay = useCallback(() => setPlay(null), []);
  const focusModule = useCallback((id: string) => {
    setTab("camino");
    setMod(id);
    setTimeout(() => document.getElementById(`m-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }, []);
  // Enlace directo a un módulo: /mi-journey?m=<id>
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("m");
    if (id && v.capsules[id]) focusModule(id);
  }, [focusModule, v.capsules]);
  const stageOf = (l: Layer) => v.path.stages.find((s) => s.layer === l)!;
  const next = v.path.next;
  const reviewing = v.path.stages.flatMap((s) => s.nodes).filter((n) => n.state === "review");

  return (
    <div className="jr">
      {v.preview && (
        <div className="jr-preview" role="note">
          <Icon name="user" size={18} />
          <span>{v.preview.demo ? <><strong>Cuenta de demostración</strong> · datos ficticios. Puedes recorrer todo; los envíos están desactivados.</> : <><strong>Vista de admin</strong> · así ve su journey {v.preview.label}. Puedes recorrer todo; los envíos están desactivados.</>}</span>
        </div>
      )}
      <JourneyHero v={v} />

      <nav className="jr-tabs" aria-label="Secciones de mi journey">
        {([
          ["camino", "Camino", "route"],
          ["materiales", "Materiales", "download"],
          ["entregas", "Entregas", "upload"],
        ] as [Tab, string, IconName][]).map(([k, label, icon]) => (
          <button key={k} type="button" aria-current={tab === k ? "page" : undefined} className={tab === k ? "on" : ""} onClick={() => { setTab(k); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <Icon name={icon} size={20} />
            <span>{label}</span>
          </button>
        ))}
        <button type="button" onClick={openHelp} aria-haspopup="dialog">
          <Icon name="help" size={20} />
          <span>Ayuda</span>
        </button>
      </nav>

      {tab === "camino" && (
        <>
          {v.pulse && (
            <div className="pulse-card">
              <Icon name="chat" size={26} />
              <div>
                <strong>{v.pulse.title} · 2 minutos</strong>
                <p>Cuéntanos cómo te fue. No es una evaluación: con esto ajustamos tu acompañamiento.</p>
              </div>
              <button type="button" className="btn small" onClick={() => setPulseOpen(true)} aria-haspopup="dialog">Responder</button>
            </div>
          )}
          {v.mindsetGate && !v.mindsetGate.open ? (
            <MindsetGate v={v} onGuide={() => setOpen({ type: "guide", stage: stageOf("AI_MINDSET") })} />
          ) : v.closing ? (
            <ClosingCard v={v} onOpen={() => setClosingOpen(true)} />
          ) : (
            <NextStep v={v} reviewing={reviewing.length} onOpen={(n) => (n.kind === "capsule" && n.capsuleId ? focusModule(n.capsuleId) : setOpen({ type: "node", node: n, stage: stageOf(next!.stage) }))} onGuide={() => setOpen({ type: "guide", stage: stageOf(v.path.currentLayer) })} />
          )}
          {!v.path.notStarted && <StageStatusCard v={v} onRules={() => setRulesOpen(true)} />}
          {REMIND[v.path.currentLayer] && !v.path.notStarted && (
            <p className="jr-remind"><Icon name="alert" size={18} /><span><strong>Recuerda:</strong> en esta etapa {REMIND[v.path.currentLayer]}</span></p>
          )}
          <StageChips stages={v.path.stages} />
          <PathView v={v} stages={v.path.stages} onNode={(node, stage) => setOpen({ type: "node", node, stage })} onGuide={(stage) => setOpen({ type: "guide", stage })} mod={mod} onModule={(id) => setMod((x) => (x === id ? null : id))} onPlay={setPlay} />
        </>
      )}
      {tab === "materiales" && <Materials v={v} onGuide={(stage) => setOpen({ type: "guide", stage })} />}
      {tab === "entregas" && <Deliverables v={v} onModule={focusModule} />}

      <VideoModal target={play} onClose={closePlay} />
      <Sheet
        open={open !== null}
        onClose={close}
        accent={open ? STAGE_COLOR[open.stage.layer].c : undefined}
        eyebrow={open ? `Etapa ${open.stage.n} · ${open.stage.name}` : undefined}
        title={open?.type === "node" ? open.node.title : open?.type === "guide" ? v.guides[open.stage.layer]?.title ?? `Qué pasa en ${open.stage.name}` : ""}
      >
        {open?.type === "node" && <NodeContent v={v} node={open.node} stage={open.stage} />}
        {open?.type === "guide" && <GuideContent v={v} stage={open.stage} />}
      </Sheet>
      {closing && (
        <Sheet open={closingOpen} onClose={() => setClosingOpen(false)} accent={STAGE_COLOR[closing.layer].c} eyebrow="Pulso de cierre · obligatorio" title={closing.def.title}>
          <PulseForm def={closing.def} waveId={v.waveId} preview={Boolean(v.preview)} onDone={() => setClosingOpen(false)} />
        </Sheet>
      )}
      <Sheet open={rulesOpen} onClose={() => setRulesOpen(false)} eyebrow="Cómo se cierra cada etapa" title={STAGE_RULES.title}>
        <StageRules accepted={!v.showStageRules} preview={Boolean(v.preview)} onDone={() => setRulesOpen(false)} />
      </Sheet>
      {v.pulse && (
        <Sheet open={pulseOpen} onClose={() => setPulseOpen(false)} eyebrow="Pulso" title={v.pulse.title}>
          <PulseForm def={v.pulse} waveId={v.waveId} preview={Boolean(v.preview)} onDone={() => setPulseOpen(false)} />
        </Sheet>
      )}
    </div>
  );
}

/* ───────── Encabezado: saludo y avance ───────── */
function JourneyHero({ v }: { v: JourneyView }) {
  const r = 30;
  const len = 2 * Math.PI * r;
  const cur = v.path.stages.find((s) => s.layer === v.path.currentLayer)!;
  return (
    <header className="jr-hero" style={stageVars(cur.layer)}>
      <div className="jr-hero-top">
        <span className="jr-wave">{v.waveName}</span>
        {(!v.preview || v.preview.demo) && <SignOut />}
      </div>
      <div className="jr-hero-main">
        <div>
          <h1>Hola, {v.firstName}</h1>
          <p>{v.subtitle}</p>
          <span className="jr-now"><span className="dot" aria-hidden="true" />{v.path.notStarted ? "Próxima" : "Etapa"} {cur.n} · {cur.name}</span>
        </div>
        <div className="jr-ring" data-allow-overlap role="img" aria-label={`Llevas ${v.path.percent}% de tu journey`}>
          <svg viewBox="0 0 72 72" width="84" height="84" aria-hidden="true">
            <circle cx="36" cy="36" r={r} className="track" />
            <circle cx="36" cy="36" r={r} className="fill" strokeDasharray={len} strokeDashoffset={len * (1 - v.path.percent / 100)} />
          </svg>
          <span><strong>{v.path.percent}%</strong><small>avance</small></span>
        </div>
      </div>
    </header>
  );
}

/* ───────── Antes de la apertura de AI First Mindset ───────── */
function MindsetGate({ v, onGuide }: { v: JourneyView; onGuide: () => void }) {
  const at = v.mindsetGate?.opensAt;
  const when = at ? new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(at)) : null;
  return (
    <section className="jr-next" style={stageVars("AI_MINDSET")} aria-labelledby="jr-gate-t">
      <div className="jr-next-ico"><Icon name="clock" size={26} /></div>
      <div className="jr-next-txt">
        <span className="jr-next-eyebrow">Tu próxima etapa</span>
        <h2 id="jr-gate-t">AI First Mindset</h2>
        <p>{when ? `Ya eres parte de AI Edge Talent. Tu primer reto estará disponible el ${when} (hora de Chile).` : "Ya eres parte de AI Edge Talent. Te avisaremos por correo apenas tu primer reto esté disponible."}</p>
      </div>
      <button type="button" className="jr-cta" onClick={onGuide}>Ver de qué se trata <Icon name="arrowRight" size={18} /></button>
    </section>
  );
}

/* ───────── La única cosa: tu siguiente paso ───────── */
function NextStep({ v, reviewing, onOpen, onGuide }: { v: JourneyView; reviewing: number; onOpen: (n: PathNode) => void; onGuide: () => void }) {
  const n = v.path.next;
  if (v.path.notStarted && (!n || n.kind === "milestone")) {
    return (
      <section className="jr-next" style={stageVars("AI_MINDSET")} aria-labelledby="jr-next-t">
        <div className="jr-next-ico"><Icon name="clock" size={26} /></div>
        <div className="jr-next-txt">
          <span className="jr-next-eyebrow">Tu siguiente paso</span>
          <h2 id="jr-next-t">AI Mindset comienza pronto</h2>
          <p>{v.delivery ? `${v.delivery}, tu Delivery,` : "Tu Delivery"} te confirmará la fecha de inicio. Mientras tanto, mira de qué se trata.</p>
        </div>
        <button type="button" className="jr-cta" onClick={onGuide}>Ver la etapa <Icon name="arrowRight" size={18} /></button>
      </section>
    );
  }
  if (!n) {
    return (
      <section className="jr-next calm" aria-labelledby="jr-next-t">
        <div className="jr-next-ico"><Icon name={reviewing ? "clock" : "check"} size={26} /></div>
        <div className="jr-next-txt">
          <span className="jr-next-eyebrow">Tu siguiente paso</span>
          <h2 id="jr-next-t">{reviewing ? "Estamos revisando tu entrega" : "Vas al día"}</h2>
          <p>{reviewing ? "Te avisaremos cuando esté revisada. Mientras, puedes repasar tus materiales." : "No tienes nada pendiente por ahora. Tu Delivery te avisará lo que viene."}</p>
        </div>
      </section>
    );
  }
  const isCapsule = n.kind === "capsule" && n.capsuleId && !v.preview;
  return (
    <section className="jr-next" style={stageVars(n.stage)} aria-labelledby="jr-next-t">
      <div className="jr-next-ico"><Icon name={nodeIcon({ ...n, state: "available" })} size={26} /></div>
      <div className="jr-next-txt">
        <span className="jr-next-eyebrow">Tu siguiente paso</span>
        <h2 id="jr-next-t">{n.title}</h2>
        <p>{n.hint}</p>
      </div>
      {isCapsule ? (
        <button type="button" className="jr-cta" onClick={() => onOpen(n)}>{n.capsuleId === v.mindsetGate?.firstCapsuleId ? "Comenzar primer reto" : n.cta ?? "Abrir"} <Icon name="arrowRight" size={18} /></button>
      ) : (
        <button type="button" className="jr-cta" onClick={() => onOpen(n)}>{n.cta ?? "Abrir"} <Icon name="arrowRight" size={18} /></button>
      )}
    </section>
  );
}

/* ───────── Cierre de etapa: requisitos cumplidos → pulso → siguiente etapa ───────── */
function ClosingCard({ v, onOpen }: { v: JourneyView; onOpen: () => void }) {
  const st = v.path.stages.find((s) => s.layer === v.closing!.layer)!;
  const next = v.path.stages[v.path.stages.indexOf(st) + 1];
  return (
    <section className="jr-next jr-closing" style={stageVars(st.layer)} aria-labelledby="jr-close-t">
      <div className="jr-next-ico"><Icon name="star" size={26} /></div>
      <div className="jr-next-txt">
        <span className="jr-next-eyebrow">{st.name}</span>
        <h2 id="jr-close-t">¡Completaste esta etapa!</h2>
        <p>
          {v.stage.byException ? "Tus requisitos quedaron validados por el equipo. " : "Cumpliste los requisitos académicos. "}
          Para cerrarla{next ? ` y desbloquear ${next.name}` : ""}, cuéntanos tu experiencia: {v.closing!.def.minutes ?? 3} minutos aprox.
        </p>
      </div>
      <button type="button" className="jr-cta" onClick={onOpen} aria-haspopup="dialog">Compartir mi experiencia y continuar <Icon name="arrowRight" size={18} /></button>
    </section>
  );
}

/** Estado de la etapa actual: actividades, evaluación, pulso y estado general, por separado. */
function StageStatusCard({ v, onRules }: { v: JourneyView; onRules: () => void }) {
  const s = v.stage;
  const evalDone = s.requirements.length > 0 && s.requirements.every((r) => r.done);
  const evalReview = s.requirements.some((r) => r.review && !r.done);
  const rows: { k: string; label: string; value: string; state: "done" | "pending" | "review" | "locked" }[] = [];
  if (s.activities) rows.push({ k: "act", label: "Actividades", value: `${s.activities.done} de ${s.activities.total}`, state: s.activities.done >= s.activities.total ? "done" : "pending" });
  if (s.requirements.length) {
    rows.push({
      k: "eval",
      label: "Evaluación",
      value: evalDone ? "Aprobada" : s.byException ? "Validada por el equipo" : evalReview ? "En revisión" : s.requirements.map((r) => r.label).join(" · "),
      state: evalDone || s.byException ? "done" : evalReview ? "review" : "pending",
    });
  }
  if (s.pulse) rows.push({ k: "pulse", label: "Pulso de cierre", value: s.pulse.state === "done" ? "Respondido" : s.pulse.state === "due" ? "Pendiente: ya puedes responderlo" : "Se habilita al cumplir la evaluación", state: s.pulse.state === "done" ? "done" : s.pulse.state === "due" ? "pending" : "locked" });
  const icon = { done: "check", pending: "clock", review: "clock", locked: "lock" } as const;
  return (
    <section className="jr-status" aria-labelledby="jr-st-t">
      <div className="spread">
        <h2 id="jr-st-t">Estado de tu etapa</h2>
        <span className={`ds-status s-${s.tone}`}>{s.label}</span>
      </div>
      <ul>
        {rows.map((r) => (
          <li key={r.k} className={r.state}>
            <Icon name={icon[r.state]} size={16} />
            <span className="lbl">{r.label}</span>
            <span className="val">{r.value}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="linklike" onClick={onRules}>¿Cómo se cierra cada etapa?</button>
    </section>
  );
}

/** Explicación del cierre de etapas: se confirma una vez y queda registrada con su versión. */
function StageRules({ accepted, preview, onDone }: { accepted: boolean; preview: boolean; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="stack">
      {STAGE_RULES.paras.map((p) => <p key={p} style={{ margin: 0 }}>{p}</p>)}
      <ol className="jr-rules-flow" aria-label="Cómo se cierra una etapa">
        <li>Cumples los requisitos de la etapa</li>
        <li>Se habilita tu pulso de cierre</li>
        <li>Respondes: 5 preguntas sobre tu experiencia</li>
        <li>La etapa se cierra y se desbloquea la siguiente</li>
      </ol>
      <p className="muted" style={{ margin: 0 }}><small>{STAGE_RULES.who}</small></p>
      {err && <p className="error" role="alert">{err}</p>}
      {accepted ? (
        <button type="button" className="btn secondary" onClick={onDone}>Cerrar</button>
      ) : (
        <button
          type="button"
          className="btn"
          disabled={busy || preview}
          onClick={async () => {
            setBusy(true);
            const r = await acceptStageRules();
            setBusy(false);
            if (r.ok) onDone();
            else setErr(r.message);
          }}
        >
          {preview ? "Vista previa" : busy ? "Guardando…" : STAGE_RULES.confirm.replace(/\.$/, "")}
        </button>
      )}
    </div>
  );
}

/* ───────── Atajos a cada etapa (para no perderse en el camino) ───────── */
function StageChips({ stages }: { stages: PathStage[] }) {
  return (
    <ul className="jr-chips" aria-label="Ir a una etapa">
      {stages.map((s) => (
        <li key={s.layer}><a href={`#etapa-${s.slug}`} className={`jr-chip ${s.state}`} style={stageVars(s.layer)} aria-current={s.state === "current" ? "step" : undefined}>
          <span className="n">{s.state === "done" ? <Icon name="check" size={14} /> : s.state === "locked" ? <Icon name="lock" size={13} /> : s.n}</span>
          {s.short}
        </a></li>
      ))}
    </ul>
  );
}

/* ───────── El camino ───────── */
function PathView({ v, stages, onNode, onGuide, mod, onModule, onPlay }: { v: JourneyView; stages: PathStage[]; onNode: (n: PathNode, s: PathStage) => void; onGuide: (s: PathStage) => void; mod: string | null; onModule: (id: string) => void; onPlay: (t: PlayTarget) => void }) {
  const currentRef = useRef<HTMLLIElement>(null);
  const [away, setAway] = useState<"up" | "down" | null>(null);

  // Botón "Ir a mi paso" cuando el nodo actual sale de la pantalla.
  useEffect(() => {
    const el = currentRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setAway(e.isIntersecting ? null : e.boundingClientRect.top < 0 ? "up" : "down"), { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="jr-path">
      {stages.map((s) => (
        <section key={s.layer} id={`etapa-${s.slug}`} className={`jr-unit ${s.state}`} style={stageVars(s.layer)} aria-labelledby={`u-${s.slug}`}>
          <div className="jr-unit-banner">
            <div className="jr-unit-ico"><StageIcon slug={s.slug} fallback={STAGE_COLOR[s.layer].icon} size={24} /></div>
            <div className="jr-unit-txt">
              <span>Etapa {s.n} · {s.layer === "ASSESSMENT" ? "Lograda" : STAGE_STATUS[v.stageStatuses[s.layer]].label}</span>
              <h2 id={`u-${s.slug}`}>{s.name}</h2>
              {s.state === "locked" ? <small>{UNLOCK[s.layer] ?? ""}</small> : <small>{s.done} de {s.total} hitos</small>}
            </div>
            <button type="button" className="jr-guide" onClick={() => onGuide(s)} aria-label={`Guía de ${s.name}`}>
              <Icon name="play" size={16} /> <span>Guía</span>
            </button>
          </div>

          <ol className="jr-steps">
            {s.nodes.map((n) => n.kind === "capsule" && n.capsuleId && v.capsules[n.capsuleId] ? (
              <ModuleItem key={n.id} id={n.capsuleId} m={v.capsules[n.capsuleId]} open={mod === n.capsuleId} locked={n.state === "locked"} preview={Boolean(v.preview)} onToggle={() => onModule(n.capsuleId!)} onPlay={onPlay} />
            ) : (
              <li key={n.id} className={`jr-step ${n.state}`} ref={n.state === "current" ? currentRef : undefined}>
                <button type="button" className="jr-step-btn" onClick={() => onNode(n, s)} aria-current={n.state === "current" ? "step" : undefined}>
                  <span className="jr-dot" aria-hidden="true"><Icon name={nodeIcon(n)} size={n.state === "current" ? 24 : 20} /></span>
                  <span className="jr-step-txt">
                    {n.state === "current" && <span className="jr-step-now">{s.done > 0 ? "Sigue aquí" : "Empieza aquí"}</span>}
                    <strong>{n.title}</strong>
                    <small>{n.state === "done" ? "Logrado" : n.state === "review" ? "En revisión" : n.state === "locked" ? "Se desbloquea más adelante" : n.hint}</small>
                  </span>
                  {n.state === "current" ? <span className="jr-step-go">{n.cta ?? "Abrir"} <Icon name="arrowRight" size={16} /></span> : <Icon name={n.state === "locked" ? "lock" : "arrowRight"} size={18} className="jr-step-chev" />}
                </button>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {away && (
        <button type="button" className="jr-back" onClick={() => currentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}>
          <Icon name="arrowRight" size={16} className={away === "up" ? "up" : "down"} /> Ir a mi paso actual
        </button>
      )}
    </div>
  );
}

/* ───────── Contenido de cada hito (en la hoja) ───────── */
function NodeContent({ v, node, stage }: { v: JourneyView; node: PathNode; stage: PathStage }) {
  if (node.state === "locked") {
    return (
      <div className="jr-sheet-stack">
        <div className="jr-locked"><Icon name="lock" size={22} /><p>{UNLOCK[stage.layer] ?? "Se desbloquea más adelante."}</p></div>
        <p className="muted">{node.hint}</p>
      </div>
    );
  }
  const status = <StatusLine node={node} />;

  if (node.kind === "capsule" && node.capsuleId) {
    const c = v.capsules[node.capsuleId];
    return (
      <div className="jr-sheet-stack">
        {status}
        <ul className="jr-meta">
          {c?.durationMin && <li><Icon name="clock" size={16} /> {c.durationMin} min</li>}
          {c?.hasVideo && <li><Icon name="play" size={16} /> Video</li>}
          {c?.resources.length ? <li><Icon name="download" size={16} /> {c.resources.length} material(es)</li> : null}
          {c?.hasTask && <li><Icon name="upload" size={16} /> Tarea {c.required ? "obligatoria" : "opcional"}</li>}
        </ul>
        {c?.description && <p>{c.description}</p>}
        {c?.feedback && <div className="jr-feedback"><strong>Feedback de tu última entrega</strong><p>{c.feedback}</p></div>}
        {c?.resources.length ? <ResourceList items={c.resources} /> : null}
        {v.preview ? (
          <p className="jr-feedback">Aquí el profesional abre la cápsula: video, material y entrega de la tarea.</p>
        ) : (
          <Link className="jr-cta wide" href={`/mi-journey?m=${node.capsuleId}`} data-autofocus>
            {node.state === "done" ? "Volver a ver la cápsula" : node.cta ?? "Abrir la cápsula"} <Icon name="arrowRight" size={18} />
          </Link>
        )}
      </div>
    );
  }

  if (node.kind === "cert") {
    const note = certificationAttemptNote(v.failedCerts);
    const canSubmit = !v.certifications.some((c) => c.status === "PENDING_REVIEW") && !v.certifications.some((c) => c.result === "PASSED" && c.status === "VERIFIED");
    return (
      <div className="jr-sheet-stack">
        {status}
        {note && <div className="jr-feedback warn"><p>{note}</p></div>}
        {v.certifications.length > 0 && (
          <ul className="jr-list">
            {v.certifications.map((c) => (
              <li key={c.id}>
                <span><strong>Intento {c.attempt}</strong> · {c.result === "PASSED" ? "Aprobado" : "No aprobado"}</span>
                <span className={`jr-pill ${c.status === "VERIFIED" ? "ok" : c.status === "REJECTED" ? "bad" : "wait"}`}>{c.status === "VERIFIED" ? "Verificado" : c.status === "REJECTED" ? "Rechazado" : "En verificación"}</span>
              </li>
            ))}
          </ul>
        )}
        <AiCertProgressView p={v.aicert} />
        {canSubmit && !v.preview && (
          <div className="jr-project">
            <span className="jr-k">Registrar tu resultado</span>
            <CertificationForm />
          </div>
        )}
        <AiCertSection audience="profesional" stat={v.certStat} compact id="aic-sheet" />
        <Link className="more-link" href="/programa/role-enablement#certificacion">Ver todo sobre AI CERT <Icon name="arrowRight" size={16} /></Link>
      </div>
    );
  }

  if (node.kind === "lab-class") {
    const c = LAB_CLASSES.find((x) => x.n === node.labClass)!;
    return (
      <div className="jr-sheet-stack">
        {status}
        <div className="jr-two">
          <div><span className="jr-k">Llegas con</span><p>{c.brings}</p></div>
          <div><span className="jr-k">Qué pasa</span><p>{c.does}</p></div>
        </div>
        {v.lab ? <LabSummary lab={v.lab} /> : <p className="muted">El Hub AI registrará tu proyecto después de la Clase 1. Ahí verás aquí tu desafío y podrás subir tu presentación.</p>}
      </div>
    );
  }

  if (node.kind === "presentation") {
    return (
      <div className="jr-sheet-stack">
        {status}
        <p>Sube la presentación con la que mostrarás tu caso en el Showcase (PPT, PDF o Keynote). Puedes reemplazarla cuando quieras antes de presentar.</p>
        {v.lab ? <LabFiles projectId={v.lab.id} files={v.lab.files} canUpload={!v.preview} myId={v.preview ? undefined : v.myId} /> : <p className="muted">Podrás subirla cuando el Hub AI registre tu proyecto.</p>}
        <ShowcaseGuide compact />
      </div>
    );
  }

  if (node.kind === "showcase") {
    return (
      <div className="jr-sheet-stack">
        {status}
        <p>Muestras al cliente un proyecto de IA que resuelve un problema real de su negocio, en 15 a 20 minutos con demo en vivo. Del Showcase sale una decisión sobre cómo sigue tu caso.</p>
        {v.lab ? (
          <ul className="jr-list">
            <li><span>Fecha</span><strong>{v.lab.showcaseDate ? fmtYmd(v.lab.showcaseDate) : "Por definir"}</strong></li>
            <li><span>Resultado</span><strong>{labDecisionLabel(v.lab.decision) ?? "Pendiente"}</strong></li>
          </ul>
        ) : null}
        {v.lab?.showcaseNotes && <div className="jr-feedback"><strong>Feedback del Showcase</strong><p>{v.lab.showcaseNotes}</p></div>}
        <ShowcaseGuide />
      </div>
    );
  }

  return (
    <div className="jr-sheet-stack">
      {status}
      <p>{node.hint}.</p>
      {stage.layer === "CLOSURE" && <p className="muted">Al cerrar, quedas visible como talento habilitado en IA para nuevas oportunidades.</p>}
    </div>
  );
}

function StatusLine({ node }: { node: PathNode }) {
  const map = { done: ["ok", "Logrado"], current: ["now", "Lo que toca ahora"], available: ["", "Disponible"], review: ["wait", "En revisión"], locked: ["", "Bloqueado"] } as const;
  const [tone, label] = map[node.state];
  return <span className={`jr-pill ${tone}`}>{label}</span>;
}

function LabSummary({ lab }: { lab: NonNullable<JourneyView["lab"]> }) {
  return (
    <div className="jr-project">
      <span className="jr-k">Tu proyecto</span>
      <strong>{lab.title}</strong>
      <div className="jr-tags">
        <span>{lab.mode === "GROUP" ? `Grupal · ${lab.teammates} personas` : "Individual"}</span>
        <span>{labStatusLabel(lab.status)}</span>
      </div>
      {lab.problem && <p>{lab.problem}</p>}
    </div>
  );
}

function GuideContent({ v, stage }: { v: JourneyView; stage: PathStage }) {
  const g = v.guides[stage.layer];
  return (
    <div className="jr-sheet-stack">
      {g && (g.videoUrl || g.videoPath) ? <VideoPlayer url={g.videoUrl} path={g.videoPath} title={g.title} /> : <div className="jr-locked"><Icon name="play" size={22} /><p>El video de esta etapa estará disponible pronto.</p></div>}
      {g?.summary && <p>{g.summary}</p>}
      <div className="jr-two">
        <div><span className="jr-k">Qué ocurre</span><p>{g?.whatHappens ?? "Tu Delivery te compartirá los hitos de esta etapa."}</p></div>
        <div><span className="jr-k">Qué esperamos de ti</span><p>{g?.whatWeExpect ?? "Participar, avanzar en tus hitos y avisar a tiempo si algo te bloquea."}</p></div>
      </div>
      <Link className="more-link" href={`/programa/${stage.slug}`}>Ver la etapa completa en el programa <Icon name="arrowRight" size={16} /></Link>
    </div>
  );
}

function ResourceList({ items }: { items: { name: string; path: string; size: number }[] }) {
  return (
    <ul className="jr-files">
      {items.map((r) => (
        <li key={r.path}>
          <Icon name="file" size={20} />
          <SignedLink bucket="content" path={r.path}>{r.name}</SignedLink>
          <small>{r.size > 1048576 ? `${(r.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(r.size / 1024))} KB`}</small>
        </li>
      ))}
    </ul>
  );
}

/* ───────── Materiales: todo lo descargable de las etapas abiertas ───────── */
function Materials({ v, onGuide }: { v: JourneyView; onGuide: (s: PathStage) => void }) {
  const open = v.path.stages.filter((s) => s.state !== "locked" && s.layer !== "ASSESSMENT");
  const groups = open.map((s) => ({
    s,
    caps: s.nodes.filter((n) => n.capsuleId).map((n) => ({ n, c: v.capsules[n.capsuleId!] })).filter((x) => x.c?.resources.length),
  }));
  const total = groups.reduce((a, g) => a + g.caps.reduce((b, x) => b + x.c.resources.length, 0), 0);
  return (
    <section className="jr-panel" aria-labelledby="mat-t">
      <h2 id="mat-t">Materiales</h2>
      <p className="muted">Guías y archivos de tus etapas abiertas. Los de etapas futuras aparecen al desbloquearlas.</p>
      {open.map((s) => (
        <div key={s.layer} className="jr-group" style={stageVars(s.layer)}>
          <div className="jr-group-head">
            <span className="jr-swatch" aria-hidden="true" />
            <h3>Etapa {s.n} · {s.name}</h3>
            <button type="button" className="btn ghost small" onClick={() => onGuide(s)}><Icon name="play" size={14} /> Video guía</button>
          </div>
          {(groups.find((g) => g.s.layer === s.layer)?.caps ?? []).map(({ n, c }) => (
            <div key={n.id} className="jr-mat">
              <strong className="jr-mat-title">{c.title}</strong>
              <ResourceList items={c.resources} />
            </div>
          ))}
        </div>
      ))}
      {total === 0 && <div className="jr-empty"><Icon name="download" size={26} /><p>Aún no hay archivos descargables publicados. Cuando tu Delivery suba material a una cápsula, lo verás aquí.</p></div>}
    </section>
  );
}

/* ───────── Entregas: todo lo que subiste ───────── */
function Deliverables({ v, onModule }: { v: JourneyView; onModule: (id: string) => void }) {
  const empty = !v.submissions.length && !v.certifications.length && !v.lab?.files.length && !v.pendingTasks.length;
  const SUB = { SUBMITTED: ["wait", "En revisión"], HUMAN_REVIEW: ["wait", "Revisión humana"], APPROVED: ["ok", "Aprobada"], NOT_APPROVED: ["bad", "No aprobada"] } as Record<string, [string, string]>;
  return (
    <section className="jr-panel" aria-labelledby="ent-t">
      <h2 id="ent-t">Entregas</h2>
      <p className="muted">Lo que has subido en tu journey y en qué estado está.</p>
      {empty && <div className="jr-empty"><Icon name="upload" size={26} /><p>Todavía no subes nada. Aquí verás tus tareas de AI Mindset, tu certificado AI CERT y tu presentación del Showcase.</p></div>}

      {v.pendingTasks.length > 0 && (
        <div className="jr-group">
          <h3>Por entregar</h3>
          <ul className="jr-deliv">
            {v.pendingTasks.map((t) => (
              <li key={t.capsuleId}>
                <div className="top"><strong>{t.title}</strong><span className="jr-pill now">{t.required ? "Obligatoria" : "Opcional"}</span></div>
                {t.due && <small className="muted">Plazo: {fmtYmd(t.due)}</small>}
                <button type="button" className="more-link" onClick={() => onModule(t.capsuleId)}>Entregar en el módulo <Icon name="arrowRight" size={16} /></button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {v.submissions.length > 0 && (
        <div className="jr-group">
          <h3>Tareas</h3>
          <ul className="jr-deliv">
            {v.submissions.map((s) => (
              <li key={s.id}>
                <div className="top"><button type="button" className="link-btn" onClick={() => onModule(s.capsuleId)}><strong>{s.capsuleTitle}</strong></button><span className={`jr-pill ${SUB[s.status]?.[0] ?? ""}`}>{SUB[s.status]?.[1] ?? s.status}</span></div>
                <small className="muted">Intento {s.attempt} · {fmtDate(s.submittedAt)}</small>
                {s.feedback && <p className="fb">{s.feedback}</p>}
                {s.files.map((f) => <span key={f.path} className="file"><Icon name="file" size={16} /><SignedLink bucket="submissions" path={f.path}>{f.name}</SignedLink></span>)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {v.certifications.length > 0 && (
        <div className="jr-group">
          <h3>Certificación AI CERT</h3>
          <ul className="jr-deliv">
            {v.certifications.map((c) => (
              <li key={c.id}>
                <div className="top"><strong>Intento {c.attempt} · {c.result === "PASSED" ? "Aprobado" : "No aprobado"}</strong><span className={`jr-pill ${c.status === "VERIFIED" ? "ok" : c.status === "REJECTED" ? "bad" : "wait"}`}>{c.status === "VERIFIED" ? "Verificado" : c.status === "REJECTED" ? "Rechazado" : "En verificación"}</span></div>
                <small className="muted">{fmtDate(c.createdAt)}{c.reviewNote ? ` · ${c.reviewNote}` : ""}</small>
                {c.filePath && <span className="file"><Icon name="file" size={16} /><SignedLink bucket="certificates" path={c.filePath}>Ver certificado</SignedLink></span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {v.lab && (
        <div className="jr-group">
          <h3>Presentación del Showcase</h3>
          <LabFiles projectId={v.lab.id} files={v.lab.files} canUpload={!v.preview && v.path.currentLayer === "AI_LAB_SHOWCASE"} myId={v.preview ? undefined : v.myId} />
        </div>
      )}
    </section>
  );
}

