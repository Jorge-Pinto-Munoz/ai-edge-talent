/** AI Lab & Showcase: vocabulario compartido entre el Hub, el portal del profesional y el admin. */
export type LabMode = "INDIVIDUAL" | "GROUP";
export type LabStatus = "IDEA" | "BUILDING" | "READY" | "PRESENTED";
export type LabDecision = "CONTINUA" | "PILOTO" | "AJUSTAR" | "NO_CONTINUA";

export const LAB_STATUS: { id: LabStatus; label: string; hint: string; tone: "review" | "warn" | "ok" | "brand" }[] = [
  { id: "IDEA", label: "Idea", hint: "Llegó a la Clase 1 con el desafío.", tone: "review" },
  { id: "BUILDING", label: "Construyendo", hint: "Entre la Clase 1 y la Clase 2.", tone: "warn" },
  { id: "READY", label: "Listo para Showcase", hint: "Trajo lo construido y tiene su presentación.", tone: "ok" },
  { id: "PRESENTED", label: "Presentado", hint: "Ya pasó por el Showcase.", tone: "brand" },
];

export const LAB_DECISIONS: { id: LabDecision; label: string }[] = [
  { id: "CONTINUA", label: "Continúa: se implementa" },
  { id: "PILOTO", label: "Piloto con el cliente" },
  { id: "AJUSTAR", label: "Ajustar y volver a presentar" },
  { id: "NO_CONTINUA", label: "No continúa" },
];

/** Lo que pasa en cada clase del Lab (texto que ven el Hub y el profesional). */
export const LAB_CLASSES = [
  { n: 1 as const, title: "Clase 1 · El desafío", brings: "Llegas con la idea del desafío: un problema real de tu cliente que quieras resolver con IA.", does: "Aprendes cómo construirlo, validas el problema y defines si lo trabajas solo o en grupo." },
  { n: 2 as const, title: "Clase 2 · Lo construido", brings: "Llegas con lo que construiste: prototipo, flujo o agente funcionando.", does: "Recibes feedback del Hub, ajustas y preparas la presentación para el Showcase." },
];

export const labStatusLabel = (s: string) => LAB_STATUS.find((x) => x.id === s)?.label ?? s;
export const labStatusTone = (s: string) => LAB_STATUS.find((x) => x.id === s)?.tone;
export const labDecisionLabel = (d: string | null) => (d ? LAB_DECISIONS.find((x) => x.id === d)?.label ?? d : null);
