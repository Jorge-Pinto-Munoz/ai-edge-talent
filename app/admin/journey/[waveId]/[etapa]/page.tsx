import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseService, supabaseUser } from "@/lib/supabase/server";
import { stageBySlug } from "@/lib/journey/stages";
import { journeyOverview, STAGE_STATE_LABEL } from "@/lib/journey/overview";
import { JOURNEY_STATUSES } from "@/lib/admission/view-as";
import { waveReport } from "@/lib/pulse/report";
import { ADMISSION_LABEL, type AdmissionStatus } from "@/lib/domain/types";
import { ParticipantsBoard } from "@/components/journey-admin/ParticipantsBoard";
import { ReviewQueue } from "@/components/journey-admin/ReviewQueue";
import { ContentEditor } from "@/components/journey-admin/ContentEditor";
import { PublicStageVideos } from "@/components/journey-admin/PublicStageVideos";
import { publicStageVideos } from "@/lib/site/stage-videos";
import { PUBLIC_STAGES } from "@/lib/data/site";
import type { Capsule, StageGuide } from "@/lib/journey/queries";
import type { Layer } from "@/lib/journey/rules";
import { SubmissionsPanel } from "@/components/journey-admin/SubmissionsPanel";
import { GroupProgress } from "@/components/journey-admin/GroupProgress";
import { stageCoverage } from "@/lib/journey/coverage";
import { EvaluateView } from "@/components/journey-admin/EvaluateView";
import { MoveStage } from "@/components/journey-admin/MoveStage";
import { AiBar } from "@/components/journey-admin/ReviewQueue";
import { deliveryState } from "@/lib/journey/delivery-status";
import { prettyName } from "@/lib/text/org";
import { AiCertBoard } from "@/components/journey-admin/AiCertBoard";
import { ReSessions } from "@/components/teacher/ReSessions";
import { PulseStatus } from "@/components/journey-admin/PulseStatus";
import { LabWorkspace } from "@/components/hub/LabWorkspace";
import { EvaluationGuide } from "@/components/admin/EvaluationGuide";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { Icon } from "@/components/site/Icon";
import { Badge } from "@/components/ui";
import { StageOpeningPanel } from "@/components/journey-admin/StageOpeningPanel";
import { mindsetOpening, notifyStageOpen } from "@/lib/journey/opening";

export const dynamic = "force-dynamic";
// Margen para las revisiones con IA que corren en segundo plano (after) tras una entrega o al pedirlas.
export const maxDuration = 300;

export async function generateMetadata({ params }: { params: Promise<{ etapa: string }> }) {
  return { title: `${stageBySlug((await params).etapa)?.name ?? "Etapa"} · Journey · Portal AET` };
}

const stageNameOf = (l: string) => ({ AI_MINDSET: "AI First Mindset", ROLE_ENABLEMENT: "Role Enablement", AI_LAB_SHOWCASE: "AI Lab", SHOWCASE: "Showcase", CLOSURE: "Cierre" } as Record<string, string>)[l] ?? l;
const TO_DECIDE = ["ASSESSMENT_EVALUATED", "HUMAN_REVIEW", "RESCUE_REQUIRED"];

/** Detalle de una etapa (nivel 3): sus participantes, actividades, evaluaciones, entregables y acciones. */
export default async function StageDetail({ params, searchParams }: { params: Promise<{ waveId: string; etapa: string }>; searchParams: Promise<{ tab?: string; clase?: string; sub?: string; p?: string }> }) {
  const { waveId, etapa } = await params;
  const { tab: rawTab, sub: subParam, p: personParam } = await searchParams;
  const stage = stageBySlug(etapa);
  if (!stage) notFound();
  const viewer = await requireStaffPage(`/admin/journey/${waveId}/${etapa}`);
  const isAdmin = viewer.role === "admin";
  const tabs = stage.tabs.filter((t) => isAdmin || !t.adminOnly);
  const tab = tabs.find((t) => t.key === rawTab) ?? tabs[0];
  const detailOpen = tab.key === "entregas" && Boolean(subParam || personParam);
  if (rawTab && rawTab !== tab.key) redirect(`/admin/journey/${waveId}/${etapa}`);

  const db = await supabaseUser();
  const { data: wave } = await db.from("waves").select("id, name").eq("id", waveId).maybeSingle();
  if (!wave) notFound();
  const waveLabel = wave.name.replace("AI Edge Talent · ", "");
  const { stages } = await journeyOverview(waveId);
  const sum = stages.find((s) => s.stage.slug === stage.slug)!;
  const base = `/admin/journey/${waveId}/${etapa}`;
  const at = stages.findIndex((s) => s.stage.slug === stage.slug);
  const prev = stages[at - 1]?.stage;
  const next = stages[at + 1]?.stage;

  // Participantes de la Wave inscritos; los de esta etapa (inscrito sin capa = empieza en AI First Mindset).
  const { data: enrolled } = stage.layer === "ASSESSMENT" ? { data: [] } : await db
    .from("candidates").select("id, full_name, corporate_email, delivery_owner, user_id, client_name, role_title, specialty, status, journey_layer, journey_layer_since")
    .eq("wave_id", waveId).in("status", [...JOURNEY_STATUSES]).order("full_name");
  const here = (enrolled ?? []).filter((p) => (p.journey_layer ?? "AI_MINDSET") === stage.layer);
  const ids = (enrolled ?? []).map((p) => p.id);
  const nameOf = (id: string) => enrolled?.find((p) => p.id === id)?.full_name ?? "—";

  return (
    <div className="adm">
      <Breadcrumbs items={[{ label: waveLabel, href: `/admin?wave=${waveId}` }, { label: "Journey", href: `/admin/journey/${waveId}` }, { label: stage.name, href: base }, { label: tab.label }]} />
      <header className="adm-head">
        <div className="jn-detail-head">
          <span className="jn-ico lg"><Icon name={stage.icon} size={26} /></span>
          <div>
            <div className="eyebrow">Etapa {stage.n} de {stages.length}</div>
            <h1>{stage.name}</h1>
            <p className="muted" style={{ maxWidth: 680 }}>{stage.purpose}</p>
          </div>
        </div>
        <span className={`jn-state st-${sum.state}`}>{STAGE_STATE_LABEL[sum.state]}</span>
      </header>

      <section className="adm-kpis">
        <div className="adm-kpi"><span className="ico"><Icon name="users" size={20} /></span><strong>{sum.inStage}</strong><small>{stage.layer === "ASSESSMENT" ? "En admisión" : "En la etapa"}</small></div>
        <div className="adm-kpi"><span className="ico"><Icon name="check" size={20} /></span><strong>{sum.completed ?? "—"}</strong><small>{stage.layer === "ASSESSMENT" ? "Con decisión" : "Completaron"}</small></div>
        <div className="adm-kpi"><span className="ico"><Icon name="alert" size={20} /></span><strong>{sum.actions.reduce((n, a) => n + a.count, 0)}</strong><small>Requieren intervención</small></div>
        <div className="adm-kpi"><span className="ico"><Icon name="target" size={20} /></span><strong>{sum.pct === null ? "—" : `${sum.pct}%`}</strong><small>Avance de la Wave</small></div>
      </section>

      {/* Con una persona abierta, el detalle va arriba: sin el avance del grupo ni la apertura. */}
      {stage.layer !== "ASSESSMENT" && !detailOpen && (await (async () => {
        // Grupo completo: todos los que pasaron el Assessment (seleccionados en adelante) en esta Wave.
        const { data: group } = await db.from("candidates").select("id, full_name, client_name, status, journey_layer, user_id").eq("wave_id", waveId).in("status", ["SELECTED", "CONDITIONS_PENDING", ...JOURNEY_STATUSES]).order("full_name");
        const gids = (group ?? []).map((g) => g.id);
        const uids = (group ?? []).map((g) => g.user_id).filter(Boolean) as string[];
        const svc = supabaseService();
        const [{ data: profs }, { data: gsubs }, { data: gcerts }, { data: glabs }, { data: gtasks }] = await Promise.all([
          uids.length ? svc.from("profiles").select("id, status").in("id", uids) : Promise.resolve({ data: [] as { id: string; status: string }[] }),
          stage.layer === "AI_MINDSET" && gids.length ? svc.from("submissions").select("candidate_id, capsule_id, attempt, status, capsules!inner(layer)").in("candidate_id", gids).eq("capsules.layer", "AI_MINDSET") : Promise.resolve({ data: [] as { candidate_id: string; capsule_id: string; attempt: number; status: string }[] }),
          stage.layer === "ROLE_ENABLEMENT" && gids.length ? svc.from("certifications").select("candidate_id, result, status, created_at").in("candidate_id", gids).order("created_at", { ascending: false }) : Promise.resolve({ data: [] as { candidate_id: string; result: string; status: string }[] }),
          (stage.layer === "AI_LAB_SHOWCASE" || stage.layer === "SHOWCASE") && gids.length ? svc.from("lab_project_members").select("candidate_id, lab_projects(status, problem, solution, lab_project_files(kind))").in("candidate_id", gids) : Promise.resolve({ data: [] as { candidate_id: string; lab_projects: unknown }[] }),
          stage.layer === "AI_MINDSET" ? svc.from("capsules").select("id").eq("wave_id", waveId).eq("layer", "AI_MINDSET").eq("published", true).eq("task_required", true) : Promise.resolve({ data: [] as { id: string }[] }),
        ]);
        const active = new Set((profs ?? []).filter((x) => x.status === "ACTIVE").map((x) => x.id));
        const LAB: Record<string, string> = { IDEA: "Proyecto: idea", BUILDING: "Proyecto en construcción", READY: "Proyecto listo para el Showcase" };
        const signal = (p: { id: string }): { light: "green" | "yellow" | "red"; reason: string } | null => {
          if (stage.layer === "AI_MINDSET") {
            const st = deliveryState((gsubs ?? []).filter((x) => x.candidate_id === p.id), (gtasks ?? []).map((t) => t.id));
            return st === "approved" ? { light: "green", reason: "Reto aprobado" } : st === "pending" ? { light: "yellow", reason: "Entregado · por revisar" } : st === "not_approved" ? { light: "yellow", reason: "Corrigiendo para su reintento" } : { light: "red", reason: "No ha entregado su reto" };
          }
          if (stage.layer === "ROLE_ENABLEMENT") {
            const c = (gcerts ?? []).find((x) => x.candidate_id === p.id);
            if (!c) return { light: "red", reason: "Sin certificación registrada" };
            if (c.status === "VERIFIED" && c.result === "PASSED") return { light: "green", reason: "Certificación verificada" };
            return { light: "yellow", reason: c.status === "PENDING_REVIEW" ? "Certificado en verificación" : "Reintentando la certificación" };
          }
          const proj = (glabs ?? []).find((x) => x.candidate_id === p.id)?.lab_projects as { status: string; problem: string | null; solution: string | null; lab_project_files: { kind: string }[] | null } | null;
          if (stage.layer === "AI_LAB_SHOWCASE") {
            if (!proj) return { light: "red", reason: "Sin proyecto en el AI Lab" };
            if (proj.status === "READY" || proj.status === "PRESENTED") return { light: "green", reason: "Proyecto listo para el Showcase" };
            return { light: "yellow", reason: proj.problem?.trim() && proj.solution?.trim() ? LAB[proj.status] ?? "Proyecto en curso" : "Falta describir el proyecto" };
          }
          if (stage.layer === "SHOWCASE") {
            if (proj?.status === "PRESENTED") return { light: "green", reason: "Presentó en el Showcase" };
            return (proj?.lab_project_files ?? []).some((f) => f.kind === "FINAL") ? { light: "yellow", reason: "Presentación final subida · por presentar" } : { light: "red", reason: "Falta subir la presentación final" };
          }
          return { light: "green", reason: "En cierre" };
        };
        const cov = stageCoverage(
          (group ?? []).map((g) => ({ id: g.id, name: g.full_name, client: g.client_name ? prettyName(g.client_name) : null, layer: g.journey_layer as Layer | null, enrolled: (JOURNEY_STATUSES as readonly string[]).includes(g.status), activated: Boolean(g.user_id && active.has(g.user_id)) })),
          stage.layer as Layer,
          signal,
        );
        const DONE: Record<string, string> = { AI_MINDSET: "aprobaron su reto", ROLE_ENABLEMENT: "certificaron", AI_LAB_SHOWCASE: "tienen su proyecto listo", SHOWCASE: "presentaron", CLOSURE: "llegaron al cierre" };
        return <GroupProgress cov={cov} stageName={stage.name} doneLabel={DONE[stage.layer] ?? "completaron"} />;
      })())}

      {stage.layer !== "ASSESSMENT" && !detailOpen && isAdmin && tab.key === tabs[0].key && <PulseStatus waveId={waveId} layer={stage.layer as Layer} />}

      {stage.layer === "AI_MINDSET" && !detailOpen && (await (async () => {
        // Si una apertura programada ya venció y el cron aún no pasó, el aviso sale ahora (una sola vez).
        await notifyStageOpen(waveId);
        const o = await mindsetOpening(waveId);
        return <StageOpeningPanel waveId={waveId} {...o} canEdit={isAdmin} />;
      })())}

      {/* Pestañas con <a>: la navegación cliente que solo cambia ?tab= se pierde en esta página. */}
      <nav className="view-toggle jn-tabs" aria-label={`Secciones de ${stage.name}`}>
        {tabs.map((t) => {
          const action = sum.actions.find((a) => a.tab === t.key);
          return (
            <a key={t.key} href={t.key === tabs[0].key ? base : `${base}?tab=${t.key}`} aria-current={t.key === tab.key ? "true" : undefined}>
              {t.label}{action && <span className="jn-tab-n" aria-label={`${action.count} pendientes`}>{action.count}</span>}
            </a>
          );
        })}
      </nav>

      {/* ───── Contenido de la etapa (admin) ───── */}
      {tab.key === "contenido" && isAdmin && stage.layer !== "ASSESSMENT" && (await (async () => {
        const [{ data: guides }, { data: caps }] = await Promise.all([
          db.from("stage_guides").select("*").eq("wave_id", waveId).eq("layer", stage.layer),
          db.from("capsules").select("*").eq("wave_id", waveId).eq("layer", stage.layer).order("position"),
        ]);
        const pub = PUBLIC_STAGES.find((p) => p.slug === ({ mindset: "mindset", "role-enablement": "role-enablement", "ai-lab": "ai-lab", showcase: "showcase", cierre: "cierre" } as Record<string, string>)[stage.slug]);
        return (
          <div className="stack">
            <ContentEditor waveId={waveId} guides={(guides ?? []) as StageGuide[]} capsules={(caps ?? []) as Capsule[]} fixedLayer={stage.layer as Layer} />
            {pub && <PublicStageVideos stages={[{ slug: pub.slug, name: pub.name }]} videos={await publicStageVideos()} />}
          </div>
        );
      })())}

      {/* ───── Assessment ───── */}
      {stage.layer === "ASSESSMENT" && tab.key === "resumen" && (await (async () => {
        const { data: cs } = await db.from("candidates").select("id, full_name, client_name, role_title, status").eq("wave_id", waveId).order("full_name");
        const list = (cs ?? []).filter((c) => [...TO_DECIDE, "APPLICATION_SUBMITTED", "SELECTED", "CONDITIONS_PENDING"].includes(c.status));
        const group = (st: string[]) => list.filter((c) => st.includes(c.status));
        const blocks = [
          { title: "Por evaluar", hint: "Postulación enviada, sin evaluación", rows: group(["APPLICATION_SUBMITTED"]) },
          { title: "Decisión pendiente", hint: "Evaluadas, en revisión humana o repechaje", rows: group(TO_DECIDE) },
          { title: "Compromiso sin aceptar", hint: "Seleccionados que aún no firman", rows: group(["SELECTED", "CONDITIONS_PENDING"]) },
        ];
        return (
          <>
            <div className="adm-grid three">
              {blocks.map((b) => (
                <section key={b.title} className="adm-card">
                  <div className="adm-card-head"><h2>{b.title}</h2><span className="muted">{b.rows.length}</span></div>
                  <p className="muted" style={{ marginTop: 0 }}><small>{b.hint}</small></p>
                  {b.rows.length === 0 ? <p className="muted jn-none"><Icon name="check" size={16} /> Al día</p> : (
                    <ul className="jn-people">
                      {b.rows.map((c) => (
                        <li key={c.id}>
                          <Link href={`/admin/admision/${waveId}/c/${c.id}`}><strong>{c.full_name}</strong><small>{[c.client_name, c.role_title].filter(Boolean).join(" · ")}</small></Link>
                          <Badge>{ADMISSION_LABEL[c.status as AdmissionStatus] ?? c.status}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
            <div className="jn-cta">
              <p className="muted">La evaluación con IA, las decisiones de selección y la inscripción se gestionan en Admisión.</p>
              <div className="row" style={{ gap: 8 }}>
                {isAdmin && <a className="btn ghost" href={`${base}?tab=criterios`}>Conoce los criterios de evaluación</a>}
                <Link className="btn" href={`/admin/admision/${waveId}`}>Gestionar en Admisión <Icon name="arrowRight" size={16} /></Link>
              </div>
            </div>
          </>
        );
      })())}
      {stage.layer === "ASSESSMENT" && tab.key === "criterios" && <EvaluationGuide embedded />}

      {/* ───── Participantes (etapas formativas) ───── */}
      {tab.key === "participantes" && (
        here.length === 0
          ? <section className="adm-card"><div className="empty"><Icon name="users" size={28} /><span>Nadie está en {stage.name} por ahora.</span></div></section>
          : <ParticipantsBoard waveId={waveId} people={here as never} isAdmin={isAdmin} />
      )}

      {tab.key === "entregas" && (await (async () => {
        const { data: subs } = ids.length
          ? await db.from("submissions").select("id, candidate_id, capsule_id, attempt, status, score, feedback, text_answer, files, submitted_at, capsules(title, layer, max_attempts), submission_ai_reviews(status, score, threshold, verdict, criteria, strengths, improvements, feedback, internal_note, error, updated_at)").in("candidate_id", ids).order("submitted_at", { ascending: false })
          : { data: [] };
        const mine = (subs ?? []).filter((s) => (s.capsules as unknown as { layer: string } | null)?.layer === stage.layer);
        const { data: tasks } = await db.from("capsules").select("id, task_required").eq("wave_id", waveId).eq("layer", stage.layer).eq("published", true).not("task_prompt", "is", null);
        const required = (tasks ?? []).filter((t) => t.task_required).map((t) => t.id);
        const maxOf = (x: (typeof mine)[number]) => (x.capsules as unknown as { max_attempts: number | null } | null)?.max_attempts ?? null;
        const aiOf = (x: (typeof mine)[number]) => [x.submission_ai_reviews].flat()[0] as { status: string; score: number | null } | undefined;
        const asSub = (x: (typeof mine)[number]) => ({ ...x, person: nameOf(x.candidate_id), ai: [x.submission_ai_reviews].flat()[0] ?? null });
        const rows = (enrolled ?? []).map((p) => {
          const own = mine.filter((x) => x.candidate_id === p.id);
          const last = [...own].sort((a, b) => b.attempt - a.attempt || String(b.submitted_at).localeCompare(String(a.submitted_at)))[0];
          const ai = last ? aiOf(last) : undefined;
          return {
            id: p.id, name: p.full_name, client: p.client_name ? prettyName(p.client_name) : null, role: p.role_title ? prettyName(p.role_title) : null,
            state: deliveryState(own, required), subId: last?.id ?? null, attempt: last?.attempt ?? null, maxAttempts: last ? maxOf(last) : null,
            score: last?.score != null ? Number(last.score) : null, aiScore: ai?.status === "done" && ai.score != null ? Number(ai.score) : null, submittedAt: last?.submitted_at ?? null,
          };
        });
        // Detalle de una persona: por su entrega (?sub=) o por la persona (?p=), tenga o no entrega.
        const selected = subParam ? mine.find((x) => x.id === subParam) : undefined;
        const personId = selected?.candidate_id ?? (personParam && (enrolled ?? []).some((x) => x.id === personParam) ? personParam : null);
        if (personId) {
          const p = (enrolled ?? []).find((x) => x.id === personId)!;
          const own = mine.filter((x) => x.candidate_id === personId).sort((a, b) => b.attempt - a.attempt || String(b.submitted_at).localeCompare(String(a.submitted_at)));
          const current = selected ?? own[0];
          const history = own.filter((x) => x.id !== current?.id);
          const next = rows.find((r) => r.state === "pending" && r.subId && r.subId !== current?.id);
          const [{ data: prof }, { data: cred }] = p.user_id
            ? await Promise.all([supabaseService().from("profiles").select("status").eq("id", p.user_id).maybeSingle(), supabaseService().from("user_credentials").select("last_login_at").eq("user_id", p.user_id).maybeSingle()])
            : [{ data: null }, { data: null }];
          return (
            <EvaluateView
              sub={current ? (asSub(current) as never) : null}
              name={p.full_name}
              person={{ client: p.client_name ? prettyName(p.client_name) : null, role: p.role_title ? prettyName(p.role_title) : null }}
              facts={{ email: p.corporate_email, delivery: p.delivery_owner, account: prof?.status === "ACTIVE" ? "Activa" : p.user_id ? "Creada, sin activar" : "Sin cuenta", lastLogin: (cred as { last_login_at?: string | null } | null)?.last_login_at ?? null, stage: p.journey_layer ? stageNameOf(p.journey_layer) : "AI First Mindset (por iniciar)", since: p.journey_layer_since }}
              state={rows.find((r) => r.id === personId)?.state ?? "missing"}
              history={history as never}
              backHref={`${base}?tab=entregas`}
              nextHref={next ? `${base}?tab=entregas&sub=${next.subId}` : null}
              isAdmin={isAdmin}
              move={isAdmin ? <MoveStage candidateId={p.id} name={p.full_name} current={p.journey_layer as Layer | null} enrolled /> : null}
            />
          );
        }
        return <>
          {isAdmin && (
            <div className="sp-tools">
              <AiBar waveId={waveId} subs={mine.map(asSub) as never} />
              <a className="btn small ghost" href={`${base}/exportar-entregas`} download>Descargar reporte (Excel)</a>
            </div>
          )}
          <SubmissionsPanel base={base} rows={rows} isAdmin={isAdmin} />
        </>;
      })())}

      {tab.key === "aicert" && (await (async () => {
        const r = await waveReport(waveId);
        const people = r.persons.filter((p) => p.layer === "ROLE_ENABLEMENT");
        return <AiCertBoard waveId={waveId} isAdmin={isAdmin} people={people.map(({ id, name, role, layer, progress, overall, attendance, alert }) => ({ id, name, role, layer, progress, overall, attendance, alert }))} />;
      })())}

      {tab.key === "certificaciones" && (await (async () => {
        const { data: certs } = ids.length ? await db.from("certifications").select("*").in("candidate_id", ids).order("created_at", { ascending: false }) : { data: [] };
        return <ReviewQueue kind="certifications" isAdmin={isAdmin} items={(certs ?? []).map((c) => ({ ...c, person: nameOf(c.candidate_id) })) as never} />;
      })())}

      {/* ───── Role Enablement: las 4 sesiones semanales del profesor ───── */}
      {tab.key === "clases" && stage.layer === "ROLE_ENABLEMENT" && <ReSessions waveId={waveId} viewer={viewer} />}

      {/* ───── AI Lab (pase, clases y proyectos) y Showcase (presentaciones y resultados): el espacio del Hub AI ───── */}
      {((stage.layer === "AI_LAB_SHOWCASE" && ["pase", "clases", "proyectos"].includes(tab.key)) || (stage.layer === "SHOWCASE" && tab.key === "showcase")) && (
        <LabWorkspace waveId={waveId} tab={tab.key} real={viewer} base={`${base}?`} embedded />
      )}

      {/* ───── Cierre ───── */}
      {tab.key === "resultados" && (await (async () => {
        const closing = here.map((p) => p.id);
        const [{ data: certs }, { data: projects }] = await Promise.all([
          ids.length ? db.from("certifications").select("candidate_id, result, status").in("candidate_id", ids).eq("status", "VERIFIED").eq("result", "PASSED") : Promise.resolve({ data: [] }),
          db.from("lab_projects").select("id, title, client_name, showcase_decision, lab_project_members(candidate_id)").eq("wave_id", waveId),
        ]);
        const certified = new Set((certs ?? []).map((c) => c.candidate_id));
        const presented = (projects ?? []).filter((p) => p.showcase_decision);
        return (
          <div className="stack">
            <section className="adm-kpis">
              <div className="adm-kpi"><span className="ico"><Icon name="flag" size={20} /></span><strong>{closing.length}</strong><small>En cierre</small></div>
              <div className="adm-kpi"><span className="ico"><Icon name="badge" size={20} /></span><strong>{certified.size}</strong><small>Con AI CERT verificada</small></div>
              <div className="adm-kpi"><span className="ico"><Icon name="presentation" size={20} /></span><strong>{presented.length}</strong><small>Proyectos presentados en Showcase</small></div>
            </section>
            <section className="adm-card">
              <div className="adm-card-head"><h2>Profesionales en cierre</h2><Link className="more-link" href="/admin/talento">Seguimiento de adopción en Talento <Icon name="arrowRight" size={16} /></Link></div>
              {here.length === 0 ? <div className="empty"><span>Aún nadie llega al cierre.</span></div> : (
                <ul className="jn-people">
                  {here.map((p) => (
                    <li key={p.id}>
                      <span><strong>{p.full_name}</strong><small>{[p.client_name, p.role_title].filter(Boolean).join(" · ")}</small></span>
                      {certified.has(p.id) ? <Badge tone="ok">AI CERT verificada</Badge> : <Badge>Sin AI CERT verificada</Badge>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        );
      })())}

      <nav className="jn-pager" aria-label="Otras etapas">
        {prev ? <Link href={`/admin/journey/${waveId}/${prev.slug}`}><Icon name="arrowLeft" size={16} /> <span><small>Etapa anterior</small>{prev.name}</span></Link> : <span />}
        {next ? <Link href={`/admin/journey/${waveId}/${next.slug}`} className="nx"><span><small>Etapa siguiente</small>{next.name}</span> <Icon name="arrowRight" size={16} /></Link> : <span />}
      </nav>
    </div>
  );
}
