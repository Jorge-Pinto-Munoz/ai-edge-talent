import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { stageBySlug } from "@/lib/journey/stages";
import { journeyOverview, STAGE_STATE_LABEL } from "@/lib/journey/overview";
import { JOURNEY_STATUSES } from "@/lib/admission/view-as";
import { waveReport } from "@/lib/pulse/report";
import { ADMISSION_LABEL, type AdmissionStatus } from "@/lib/domain/types";
import { ParticipantsBoard } from "@/components/journey-admin/ParticipantsBoard";
import { ReviewQueue } from "@/components/journey-admin/ReviewQueue";
import { AiCertBoard } from "@/components/journey-admin/AiCertBoard";
import { ClassesWorkspace } from "@/components/teacher/ClassesWorkspace";
import { LabWorkspace } from "@/components/hub/LabWorkspace";
import { EvaluationGuide } from "@/components/admin/EvaluationGuide";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { Icon } from "@/components/site/Icon";
import { Badge } from "@/components/ui";
import { StageOpeningPanel } from "@/components/journey-admin/StageOpeningPanel";
import { mindsetOpening, notifyStageOpen } from "@/lib/journey/opening";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ etapa: string }> }) {
  return { title: `${stageBySlug((await params).etapa)?.name ?? "Etapa"} · Journey · Portal AET` };
}

const TO_DECIDE = ["ASSESSMENT_EVALUATED", "HUMAN_REVIEW", "RESCUE_REQUIRED"];

/** Detalle de una etapa (nivel 3): sus participantes, actividades, evaluaciones, entregables y acciones. */
export default async function StageDetail({ params, searchParams }: { params: Promise<{ waveId: string; etapa: string }>; searchParams: Promise<{ tab?: string; clase?: string }> }) {
  const { waveId, etapa } = await params;
  const { tab: rawTab, clase } = await searchParams;
  const stage = stageBySlug(etapa);
  if (!stage) notFound();
  const viewer = await requireStaffPage(`/admin/journey/${waveId}/${etapa}`);
  const isAdmin = viewer.role === "admin";
  const tabs = stage.tabs.filter((t) => isAdmin || !t.adminOnly);
  const tab = tabs.find((t) => t.key === rawTab) ?? tabs[0];
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
    .from("candidates").select("id, full_name, client_name, role_title, specialty, status, journey_layer, journey_layer_since")
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

      {stage.layer === "AI_MINDSET" && (await (async () => {
        // Si una apertura programada ya venció y el cron aún no pasó, el aviso sale ahora (una sola vez).
        await notifyStageOpen(waveId);
        const o = await mindsetOpening(waveId);
        return <StageOpeningPanel waveId={waveId} {...o} canEdit={isAdmin} />;
      })())}

      <nav className="view-toggle jn-tabs" aria-label={`Secciones de ${stage.name}`}>
        {tabs.map((t) => {
          const action = sum.actions.find((a) => a.tab === t.key);
          return (
            <Link key={t.key} href={t.key === tabs[0].key ? base : `${base}?tab=${t.key}`} aria-current={t.key === tab.key ? "true" : undefined}>
              {t.label}{action && <span className="jn-tab-n" aria-label={`${action.count} pendientes`}>{action.count}</span>}
            </Link>
          );
        })}
      </nav>

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
                {isAdmin && <Link className="btn ghost" href={`${base}?tab=criterios`}>Conoce los criterios de evaluación</Link>}
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
          ? await db.from("submissions").select("id, candidate_id, attempt, status, score, feedback, text_answer, files, submitted_at, capsules(title, layer, max_attempts)").in("candidate_id", ids).order("submitted_at", { ascending: false })
          : { data: [] };
        const mine = (subs ?? []).filter((s) => (s.capsules as unknown as { layer: string } | null)?.layer === stage.layer);
        return <ReviewQueue kind="submissions" items={mine.map((s) => ({ ...s, person: nameOf(s.candidate_id) })) as never} />;
      })())}

      {tab.key === "aicert" && (await (async () => {
        const r = await waveReport(waveId);
        const people = r.persons.filter((p) => p.layer === "ROLE_ENABLEMENT");
        return <AiCertBoard waveId={waveId} isAdmin={isAdmin} people={people.map(({ id, name, role, layer, progress, overall, attendance, alert }) => ({ id, name, role, layer, progress, overall, attendance, alert }))} />;
      })())}

      {tab.key === "certificaciones" && (await (async () => {
        const { data: certs } = ids.length ? await db.from("certifications").select("*").in("candidate_id", ids).order("created_at", { ascending: false }) : { data: [] };
        return <ReviewQueue kind="certifications" items={(certs ?? []).map((c) => ({ ...c, person: nameOf(c.candidate_id) })) as never} />;
      })())}

      {tab.key === "clases" && stage.layer !== "AI_LAB_SHOWCASE" && (
        <ClassesWorkspace waveId={waveId} clase={clase} viewer={viewer} base={`${base}?tab=clases&`} embedded />
      )}

      {/* ───── AI Lab & Showcase: el espacio del Hub AI ───── */}
      {stage.layer === "AI_LAB_SHOWCASE" && ["pase", "clases", "proyectos", "showcase"].includes(tab.key) && (
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
