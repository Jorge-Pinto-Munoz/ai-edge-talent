import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/admission/auth";
import { myJourney } from "@/lib/journey/queries";
import { layerName, submissionGate, type SubmissionStatus } from "@/lib/journey/rules";
import { SignedLink, VideoPlayer } from "@/components/journey/SignedLink";
import { CompleteToggle, TaskForm } from "@/components/journey/CapsuleTask";
import { Badge, fmtDate, fmtYmd } from "@/components/ui";
import { Icon } from "@/components/site/Icon";

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
  if (!viewer) redirect(`/ingresar?next=/mi-journey/capsula/${id}`);
  const j = await myJourney(viewer.id);
  const c = j?.capsules.find((x) => x.id === id);
  if (!j || !c) notFound();
  const subs = j.submissions.filter((s) => s.capsule_id === id);
  const gate = submissionGate(subs.map((s) => s.status as SubmissionStatus), c.max_attempts);
  const usedAttempts = subs.filter((s) => s.status === "NOT_APPROVED").length;

  return (
    <div className="jr cap-page">
      <Link href="/mi-journey" className="cap-back"><Icon name="arrowLeft" size={18} /> Mi journey</Link>
      <header className="cap-head">
        <span className="jr-k">{layerName(c.layer)} · Cápsula {c.position}</span>
        <h1>{c.title}</h1>
        {c.description && <p>{c.description}</p>}
        <ul className="jr-meta">
          {c.duration_min && <li><Icon name="clock" size={16} /> {c.duration_min} min</li>}
          {c.resources.length > 0 && <li><Icon name="download" size={16} /> {c.resources.length} material(es)</li>}
          {c.task_prompt && <li><Icon name="upload" size={16} /> Tarea {c.task_required ? "obligatoria" : "opcional"}</li>}
        </ul>
      </header>
      {(c.video_url || c.video_path) && <VideoPlayer url={c.video_url} path={c.video_path} title={c.title} />}
      <CompleteToggle capsuleId={c.id} done={j.completed.has(c.id)} />

      {c.resources.length > 0 && (
        <section className="jr-group">
          <h2 className="h-card">Material descargable</h2>
          <ul className="jr-files">
            {c.resources.map((r) => (
              <li key={r.path}><Icon name="file" size={20} /><SignedLink bucket="content" path={r.path}>{r.name}</SignedLink><small>{r.size > 1048576 ? `${(r.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(r.size / 1024))} KB`}</small></li>
            ))}
          </ul>
        </section>
      )}

      {c.task_prompt && (
        <section className="jr-group">
          <div className="spread">
            <h2 className="h-card" style={{ margin: 0 }}>Tarea {c.task_required && <small className="muted">· obligatoria</small>}</h2>
            {c.max_attempts && <small className="muted">Intentos usados: {usedAttempts} de {c.max_attempts}</small>}
          </div>
          <p style={{ whiteSpace: "pre-wrap" }}>{c.task_prompt}</p>
          {c.due_date && <p className="muted"><small>Plazo: {fmtYmd(c.due_date)}. Si te atrasas, avisa a tu Delivery: un atraso activa apoyo y revisión, no una expulsión automática.</small></p>}
          {subs.length > 0 && (
            <>
              <h3>Tus entregas</h3>
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
        </section>
      )}
    </div>
  );
}
