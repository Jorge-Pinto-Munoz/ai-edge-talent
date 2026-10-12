import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/admission/auth";
import { myJourney } from "@/lib/journey/queries";
import { layerName, submissionGate, type SubmissionStatus } from "@/lib/journey/rules";
import { SignedLink, VideoPlayer } from "@/components/journey/SignedLink";
import { CompleteToggle, TaskForm } from "@/components/journey/CapsuleTask";
import { Badge, fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUS: Record<string, [string, "ok" | "warn" | "review" | "brand"]> = {
  SUBMITTED: ["En revisión", "brand"],
  APPROVED: ["Aprobada", "ok"],
  NOT_APPROVED: ["No aprobada", "warn"],
  HUMAN_REVIEW: ["Revisión humana (no consume intento)", "review"],
};

export default async function CapsulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=/mi-journey/capsula/${id}`);
  const j = await myJourney(viewer.id);
  const c = j?.capsules.find((x) => x.id === id);
  if (!j || !c) notFound();
  const subs = j.submissions.filter((s) => s.capsule_id === id);
  const gate = submissionGate(subs.map((s) => s.status as SubmissionStatus), c.max_attempts);
  const usedAttempts = subs.filter((s) => s.status === "NOT_APPROVED").length;

  return (
    <div className="stack narrow">
      <div className="eyebrow"><Link href="/mi-journey">← Mi journey</Link> · {layerName(c.layer)}</div>
      <h1 style={{ margin: 0 }}>{c.position}. {c.title}</h1>
      {c.description && <p className="lead">{c.description}</p>}
      {(c.video_url || c.video_path) && <VideoPlayer url={c.video_url} path={c.video_path} title={c.title} />}
      <CompleteToggle capsuleId={c.id} done={j.completed.has(c.id)} />

      {c.resources.length > 0 && (
        <div className="card">
          <h3>Material descargable</h3>
          <ul>
            {c.resources.map((r) => (
              <li key={r.path}><SignedLink bucket="content" path={r.path}>{r.name}</SignedLink></li>
            ))}
          </ul>
        </div>
      )}

      {c.task_prompt && (
        <div className="card">
          <div className="spread">
            <h3 style={{ margin: 0 }}>Tarea {c.task_required && <small className="muted">· obligatoria</small>}</h3>
            {c.max_attempts && <small className="muted">Intentos usados: {usedAttempts} de {c.max_attempts}</small>}
          </div>
          <p style={{ whiteSpace: "pre-wrap" }}>{c.task_prompt}</p>
          {c.due_date && <p className="muted"><small>Plazo: {c.due_date}. Si te atrasas, avisa a tu Delivery: un atraso activa apoyo y revisión, no una expulsión automática.</small></p>}
          {subs.length > 0 && (
            <>
              <h4>Tus entregas</h4>
              <ul>
                {subs.map((s) => (
                  <li key={s.id} style={{ marginBottom: 8 }}>
                    Intento {s.attempt} · {fmtDate(s.submitted_at)} · <Badge tone={STATUS[s.status][1]}>{STATUS[s.status][0]}</Badge>
                    {s.score !== null && <> · {Number(s.score)}/100</>}
                    {s.feedback && <div className="callout" style={{ marginTop: 6 }}><strong>Feedback</strong>{s.feedback}</div>}
                  </li>
                ))}
              </ul>
            </>
          )}
          <TaskForm capsuleId={c.id} blockedReason={gate.allowed ? null : gate.reason ?? null} />
        </div>
      )}
    </div>
  );
}
