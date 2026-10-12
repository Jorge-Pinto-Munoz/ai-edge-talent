import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOut } from "@/components/admission/SignOut";
import { getViewer } from "@/lib/admission/auth";
import { myJourney } from "@/lib/journey/queries";
import { LAYERS, certificationAttemptNote, layerIndex, layerName } from "@/lib/journey/rules";
import { VideoPlayer } from "@/components/journey/SignedLink";
import { CertificationForm } from "@/components/journey/CertificationForm";
import { Badge, Callout, fmtDate } from "@/components/ui";
import { LabFiles } from "@/components/hub/LabFiles";
import { LAB_CLASSES, LAB_STATUS, labDecisionLabel } from "@/lib/hub/rules";

export const metadata = { title: "Mi journey · AI Edge Talent" };
export const dynamic = "force-dynamic";

const SUB_LABEL: Record<string, [string, "ok" | "warn" | "bad" | "review" | "brand"]> = {
  SUBMITTED: ["Entregada · en revisión", "brand"],
  APPROVED: ["Aprobada", "ok"],
  NOT_APPROVED: ["No aprobada", "warn"],
  HUMAN_REVIEW: ["En revisión humana", "review"],
};

export default async function MiJourney() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/mi-journey");
  const j = await myJourney(viewer.id);
  if (!j) {
    return (
      <div className="narrow stack">
        <Callout title="Aún no tienes un journey activo">
          Tu journey se activa cuando aceptas tu compromiso de participación. Si ya postulaste, revisa el enlace personal que te enviamos por correo.
        </Callout>
      </div>
    );
  }
  const current = j.candidate.journey_layer;
  const curIdx = layerIndex(current);
  const next = LAYERS[curIdx + 1] ?? null;
  const guideOf = (l: string) => j.guides.find((g) => g.layer === l);
  const currentGuide = current ? guideOf(current) : null;
  const layerCapsules = (l: string) => j.capsules.filter((c) => c.layer === l);
  const lastSub = (capId: string) => [...j.submissions].reverse().find((s) => s.capsule_id === capId);
  const failedCerts = j.certifications.filter((c) => c.result === "FAILED" && c.status === "VERIFIED").length;

  return (
    <div className="stack">
      <div className="dark-band" style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: 16, right: 16 }}><SignOut /></div>
        <div className="eyebrow">{j.wave?.name}</div>
        <h1 style={{ color: "#fff", margin: 0 }}>Hola, {j.candidate.full_name.split(" ")[0]}</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>
          {j.candidate.role_title} · {j.candidate.client_name}{j.candidate.delivery_owner ? ` · Delivery: ${j.candidate.delivery_owner}` : ""}
        </p>
      </div>

      <div className="rail">
        {LAYERS.map((l, i) => (
          <div key={l.id} className={`rail-item ${l.id === current ? "current" : ""}`} aria-current={l.id === current ? "step" : undefined}>
            <div className="track">{i < curIdx ? "Completada" : l.id === current ? "Estás aquí" : "Próxima"}</div>
            <strong>{l.name}</strong>
          </div>
        ))}
      </div>

      {!current && (
        <Callout tone="ok" title="Ya eres parte de la Wave">
          Tu primera etapa es AI Mindset. Tu Delivery te confirmará la fecha de inicio. Mientras tanto, revisa el video de cada etapa más abajo.
        </Callout>
      )}

      {current && (
        <section className="card">
          <div className="eyebrow">Dónde estás · {layerName(current)}</div>
          <h2 style={{ marginTop: 0 }}>{currentGuide?.title ?? layerName(current)}</h2>
          {(currentGuide?.video_url || currentGuide?.video_path) && <VideoPlayer url={currentGuide.video_url} path={currentGuide.video_path} title={currentGuide.title} />}
          <div className="grid grid-2" style={{ marginTop: 16 }}>
            <div>
              <div className="eyebrow">Qué ocurre</div>
              <p>{currentGuide?.what_happens ?? LAYERS[curIdx].description}</p>
            </div>
            <div>
              <div className="eyebrow">Qué esperamos de ti</div>
              <p>{currentGuide?.what_we_expect ?? "Tu Delivery te compartirá los hitos de esta etapa."}</p>
            </div>
          </div>
        </section>
      )}

      {current && layerCapsules(current).length > 0 && (
        <section>
          <h2>Cápsulas de {layerName(current)}</h2>
          <div className="grid grid-2">
            {layerCapsules(current).map((c) => {
              const s = lastSub(c.id);
              return (
                <Link key={c.id} href={`/mi-journey/capsula/${c.id}`} className="card signal" style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="spread">
                    <strong>{c.position}. {c.title}</strong>
                    {j.completed.has(c.id) ? <Badge tone="ok">Vista</Badge> : <Badge>Pendiente</Badge>}
                  </div>
                  <p className="muted" style={{ margin: "6px 0" }}>{c.description}</p>
                  <small className="muted">
                    {c.duration_min ? `${c.duration_min} min` : ""}
                    {c.resources.length ? ` · ${c.resources.length} material(es)` : ""}
                    {c.task_prompt ? ` · Tarea${c.task_required ? " obligatoria" : ""}` : ""}
                    {c.due_date ? ` · entrega ${c.due_date}` : ""}
                  </small>
                  {s && <div style={{ marginTop: 8 }}><Badge tone={SUB_LABEL[s.status][1]}>{SUB_LABEL[s.status][0]}</Badge></div>}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {current === "ROLE_ENABLEMENT" && (
        <section className="card">
          <div className="eyebrow">Role Enablement · AI CERTs</div>
          <h2 style={{ marginTop: 0 }}>Tu certificación</h2>
          <p className="muted">Aproximadamente 40 horas, normalmente en 3–4 semanas. Kibernum financia hasta dos intentos de examen. La certificación aprobada es gate de AI Lab.</p>
          {certificationAttemptNote(failedCerts) && <Callout tone="warn" title={certificationAttemptNote(failedCerts)!} />}
          {j.certifications.length > 0 && (
            <ul>
              {j.certifications.map((c) => (
                <li key={c.id}>
                  Intento {c.attempt} · {c.result === "PASSED" ? "Aprobado" : "No aprobado"} · {c.status === "VERIFIED" ? "Verificado" : c.status === "REJECTED" ? "Rechazado" : "En verificación"}
                  {c.review_note && <small className="muted"> · {c.review_note}</small>}
                </li>
              ))}
            </ul>
          )}
          {!j.certifications.some((c) => c.status === "PENDING_REVIEW") && !j.certifications.some((c) => c.result === "PASSED" && c.status === "VERIFIED") && <CertificationForm />}
        </section>
      )}

      {current === "AI_LAB_SHOWCASE" && (
        <section className="card">
          <div className="eyebrow">AI Lab & Showcase · con el Hub AI</div>
          <h2 style={{ marginTop: 0 }}>{j.lab ? j.lab.title : "Tu desafío del Lab"}</h2>
          <div className="grid grid-2">
            {LAB_CLASSES.map((c) => (
              <div key={c.n}>
                <strong>{c.title}</strong>
                <p style={{ margin: "4px 0" }}>{c.brings}</p>
                <small className="muted">{c.does}</small>
              </div>
            ))}
          </div>
          {j.lab ? (
            <div className="stack" style={{ gap: 10, marginTop: 16 }}>
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                <Badge tone="brand">{j.lab.mode === "GROUP" ? `Grupal · ${j.lab.teammates} personas` : "Individual"}</Badge>
                <Badge>{LAB_STATUS.find((s) => s.id === j.lab!.status)?.label}</Badge>
                {j.lab.showcase_date && <Badge>Showcase: {j.lab.showcase_date}</Badge>}
                {j.lab.showcase_decision && <Badge tone="ok">{labDecisionLabel(j.lab.showcase_decision)}</Badge>}
              </div>
              {j.lab.problem && <p style={{ margin: 0 }}><strong>Desafío:</strong> {j.lab.problem}</p>}
              {j.lab.showcase_notes && <p style={{ margin: 0 }}><strong>Feedback del Showcase:</strong> {j.lab.showcase_notes}</p>}
              <div>
                <div className="eyebrow">Tu presentación para el Showcase</div>
                <LabFiles projectId={j.lab.id} files={j.lab.lab_project_files} canUpload myId={viewer.id} />
              </div>
            </div>
          ) : (
            <p className="muted" style={{ marginTop: 16, marginBottom: 0 }}>El Hub AI registrará tu proyecto después de la Clase 1. Ahí podrás subir tu presentación (PPT o PDF) para el Showcase.</p>
          )}
        </section>
      )}

      <section className="grid grid-2">
        <div className="card">
          <div className="eyebrow">Qué pasó</div>
          <ul>
            <li>Compromiso aceptado e inscripción en la Wave.</li>
            {j.events.map((e, i) => (
              <li key={i}>{fmtDate(e.at)} · Comenzaste {layerName(e.to_layer)}</li>
            ))}
          </ul>
        </div>
        <div className="card">
          <div className="eyebrow">Qué viene</div>
          {next ? (
            <>
              <strong>{next.name}</strong>
              <p className="muted">{next.description}</p>
              {next.id === "ROLE_ENABLEMENT" && <p><small>Para avanzar: tareas obligatorias de AI Mindset aprobadas (≥75/100 + hard gates; dos intentos; la revisión humana no consume intento).</small></p>}
              {next.id === "AI_LAB_SHOWCASE" && <p><small>Para avanzar: certificación AI CERT aprobada y verificada.</small></p>}
            </>
          ) : (
            <p className="muted">Cierre del proceso y próximos pasos con tu cliente.</p>
          )}
        </div>
      </section>

      <section>
        <h2>Tu journey, etapa por etapa</h2>
        <p className="muted">Un video breve explica qué pasará en cada etapa.</p>
        <div className="grid grid-2">
          {LAYERS.filter((l) => l.id !== "ASSESSMENT").map((l) => {
            const g = guideOf(l.id);
            return (
              <div key={l.id} className="card">
                <div className="eyebrow">{l.name}</div>
                {g && (g.video_url || g.video_path) ? <VideoPlayer url={g.video_url} path={g.video_path} title={g.title} /> : <p className="muted"><small>Video de la etapa próximamente.</small></p>}
                <p style={{ marginTop: 10 }}>{g?.summary ?? l.description}</p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
