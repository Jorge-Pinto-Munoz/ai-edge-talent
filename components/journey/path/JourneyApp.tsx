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
import { SignOut } from "@/components/admission/SignOut";
import { fmtDate, fmtYmd } from "@/components/ui";
import { Sheet } from "@/components/site/Sheet";
import { openHelp } from "@/components/site/Help";
import { AiCertSection } from "@/components/site/AiCertSection";
import { ShowcaseGuide } from "@/components/site/ShowcaseGuide";
import type { JourneyView } from "./types";

/** Color de cada etapa (texto oscuro encima: contraste AA en todas). */
const STAGE_COLOR: Record<Layer, { c: string; d: string; icon: IconName }> = {
  ASSESSMENT: { c: "#3dc9d4", d: "#1f8f99", icon: "spark" },
  AI_MINDSET: { c: "#d98ad3", d: "#a2549c", icon: "brain" },
  ROLE_ENABLEMENT: { c: "#b9aad4", d: "#7f6aa8", icon: "badge" },
  AI_LAB_SHOWCASE: { c: "#9fd39a", d: "#5c9a57", icon: "flask" },
  CLOSURE: { c: "#f7c46c", d: "#c08a2c", icon: "flag" },
};
const UNLOCK: Partial<Record<Layer, string>> = {
  ROLE_ENABLEMENT: "Se desbloquea al aprobar las tareas obligatorias de AI Mindset.",
  AI_LAB_SHOWCASE: "Se desbloquea con tu certificación AI CERT aprobada y verificada.",
  CLOSURE: "Llega después de tu Showcase.",
};
/** Zigzag del camino (px), como una ruta que serpentea. */
const ZIG = [0, 52, 78, 52, 0, -52, -78, -52];

const nodeIcon = (n: PathNode): IconName => {
  if (n.state === "done") return "check";
  if (n.state === "locked") return "lock";
  if (n.state === "review") return "clock";
  return { milestone: "flag", capsule: "play", cert: "badge", "lab-class": n.labClass === 2 ? "flask" : "users", presentation: "presentation", showcase: "star" }[n.kind] as IconName;
};
const stageVars = (l: Layer) => ({ "--stage": STAGE_COLOR[l].c, "--stage-d": STAGE_COLOR[l].d }) as CSSProperties;

type Tab = "camino" | "materiales" | "entregas";
type Open = { type: "node"; node: PathNode; stage: PathStage } | { type: "guide"; stage: PathStage } | null;

export function JourneyApp({ v }: { v: JourneyView }) {
  const [tab, setTab] = useState<Tab>("camino");
  const [open, setOpen] = useState<Open>(null);
  const close = useCallback(() => setOpen(null), []);
  const stageOf = (l: Layer) => v.path.stages.find((s) => s.layer === l)!;
  const next = v.path.next;
  const reviewing = v.path.stages.flatMap((s) => s.nodes).filter((n) => n.state === "review");

  return (
    <div className="jr">
      {v.preview && (
        <div className="jr-preview" role="note">
          <Icon name="user" size={18} />
          <span><strong>Vista de admin</strong> · así ve su journey {v.preview.label}. Puedes recorrer todo; los envíos están desactivados.</span>
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
          <NextStep v={v} reviewing={reviewing.length} onOpen={(n) => setOpen({ type: "node", node: n, stage: stageOf(next!.stage) })} onGuide={() => setOpen({ type: "guide", stage: stageOf(v.path.currentLayer) })} />
          <StageChips stages={v.path.stages} />
          <PathView stages={v.path.stages} onNode={(node, stage) => setOpen({ type: "node", node, stage })} onGuide={(stage) => setOpen({ type: "guide", stage })} />
        </>
      )}
      {tab === "materiales" && <Materials v={v} onGuide={(stage) => setOpen({ type: "guide", stage })} />}
      {tab === "entregas" && <Deliverables v={v} />}

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
        {!v.preview && <SignOut />}
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
        <Link className="jr-cta" href={`/mi-journey/capsula/${n.capsuleId}`}>{n.cta ?? "Abrir"} <Icon name="arrowRight" size={18} /></Link>
      ) : (
        <button type="button" className="jr-cta" onClick={() => onOpen(n)}>{n.cta ?? "Abrir"} <Icon name="arrowRight" size={18} /></button>
      )}
    </section>
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
function PathView({ stages, onNode, onGuide }: { stages: PathStage[]; onNode: (n: PathNode, s: PathStage) => void; onGuide: (s: PathStage) => void }) {
  const currentRef = useRef<HTMLDivElement>(null);
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
              <span>Etapa {s.n} · {s.state === "done" ? "Lograda" : s.state === "current" ? "En curso" : "Próxima"}</span>
              <h2 id={`u-${s.slug}`}>{s.name}</h2>
              {s.state === "locked" ? <small>{UNLOCK[s.layer] ?? ""}</small> : <small>{s.done} de {s.total} hitos</small>}
            </div>
            <button type="button" className="jr-guide" onClick={() => onGuide(s)} aria-label={`Guía de ${s.name}`}>
              <Icon name="play" size={16} /> <span>Guía</span>
            </button>
          </div>

          <ol className="jr-nodes">
            {s.nodes.map((n, i) => (
              <li key={n.id} style={{ "--x": `${ZIG[i % ZIG.length]}px` } as CSSProperties}>
                <div className="jr-node-wrap" ref={n.state === "current" ? currentRef : undefined}>
                  {n.state === "current" && <span className="jr-bubble" aria-hidden="true">{s.done > 0 ? "Sigue aquí" : "Empieza aquí"}</span>}
                  <button
                    type="button"
                    className={`jr-node ${n.state}`}
                    onClick={() => onNode(n, s)}
                    aria-label={`${n.title}. ${{ done: "Logrado", current: "Lo que toca ahora", available: "Disponible", review: "En revisión", locked: "Bloqueado" }[n.state]}`}
                  >
                    <Icon name={nodeIcon(n)} size={30} />
                  </button>
                  <span className="jr-node-label">{n.title}</span>
                </div>
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
          <Link className="jr-cta wide" href={`/mi-journey/capsula/${node.capsuleId}`} data-autofocus>
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
              {v.preview ? <strong className="jr-mat-title">{c.title}</strong> : <Link href={`/mi-journey/capsula/${n.capsuleId}`} className="jr-mat-title">{c.title}</Link>}
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
function Deliverables({ v }: { v: JourneyView }) {
  const empty = !v.submissions.length && !v.certifications.length && !v.lab?.files.length;
  const SUB = { SUBMITTED: ["wait", "En revisión"], HUMAN_REVIEW: ["wait", "Revisión humana"], APPROVED: ["ok", "Aprobada"], NOT_APPROVED: ["bad", "No aprobada"] } as Record<string, [string, string]>;
  return (
    <section className="jr-panel" aria-labelledby="ent-t">
      <h2 id="ent-t">Entregas</h2>
      <p className="muted">Lo que has subido en tu journey y en qué estado está.</p>
      {empty && <div className="jr-empty"><Icon name="upload" size={26} /><p>Todavía no subes nada. Aquí verás tus tareas de AI Mindset, tu certificado AI CERT y tu presentación del Showcase.</p></div>}

      {v.submissions.length > 0 && (
        <div className="jr-group">
          <h3>Tareas</h3>
          <ul className="jr-deliv">
            {v.submissions.map((s) => (
              <li key={s.id}>
                <div className="top"><strong>{s.capsuleTitle}</strong><span className={`jr-pill ${SUB[s.status]?.[0] ?? ""}`}>{SUB[s.status]?.[1] ?? s.status}</span></div>
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

