import "server-only";
import { buildJourneyPath } from "@/lib/journey/path";
import { certifiedRate } from "@/lib/aicert/stats";
import type { Layer } from "@/lib/journey/rules";
import type { JourneyView } from "@/components/journey/path/types";
import type { myJourney } from "./queries";
import { overallProgress, progressLabel } from "@/lib/aicert/progress";
import { pulseDef } from "@/lib/pulse/definitions";
import { duePulses } from "@/lib/pulse/rules";
import { CLOSING_PULSE, STAGE_STATUS, stageRequirements, stageStatus, type StageStatus } from "./closure";
import { LAYERS } from "./rules";

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

  // Cierre de etapa: requisitos académicos (o excepción) → pulso de cierre → etapa cerrada.
  const layer = path.currentLayer;
  const reqInput = {
    capsules: j.capsules,
    submissions: j.submissions,
    certifications: j.certifications,
    labStatus: j.lab?.status ?? null,
    byException: j.closures.some((c) => c.layer === layer && c.requirements_by_exception),
  };
  const req = stageRequirements(layer, reqInput);
  const dues = duePulses({ layer: j.candidate.journey_layer, layerSince: j.candidate.journey_layer_since, labStatus: j.lab?.status ?? null, answered: j.answeredPulses, requirementsMet: req.met });
  const closingKey = CLOSING_PULSE[layer];
  const closingDue = closingKey && dues.includes(closingKey) && j.candidate.journey_layer === layer ? closingKey : null;
  const otherDue = dues.find((k) => k !== closingDue) ?? null;
  const closureOf = (l: Layer) => j.closures.find((c) => c.layer === l);
  const started = (l: Layer) =>
    j.capsules.some((c) => c.layer === l && (j.completed.has(c.id) || j.submissions.some((s) => s.capsule_id === c.id))) ||
    (l === "ROLE_ENABLEMENT" && (j.certifications.length > 0 || Boolean(j.aicert))) ||
    (l === "AI_LAB_SHOWCASE" && Boolean(j.lab));
  const statusOf = (l: Layer): StageStatus => {
    const met = closureOf(l)?.requirements_met_at;
    return stageStatus({
      ...reqInput,
      byException: Boolean(closureOf(l)?.requirements_by_exception),
      current: j.candidate.journey_layer,
      layer: l,
      answered: j.answeredPulses,
      started: started(l),
      closedAt: closureOf(l)?.closed_at ?? null,
      pulseWaitDays: met ? (Date.now() - new Date(met).getTime()) / 86_400_000 : null,
    });
  };
  const status = statusOf(layer);
  const stageCaps = j.capsules.filter((c) => c.layer === layer);
  const view: JourneyView = {
    myId: viewerId,
    waveId: j.candidate.wave_id,
    pulse: otherDue ? pulseDef(otherDue) : null,
    closing: closingDue ? { def: pulseDef(closingDue)!, layer } : null,
    stage: {
      layer,
      status,
      label: STAGE_STATUS[status].label,
      tone: STAGE_STATUS[status].tone,
      requirements: req.items,
      byException: req.byException,
      activities: stageCaps.length ? { done: stageCaps.filter((c) => j.completed.has(c.id) || j.submissions.some((s) => s.capsule_id === c.id && s.status === "APPROVED")).length, total: stageCaps.length } : null,
      pulse: closingKey ? { title: pulseDef(closingKey)!.title, state: j.answeredPulses.includes(closingKey) ? "done" : req.met ? "due" : "locked" } : null,
    },
    stageStatuses: Object.fromEntries(LAYERS.map((l) => [l.id, statusOf(l.id)])) as Record<Layer, StageStatus>,
    showStageRules: !preview && !j.stageRulesAccepted && !path.notStarted,
    aicert: j.aicert
      ? {
          label: progressLabel(j.aicert),
          course: j.aicert.course,
          tramo: j.aicert.tramo,
          percent: j.aicert.percent,
          overall: overallProgress(j.aicert),
          introCourse: j.aicert.intro_course,
          specialistCourse: j.aicert.specialist_course,
          examDate: j.aicert.exam_date,
          updatedAt: j.aicert.updated_at,
        }
      : null,
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
