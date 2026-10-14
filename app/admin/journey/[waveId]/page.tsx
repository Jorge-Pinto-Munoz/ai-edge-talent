import Link from "next/link";
import type { CSSProperties } from "react";
import { notFound, redirect } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { ParticipantsBoard } from "@/components/journey-admin/ParticipantsBoard";
import { GroupsManager } from "@/components/journey-admin/GroupsManager";
import { WeeklyFeedback } from "@/components/journey-admin/WeeklyFeedback";
import { ClassesWorkspace } from "@/components/teacher/ClassesWorkspace";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { Icon, type IconName } from "@/components/site/Icon";
import { journeyOverview, STAGE_STATE_LABEL } from "@/lib/journey/overview";
import { LEGACY_JOURNEY_TAB } from "@/lib/journey/stages";
import { JOURNEY_STATUSES } from "@/lib/admission/view-as";

export const metadata = { title: "Journey · Portal AET" };
export const dynamic = "force-dynamic";

/** Seguimiento transversal (no pertenece a una sola etapa). */
const VIEWS: { key: string; label: string; hint: string; icon: IconName }[] = [
  { key: "participantes", label: "Todos los participantes", hint: "Mover de etapa y ver dónde está cada uno", icon: "users" },
  { key: "grupos", label: "Grupos y AI Coaches", hint: "Quién acompaña a quién", icon: "chat" },
  { key: "feedback", label: "Feedback semanal", hint: "Lo que reportan los AI Coaches", icon: "list" },
  { key: "clases", label: "Clases y asistencia", hint: "Registro de clases y alertas", icon: "calendar" },
];

/** Journey: el estado de la Wave etapa por etapa (nivel 2) y acceso al detalle de cada una (nivel 3). */
export default async function JourneyAdmin({ params, searchParams }: { params: Promise<{ waveId: string }>; searchParams: Promise<{ tab?: string; vista?: string; semana?: string; clase?: string }> }) {
  const { waveId } = await params;
  const { tab, vista, semana, clase } = await searchParams;
  // Rutas antiguas: ?tab=entregas → etapa correspondiente; ?tab=grupos → vista transversal.
  if (tab && LEGACY_JOURNEY_TAB[tab]) redirect(`/admin/journey/${waveId}/${LEGACY_JOURNEY_TAB[tab]}`);
  if (tab && VIEWS.some((v) => v.key === tab)) redirect(`/admin/journey/${waveId}?vista=${tab}#seguimiento`);
  const viewer = await requireStaffPage(`/admin/journey/${waveId}`);
  const isAdmin = viewer.role === "admin";
  const db = await supabaseUser();
  const { data: wave } = await db.from("waves").select("id, name").eq("id", waveId).maybeSingle();
  if (!wave) notFound();
  const waveLabel = wave.name.replace("AI Edge Talent · ", "");
  const { stages, enrolled } = await journeyOverview(waveId);
  const view = VIEWS.find((v) => v.key === vista) ?? null;

  const { data: people } = view && view.key !== "clases"
    ? await db.from("candidates").select("id, full_name, client_name, role_title, specialty, status, journey_layer, journey_layer_since").eq("wave_id", waveId).in("status", [...JOURNEY_STATUSES]).order("full_name")
    : { data: null };
  const nameOf = (id: string) => people?.find((p) => p.id === id)?.full_name ?? "—";

  return (
    <div className="adm">
      <Breadcrumbs items={[{ label: waveLabel, href: `/admin?wave=${waveId}` }, { label: "Journey" }]} />
      <header className="adm-head">
        <div>
          <h1>Journey</h1>
          <p className="muted" style={{ maxWidth: 720 }}>
            Dónde está cada profesional de la Wave y qué necesita atención en cada etapa. {enrolled === 1 ? "1 profesional inscrito" : `${enrolled} profesionales inscritos`}.
          </p>
        </div>
        {isAdmin && <Link className="btn secondary" href={`/admin/contenido/${waveId}`}>Contenido de las etapas</Link>}
      </header>

      <ol className="jn-rail" aria-label="Etapas del journey">
        {stages.map((s) => (
          <li key={s.stage.slug} className={`st-${s.state}`}>
            <Link href={`/admin/journey/${waveId}/${s.stage.slug}`}>
              <span className="jn-n">{s.state === "done" ? <Icon name="check" size={14} /> : s.stage.n}</span>
              <span className="jn-rail-txt"><strong>{s.stage.name}</strong><small>{s.inStage} en la etapa</small></span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="jn-stages">
        {stages.map((s) => {
          const href = `/admin/journey/${waveId}/${s.stage.slug}`;
          const isAdm = s.stage.layer === "ASSESSMENT";
          return (
            <article key={s.stage.slug} className={`jn-stage st-${s.state}`} aria-labelledby={`jn-${s.stage.slug}`}>
              <div className="jn-stage-head">
                <span className="jn-ico"><Icon name={s.stage.icon} size={22} /></span>
                <div>
                  <div className="jn-eyebrow">Etapa {s.stage.n}</div>
                  <h2 id={`jn-${s.stage.slug}`}><Link href={href}>{s.stage.name}</Link></h2>
                  <p className="muted">{s.stage.purpose}</p>
                </div>
                <div className="jn-stage-aside">
                  <span className={`jn-state st-${s.state}`}>{STAGE_STATE_LABEL[s.state]}</span>
                  <Link className="btn ghost small" href={href}>Ver detalle <Icon name="arrowRight" size={16} /></Link>
                </div>
              </div>

              <div className="jn-main">
              <dl className="jn-metrics">
                <div><dt>{isAdm ? "En admisión" : "En la etapa"}</dt><dd>{s.inStage}</dd></div>
                <div><dt>{isAdm ? "Con decisión" : "Completaron"}</dt><dd>{s.completed ?? "—"}</dd></div>
                <div><dt>{isAdm ? "Por resolver" : "Con alerta"}</dt><dd className={(isAdm ? s.actions.reduce((n, a) => n + a.count, 0) : s.flagged) ? "warn" : ""}>{isAdm ? s.actions.reduce((n, a) => n + a.count, 0) : s.flagged}</dd></div>
              </dl>

              <div className="jn-progress">
                <span className="bar" role="img" aria-label={s.pct === null ? "Sin datos de avance" : `${s.pct}%`}><span style={{ "--w": (s.pct ?? 0) / 100 } as CSSProperties} /></span>
                <small className="muted">
                  {s.pct === null ? "Aún sin profesionales para medir avance"
                    : isAdm ? `${s.pct}% de las postulaciones tiene decisión`
                    : s.stage.layer === "CLOSURE" ? `${s.pct}% de la Wave llegó al cierre`
                    : `${s.pct}% de la Wave la completó`}
                </small>
              </div>

              </div>

              <div className="jn-cols">
                <div>
                  <h3>Hitos</h3>
                  <ul className="jn-list">{s.stage.milestones.slice(0, 4).map((m) => <li key={m}>{m}</li>)}</ul>
                </div>
                <div>
                  <h3>Requiere intervención</h3>
                  {s.actions.length === 0 ? <p className="muted jn-none"><Icon name="check" size={16} /> Nada pendiente</p> : (
                    <ul className="jn-actions">
                      {s.actions.map((a) => (
                        <li key={a.label}><Link href={`${href}?tab=${a.tab}`}><span className="n">{a.count}</span>{a.label}<Icon name="arrowRight" size={16} /></Link></li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

            </article>
          );
        })}
      </div>

      <section className="adm-card" id="seguimiento" aria-labelledby="seg-t">
        <div className="adm-card-head"><h2 id="seg-t">Seguimiento transversal</h2><span className="muted">Lo que cruza todas las etapas</span></div>
        <nav className="jn-views" aria-label="Seguimiento transversal">
          {VIEWS.map((v) => (
            <Link key={v.key} href={view?.key === v.key ? `/admin/journey/${waveId}#seguimiento` : `?vista=${v.key}#seguimiento`} aria-current={view?.key === v.key ? "true" : undefined}>
              <Icon name={v.icon} size={20} />
              <span><strong>{v.label}</strong><small>{v.hint}</small></span>
            </Link>
          ))}
        </nav>
        {view?.key === "participantes" && <ParticipantsBoard waveId={waveId} people={(people ?? []) as never} isAdmin={isAdmin} />}
        {view?.key === "grupos" && (await (async () => {
          const { data: groups } = await db.from("wave_groups").select("id, name, group_members(candidate_id), group_mentors(mentor_id, profiles(email, full_name))").eq("wave_id", waveId).order("name");
          return <GroupsManager waveId={waveId} groups={(groups ?? []) as never} people={(people ?? []).map((p) => ({ id: p.id, name: p.full_name, specialty: p.specialty }))} isAdmin={isAdmin} />;
        })())}
        {view?.key === "feedback" && <WeeklyFeedback waveId={waveId} semana={semana} nameOf={nameOf} base={`/admin/journey/${waveId}?vista=feedback&`} />}
        {view?.key === "clases" && <ClassesWorkspace waveId={waveId} clase={clase} viewer={viewer} base={`/admin/journey/${waveId}?vista=clases&`} embedded />}
      </section>
    </div>
  );
}
