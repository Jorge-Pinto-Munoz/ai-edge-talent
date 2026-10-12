import Link from "next/link";
import { myStaffWaves, requireAnyRolePage } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { layerIndex, weekStart, type Layer } from "@/lib/journey/rules";
import { flagLabel, shiftWeek, statusLabel, statusTone, weekLabel, type TeacherEntry } from "@/lib/teacher/rules";
import { TeacherWeekForm } from "@/components/teacher/TeacherWeekForm";
import { WaveStaffManager } from "@/components/admin/WaveStaffManager";
import { Icon } from "@/components/site/Icon";
import { Badge, fmtDate } from "@/components/ui";

export const metadata = { title: "Cierre semanal · Portal AET" };
export const dynamic = "force-dynamic";

type Entry = { report_id: string; candidate_id: string; status: string; progress: number | null; attended: boolean | null; note: string | null; flag: string };

export default async function ProfesorWave({ params, searchParams }: { params: Promise<{ waveId: string }>; searchParams: Promise<{ semana?: string }> }) {
  const { waveId } = await params;
  const { semana } = await searchParams;
  const viewer = await requireAnyRolePage(`/admin/profesor/${waveId}`, ["admin", "delivery", "profesor"]);
  const isTeacher = viewer.role === "profesor";
  const db = await supabaseUser();
  const allowed = isTeacher ? (await myStaffWaves(viewer)).includes(waveId) : true;
  const { data: wave } = allowed ? await db.from("waves").select("id, name").eq("id", waveId).maybeSingle() : { data: null };
  if (!wave) {
    return (
      <div className="adm">
        <header className="adm-head"><div><div className="eyebrow">Profesor</div><h1>Cierre semanal</h1></div></header>
        <section className="adm-card"><div className="empty"><Icon name="layers" size={28} /><strong>Aún no tienes una Wave asignada.</strong><span>El equipo AI Edge Talent te asignará como profesor/a de una Wave.</span></div></section>
      </div>
    );
  }

  const current = weekStart(new Date());
  const week = semana && /^\d{4}-\d{2}-\d{2}$/.test(semana) && semana <= current ? weekStart(new Date(`${semana}T12:00:00Z`)) : current;
  const { data: cands } = await db
    .from("candidates")
    .select("id, full_name, role_title, client_name, journey_layer")
    .eq("wave_id", waveId)
    .in("status", ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"])
    .order("full_name");
  // Primero quienes están en Role Enablement (la etapa del curso), luego el resto por etapa.
  const people = [...(cands ?? [])].sort((a, b) => Number(b.journey_layer === "ROLE_ENABLEMENT") - Number(a.journey_layer === "ROLE_ENABLEMENT") || layerIndex(b.journey_layer as Layer) - layerIndex(a.journey_layer as Layer));
  const nameOf = (id: string) => cands?.find((c) => c.id === id)?.full_name ?? "—";

  const { data: reports } = await db.from("teacher_weekly_reports").select("id, week_start, author, general_feedback, closed_at, updated_at").eq("wave_id", waveId).order("week_start", { ascending: false });
  const reportIds = (reports ?? []).map((r) => r.id);
  const { data: entries } = reportIds.length ? await db.from("teacher_weekly_entries").select("*").in("report_id", reportIds) : { data: [] as Entry[] };
  const authors = [...new Set((reports ?? []).map((r) => r.author))];
  const { data: profs } = !isTeacher && authors.length ? await db.from("profiles").select("id, full_name, email").in("id", authors) : { data: [] };
  const authorName = (id: string) => (id === viewer.id ? "Tú" : profs?.find((p) => p.id === id)?.full_name ?? profs?.find((p) => p.id === id)?.email ?? "Profesor/a");

  const weekNav = (
    <nav className="week-nav" aria-label="Semana">
      <Link className="btn ghost small" href={`?semana=${shiftWeek(week, -1)}`}><Icon name="arrowLeft" size={16} /> Anterior</Link>
      <strong>Semana {weekLabel(week)}{week === current && <small className="muted"> · esta semana</small>}</strong>
      {week < current ? <Link className="btn ghost small" href={`?semana=${shiftWeek(week, 1)}`}>Siguiente <Icon name="arrowRight" size={16} /></Link> : <span />}
    </nav>
  );

  /* ───── Vista del profesor: registra y cierra su semana ───── */
  if (isTeacher) {
    const mine = (reports ?? []).filter((r) => r.author === viewer.id);
    const report = mine.find((r) => r.week_start === week);
    const existing: TeacherEntry[] = (entries ?? [])
      .filter((e) => e.report_id === report?.id)
      .map((e) => ({ candidateId: e.candidate_id, status: e.status, progress: e.progress, attended: e.attended, note: e.note ?? "", flag: e.flag }));
    return (
      <div className="adm">
        <header className="adm-head">
          <div>
            <div className="eyebrow">{wave.name} · Profesor</div>
            <h1>Cierre semanal</h1>
            <p className="muted" style={{ maxWidth: 720 }}>Cada semana deja el avance de cada participante, un feedback general de la clase y marca los casos preocupantes o destacados. Al cerrar la semana, Delivery los ve para darles seguimiento.</p>
          </div>
          <div className="adm-deadline"><small>Semanas cerradas</small><strong>{mine.filter((r) => r.closed_at).length}</strong></div>
        </header>
        <section className="adm-card">
          {weekNav}
          <div className="row" style={{ gap: 8, margin: "4px 0 16px" }}>
            {report?.closed_at ? <Badge tone="ok">Cerrada el {fmtDate(report.closed_at)}</Badge> : report ? <Badge tone="warn">Borrador sin cerrar</Badge> : <Badge>Sin registro</Badge>}
          </div>
          <TeacherWeekForm
            key={`${week}-${report?.closed_at ?? "open"}`}
            waveId={waveId}
            week={week}
            people={people.map((p) => ({ id: p.id, name: p.full_name, role: p.role_title, client: p.client_name, layer: p.journey_layer as Layer | null }))}
            existing={existing}
            generalFeedback={report?.general_feedback ?? ""}
            closedAt={report?.closed_at ?? null}
          />
        </section>
        {mine.length > 0 && (
          <section className="adm-card">
            <div className="adm-card-head"><h2>Tus semanas</h2></div>
            <div className="pending-list">
              {mine.map((r) => (
                <Link key={r.id} href={`?semana=${r.week_start}`} className={`pending ${r.closed_at ? "done" : ""}`}>
                  <span className="ico"><Icon name={r.closed_at ? "check" : "clock"} size={20} /></span>
                  <span className="txt"><strong>Semana {weekLabel(r.week_start)}</strong><small>{r.closed_at ? "Cerrada" : "Borrador"} · {(entries ?? []).filter((e) => e.report_id === r.id && e.flag !== "NONE").length} caso(s) marcados</small></span>
                  <span />
                  <Icon name="arrowRight" size={18} className="go" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  }

  /* ───── Vista de admin y Delivery: lectura y seguimiento ───── */
  const closed = (reports ?? []).filter((r) => r.closed_at);
  const recent = closed.filter((r) => r.week_start >= shiftWeek(current, -4)).map((r) => r.id);
  const followUp = (entries ?? [])
    .filter((e) => recent.includes(e.report_id) && (e.flag !== "NONE" || e.status === "ATRASADO"))
    .map((e) => ({ ...e, report: closed.find((r) => r.id === e.report_id)! }))
    .sort((a, b) => b.report.week_start.localeCompare(a.report.week_start) || Number(b.flag === "CONCERN") - Number(a.flag === "CONCERN"));
  const weekReports = (reports ?? []).filter((r) => r.week_start === week);
  const { data: staff } = viewer.role === "admin" ? await db.from("wave_staff").select("email").eq("wave_id", waveId).eq("role", "profesor") : { data: [] };
  const staffEmails = (staff ?? []).map((s) => s.email);
  const { data: staffProfiles } = staffEmails.length ? await db.from("profiles").select("email, full_name").in("email", staffEmails) : { data: [] };

  return (
    <div className="adm">
      <header className="adm-head">
        <div>
          <div className="eyebrow">{wave.name} · Seguimiento</div>
          <h1>Cierre semanal del profesor</h1>
          <p className="muted" style={{ maxWidth: 720 }}>El avance de cada participante, el feedback general de la clase y los casos que el profesor marcó como preocupantes o destacados, para que Delivery les dé seguimiento.</p>
        </div>
        <div className="adm-deadline"><small>Semanas cerradas</small><strong>{closed.length}</strong></div>
      </header>

      <section className="adm-card">
        <div className="adm-card-head"><h2>Para seguimiento de Delivery</h2><span className="muted">Últimas 4 semanas cerradas</span></div>
        {followUp.length === 0 ? (
          <div className="empty"><Icon name="check" size={24} /><span>Sin casos marcados ni atrasos en las últimas semanas.</span></div>
        ) : (
          <div className="pending-list">
            {followUp.map((e) => (
              <div key={`${e.report_id}-${e.candidate_id}`} className={`pending follow ${e.flag === "HIGHLIGHT" ? "done" : ""}`} style={{ cursor: "default" }}>
                <span className="ico"><Icon name={e.flag === "HIGHLIGHT" ? "star" : "alert"} size={20} /></span>
                <span className="txt">
                  <strong>{nameOf(e.candidate_id)}</strong>
                  <small>{e.note ?? "Sin nota"}</small>
                  <small>Semana {weekLabel(e.report.week_start)} · {authorName(e.report.author)}</small>
                </span>
                <span className="row" style={{ gap: 6 }}>
                  {e.flag !== "NONE" && <Badge tone={e.flag === "CONCERN" ? "bad" : "brand"}>{flagLabel(e.flag)}</Badge>}
                  <Badge tone={statusTone(e.status)}>{statusLabel(e.status)}</Badge>
                </span>
                <span />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="adm-card">
        {weekNav}
        {weekReports.length === 0 ? (
          <div className="empty"><Icon name="clock" size={24} /><span>Sin registro del profesor para esta semana.</span></div>
        ) : (
          weekReports.map((r) => {
            const rows = (entries ?? []).filter((e) => e.report_id === r.id);
            return (
              <div key={r.id} className="stack" style={{ gap: 12, marginTop: 12 }}>
                <div className="row" style={{ gap: 8 }}>
                  <strong>{authorName(r.author)}</strong>
                  {r.closed_at ? <Badge tone="ok">Cerrada el {fmtDate(r.closed_at)}</Badge> : <Badge tone="warn">Borrador sin cerrar</Badge>}
                </div>
                <div className="quote-box"><small className="muted">Feedback general de la clase</small><p style={{ margin: 0 }}>{r.general_feedback ?? "—"}</p></div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Participante</th><th>Estado</th><th>Avance</th><th>Asistió</th><th>Marca</th><th>Nota</th></tr></thead>
                    <tbody>
                      {rows.map((e) => (
                        <tr key={e.candidate_id}>
                          <td><strong>{nameOf(e.candidate_id)}</strong></td>
                          <td><Badge tone={statusTone(e.status)}>{statusLabel(e.status)}</Badge></td>
                          <td>{e.progress === null ? "—" : `${e.progress}%`}</td>
                          <td>{e.attended === null ? "—" : e.attended ? "Sí" : "No"}</td>
                          <td>{e.flag === "NONE" ? "—" : <Badge tone={e.flag === "CONCERN" ? "bad" : "brand"}>{flagLabel(e.flag)}</Badge>}</td>
                          <td>{e.note ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </section>

      {viewer.role === "admin" && <WaveStaffManager waveId={waveId} role="profesor" people={staffEmails.map((email) => ({ email, name: staffProfiles?.find((p) => p.email === email)?.full_name ?? null }))} />}
    </div>
  );
}
