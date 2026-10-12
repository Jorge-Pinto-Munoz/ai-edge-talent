/**
 * Camino del profesional (vista tipo Duolingo): cada etapa es una unidad y sus hitos son nodos.
 * Función pura: recibe lo que ya sabemos del participante y decide el estado de cada nodo
 * y cuál es "tu siguiente paso". Sin acceso a datos: se prueba en tests/journey-path.test.ts.
 */
import type { Layer } from "./rules";

export type NodeKind = "milestone" | "capsule" | "cert" | "lab-class" | "presentation" | "showcase";
/** done: logrado · current: lo que toca ahora · available: se puede abrir · review: esperando revisión · locked: etapa futura. */
export type NodeState = "done" | "current" | "available" | "review" | "locked";
export type StageState = "done" | "current" | "locked";

export interface PathNode {
  id: string;
  kind: NodeKind;
  title: string;
  hint: string; // una línea: qué es o qué falta
  state: NodeState;
  capsuleId?: string;
  labClass?: 1 | 2;
  cta?: string; // texto del botón cuando es el siguiente paso
}
export interface PathStage {
  layer: Layer;
  n: number;
  slug: string;
  name: string;
  short: string;
  state: StageState;
  nodes: PathNode[];
  done: number;
  total: number;
}
export interface JourneyPath {
  stages: PathStage[];
  next: (PathNode & { stage: Layer }) | null;
  percent: number;
  currentLayer: Layer;
  notStarted: boolean;
}

export interface PathInput {
  layer: Layer | null;
  capsules: { id: string; layer: Layer; position: number; title: string; task_prompt: string | null; task_required: boolean; duration_min: number | null }[];
  completed: Set<string>;
  submissions: { capsule_id: string; status: string; attempt: number }[];
  certifications: { result: string; status: string }[];
  lab: { status: string; files: number } | null;
}

export const STAGE_META: { layer: Layer; n: number; slug: string; name: string; short: string }[] = [
  { layer: "ASSESSMENT", n: 1, slug: "assessment", name: "Postulación y Assessment", short: "Assessment" },
  { layer: "AI_MINDSET", n: 2, slug: "mindset", name: "AI First Mindset", short: "Mindset" },
  { layer: "ROLE_ENABLEMENT", n: 3, slug: "role-enablement", name: "Role Enablement", short: "Certificación" },
  { layer: "AI_LAB_SHOWCASE", n: 4, slug: "ai-lab-showcase", name: "AI Lab & Showcase", short: "AI Lab" },
  { layer: "CLOSURE", n: 5, slug: "cierre", name: "Cierre", short: "Cierre" },
];

const lastSub = (subs: PathInput["submissions"], capsuleId: string) =>
  subs.filter((s) => s.capsule_id === capsuleId).sort((a, b) => b.attempt - a.attempt)[0];

function capsuleNode(c: PathInput["capsules"][number], input: PathInput): PathNode {
  const seen = input.completed.has(c.id);
  const sub = c.task_prompt ? lastSub(input.submissions, c.id) : undefined;
  const base = { id: `cap-${c.id}`, kind: "capsule" as const, title: c.title, capsuleId: c.id };
  const minutes = c.duration_min ? `${c.duration_min} min` : "Cápsula";
  if (c.task_prompt && c.task_required) {
    if (sub?.status === "APPROVED") return { ...base, state: "done", hint: "Tarea aprobada" };
    if (sub && (sub.status === "SUBMITTED" || sub.status === "HUMAN_REVIEW")) return { ...base, state: "review", hint: "Tu tarea está en revisión" };
    if (sub?.status === "NOT_APPROVED") return { ...base, state: "available", hint: "Revisa el feedback y vuelve a entregar", cta: "Volver a entregar" };
    return { ...base, state: "available", hint: seen ? "Falta entregar la tarea" : `${minutes} · con tarea obligatoria`, cta: seen ? "Entregar la tarea" : "Ver la cápsula" };
  }
  if (seen || sub?.status === "APPROVED") return { ...base, state: "done", hint: "Vista" };
  return { ...base, state: "available", hint: c.task_prompt ? `${minutes} · tarea opcional` : minutes, cta: "Ver la cápsula" };
}

function stageNodes(layer: Layer, input: PathInput): PathNode[] {
  const caps = input.capsules.filter((c) => c.layer === layer).sort((a, b) => a.position - b.position).map((c) => capsuleNode(c, input));
  switch (layer) {
    case "ASSESSMENT":
      return [
        { id: "as-post", kind: "milestone", title: "Postulación enviada", hint: "Respondiste el Assessment", state: "done" },
        { id: "as-sel", kind: "milestone", title: "Seleccionado/a", hint: "Quedaste en la Wave", state: "done" },
        { id: "as-com", kind: "milestone", title: "Compromiso aceptado", hint: "Te inscribiste formalmente", state: "done" },
      ];
    case "AI_MINDSET":
      return caps.length ? caps : [{ id: "mi-wait", kind: "milestone", title: "Cápsulas de AI Mindset", hint: "Tu Delivery publicará las cápsulas al iniciar la etapa", state: "available" }];
    case "ROLE_ENABLEMENT": {
      const verified = input.certifications.find((c) => c.status === "VERIFIED" && c.result === "PASSED");
      const pending = input.certifications.some((c) => c.status === "PENDING_REVIEW");
      const failed = input.certifications.filter((c) => c.status === "VERIFIED" && c.result === "FAILED").length;
      const cert: PathNode = verified
        ? { id: "re-cert", kind: "cert", title: "Certificación AI CERT", hint: "Aprobada y verificada", state: "done" }
        : pending
          ? { id: "re-cert", kind: "cert", title: "Certificación AI CERT", hint: "Estamos verificando tu certificado", state: "review" }
          : { id: "re-cert", kind: "cert", title: "Certificación AI CERT", hint: failed ? "Tienes otro intento financiado" : "Rinde el examen y sube tu certificado", state: "available", cta: "Registrar mi certificación" };
      return [...caps, cert];
    }
    case "AI_LAB_SHOWCASE": {
      const s = input.lab?.status;
      const built = s === "READY" || s === "PRESENTED";
      return [
        { id: "lab-1", kind: "lab-class", labClass: 1, title: "Clase 1 · El desafío", hint: input.lab ? "Tu desafío quedó registrado" : "Llega con un problema real de tu cliente", state: input.lab ? "done" : "available", cta: "Preparar mi desafío" },
        { id: "lab-2", kind: "lab-class", labClass: 2, title: "Clase 2 · Lo construido", hint: built ? "Presentaste lo construido" : "Lleva tu prototipo funcionando", state: built ? "done" : "available", cta: "Preparar la Clase 2" },
        { id: "lab-ppt", kind: "presentation", title: "Tu presentación", hint: input.lab?.files ? "Presentación subida" : "Sube tu PPT o PDF para el Showcase", state: input.lab?.files ? "done" : "available", cta: "Subir mi presentación" },
        { id: "lab-show", kind: "showcase", title: "Showcase", hint: s === "PRESENTED" ? "Presentaste tu caso" : "Presentas tu caso con evidencia de valor", state: s === "PRESENTED" ? "done" : "available", cta: "Ver mi Showcase" },
      ];
    }
    case "CLOSURE":
      return [{ id: "cl-end", kind: "milestone", title: "Cierre y próximos pasos", hint: "Resultado, evidencia y continuidad con tu cliente", state: "available" }];
  }
}

export function buildJourneyPath(input: PathInput): JourneyPath {
  // Inscrito pero sin etapa asignada: la primera etapa activa es AI Mindset.
  const notStarted = input.layer === null || input.layer === "ASSESSMENT";
  const currentLayer: Layer = notStarted ? "AI_MINDSET" : (input.layer as Layer);
  const cur = STAGE_META.findIndex((s) => s.layer === currentLayer);

  const stages: PathStage[] = STAGE_META.map((meta, i) => {
    const state: StageState = i < cur ? "done" : i === cur ? "current" : "locked";
    let nodes = stageNodes(meta.layer, input);
    if (state === "done") nodes = nodes.map((n) => ({ ...n, state: "done" as const }));
    if (state === "locked") nodes = nodes.map((n) => ({ ...n, state: "locked" as const, cta: undefined }));
    if (state === "current") {
      // Lo que toca ahora: el primer nodo accionable de la etapa.
      const k = nodes.findIndex((n) => n.state === "available");
      if (k >= 0) nodes[k] = { ...nodes[k], state: "current" };
    }
    return { ...meta, state, nodes, done: nodes.filter((n) => n.state === "done").length, total: nodes.length };
  });

  const all = stages.flatMap((s) => s.nodes.map((n) => ({ ...n, stage: s.layer })));
  const next = all.find((n) => n.state === "current") ?? null;
  const percent = Math.round((all.filter((n) => n.state === "done").length / all.length) * 100);
  return { stages, next, percent, currentLayer, notStarted };
}
