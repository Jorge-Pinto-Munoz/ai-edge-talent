import "server-only";
import { buildJourneyPath } from "@/lib/journey/path";
import { certifiedRate } from "@/lib/aicert/stats";
import type { Layer } from "@/lib/journey/rules";
import type { JourneyView } from "@/components/journey/path/types";
import type { myJourney } from "./queries";

type Journey = NonNullable<Awaited<ReturnType<typeof myJourney>>>;

/** Arma la vista del portal del profesional (la misma para el profesional y para la vista previa del admin). */
export async function buildJourneyView(j: Journey, viewerId: string, preview: JourneyView["preview"] = null): Promise<JourneyView> {
  const path = buildJourneyPath({
    layer: j.candidate.journey_layer,
    capsules: j.capsules,
    completed: j.completed,
    submissions: j.submissions,
    certifications: j.certifications,
    lab: j.lab ? { status: j.lab.status, files: j.lab.lab_project_files.length } : null,
  });

  const lastFeedback = (capsuleId: string) =>
    [...j.submissions].filter((s) => s.capsule_id === capsuleId && s.feedback).sort((a, b) => b.attempt - a.attempt)[0]?.feedback ?? null;

  const view: JourneyView = {
    myId: viewerId,
    preview,
    firstName: j.candidate.full_name.split(" ")[0],
    subtitle: [j.candidate.role_title, j.candidate.client_name].filter(Boolean).join(" · "),
    waveName: j.wave?.name ?? "AI Edge Talent",
    delivery: j.candidate.delivery_owner,
    path,
    capsules: Object.fromEntries(
      j.capsules.map((c) => [
        c.id,
        {
          title: c.title,
          description: c.description,
          durationMin: c.duration_min,
          resources: c.resources ?? [],
          hasTask: Boolean(c.task_prompt),
          required: c.task_required,
          hasVideo: Boolean(c.video_url || c.video_path),
          feedback: lastFeedback(c.id),
        },
      ]),
    ),
    guides: Object.fromEntries(
      j.guides.map((g) => [g.layer as Layer, { title: g.title, summary: g.summary, whatHappens: g.what_happens, whatWeExpect: g.what_we_expect, videoUrl: g.video_url, videoPath: g.video_path }]),
    ),
    certifications: j.certifications.map((c) => ({ id: c.id, attempt: c.attempt, result: c.result, status: c.status, reviewNote: c.review_note, filePath: c.file_path, createdAt: c.created_at })),
    certStat: await certifiedRate(),
    failedCerts: j.certifications.filter((c) => c.result === "FAILED" && c.status === "VERIFIED").length,
    submissions: [...j.submissions]
      .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
      .map((s) => ({
        id: s.id,
        capsuleTitle: j.capsules.find((c) => c.id === s.capsule_id)?.title ?? "Tarea",
        attempt: s.attempt,
        status: s.status,
        feedback: s.feedback,
        files: (s.files ?? []) as { name: string; path: string; size: number }[],
        submittedAt: s.submitted_at,
      })),
    lab: j.lab
      ? {
          id: j.lab.id,
          title: j.lab.title,
          problem: j.lab.problem,
          mode: j.lab.mode,
          teammates: j.lab.teammates,
          status: j.lab.status,
          showcaseDate: j.lab.showcase_date,
          decision: j.lab.showcase_decision,
          showcaseNotes: j.lab.showcase_notes,
          files: j.lab.lab_project_files,
        }
      : null,
  };

  return view;
}
