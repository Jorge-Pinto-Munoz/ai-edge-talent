import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/admission/auth";
import { myJourney } from "@/lib/journey/queries";
import { buildJourneyPath } from "@/lib/journey/path";
import type { Layer } from "@/lib/journey/rules";
import { JourneyApp } from "@/components/journey/path/JourneyApp";
import type { JourneyView } from "@/components/journey/path/types";
import { Icon } from "@/components/site/Icon";

export const metadata = { title: "Mi journey · AI Edge Talent" };
export const dynamic = "force-dynamic";

export default async function MiJourney() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/mi-journey");
  const j = await myJourney(viewer.id);

  if (!j) {
    return (
      <section className="state-page" aria-labelledby="mj-empty">
        <span className="state-code" aria-hidden="true"><Icon name="route" size={34} /></span>
        <h1 id="mj-empty">Tu journey aún no comienza</h1>
        <p>Se activa cuando aceptas tu compromiso de participación. Si ya postulaste, revisa el enlace personal que te enviamos por correo: ahí ves tu estado.</p>
        <div className="row" style={{ gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="btn" href="/programa">Conocer el programa</Link>
          <Link className="btn ghost" href="/postular/registro?wave=wave-3">Postular</Link>
        </div>
      </section>
    );
  }

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
    myId: viewer.id,
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

  return <JourneyApp v={view} />;
}
