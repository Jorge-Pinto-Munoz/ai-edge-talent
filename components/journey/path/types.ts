import type { JourneyPath } from "@/lib/journey/path";
import type { Layer } from "@/lib/journey/rules";
import type { LabFile } from "@/components/hub/LabFiles";
import type { CertStat } from "@/lib/aicert/stats";
import type { PulseDef } from "@/lib/pulse/definitions";
import type { Requirement, StageStatus } from "@/lib/journey/closure";

/** Todo lo que necesita el portal del profesional, ya serializable (lo arma el servidor). */
export interface JourneyView {
  myId: string;
  waveId: string;
  /** Pulso pendiente (uno a la vez); se activa solo al pasar de etapa. */
  pulse: PulseDef | null;
  /** Pulso obligatorio que cierra la etapa actual, ya habilitado (requisitos cumplidos). */
  closing: { def: PulseDef; layer: Layer } | null;
  /** Estado de la etapa actual: progreso académico y cierre administrativo por separado. */
  stage: {
    layer: Layer;
    status: StageStatus;
    label: string;
    tone: string;
    requirements: Requirement[];
    byException: boolean;
    activities: { done: number; total: number } | null;
    pulse: { title: string; state: "locked" | "due" | "done" } | null;
  };
  stageStatuses: Record<Layer, StageStatus>;
  /** Mostrar una vez la explicación del cierre de etapas. */
  showStageRules: boolean;
  /** Avance AI CERT por tramos (lo actualiza el líder del programa). */
  aicert: { label: string; course: "INTRO" | "SPECIALIST"; tramo: number; percent: number; overall: number; introCourse: string | null; specialistCourse: string | null; examDate: string | null; updatedAt: string } | null;
  firstName: string;
  subtitle: string;
  waveName: string;
  delivery: string | null;
  path: JourneyPath;
  capsules: Record<string, {
    title: string;
    description: string | null;
    durationMin: number | null;
    resources: { name: string; path: string; size: number }[];
    hasTask: boolean;
    required: boolean;
    hasVideo: boolean;
    feedback: string | null;
  }>;
  guides: Partial<Record<Layer, { title: string; summary: string | null; whatHappens: string | null; whatWeExpect: string | null; videoUrl: string | null; videoPath: string | null }>>;
  certifications: { id: string; attempt: number; result: string; status: string; reviewNote: string | null; filePath: string | null; createdAt: string }[];
  failedCerts: number;
  certStat: CertStat | null;
  /** Vista previa del admin: se ve igual, sin poder enviar nada. */
  preview?: { label: string } | null;
  submissions: { id: string; capsuleTitle: string; attempt: number; status: string; feedback: string | null; files: { name: string; path: string; size: number }[]; submittedAt: string }[];
  lab: {
    id: string;
    title: string;
    problem: string | null;
    mode: "INDIVIDUAL" | "GROUP";
    teammates: number;
    status: string;
    showcaseDate: string | null;
    decision: string | null;
    showcaseNotes: string | null;
    files: LabFile[];
  } | null;
}
