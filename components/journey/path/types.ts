import type { JourneyPath } from "@/lib/journey/path";
import type { Layer } from "@/lib/journey/rules";
import type { LabFile } from "@/components/hub/LabFiles";

/** Todo lo que necesita el portal del profesional, ya serializable (lo arma el servidor). */
export interface JourneyView {
  myId: string;
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
