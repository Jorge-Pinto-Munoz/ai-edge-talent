import Link from "next/link";
import { myStaffWaves, requireAnyRolePage } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { layerName, type Layer } from "@/lib/journey/rules";
import { attendanceByPerson, classDateLabel, todayChile, type AttendanceRow } from "@/lib/teacher/rules";
import { ClassForm } from "@/components/teacher/ClassForm";
import { Icon, type IconName } from "@/components/site/Icon";
import { Badge } from "@/components/ui";

export const metadata = { title: "Clases · Portal AET" };
export const dynamic = "force-dynamic";

type Cls = { id: string; held_on: string; author: string; objective: string | null; topic: string | null; highlights: string | null; next_steps: string | null; comments: string | null };
const ALERT_TONE = { high: "bad", medium: "warn", low: "review" } as const;
const MATRIX_COLS = 8;

export default async function ProfesorWave({ params, searchParams }: { params: Promise<{ waveId: string }>; searchParams: Promise<{ clase?: string }> }) {
  const { waveId } = await params;
  const { clase } = await searchParams;
  const viewer = await requireAnyRolePage(`/admin/profesor/${waveId}`, ["admin", "delivery", "profesor"]);
  const isTeacher = viewer.role === "profesor";
  const db = await supabaseUser();
  const allowed = isTeacher ? (await myStaffWaves(viewer)).includes(waveId) : true;
  const { data: wave } = allowed ? await db.from("waves").select("id, name").eq("id", waveId).maybeSingle() : { data: null };
  if (!wave) {
    return (
      <div className="adm">
        <header className="adm-head"><div><div className="eyebrow">Profesor</div><h1>Clases</h1></div></header>
        <section className="adm-card"><div className="empty"><Icon name="layers" size={28} /><strong>Aún no tienes una Wave asignada.</strong><span>El equipo AI Edge Talent te asignará como profesor/a de una Wave.</span></div></section>
      </div>
    );
  }

  const { data: cands } = await db
    .from("candidates")
    .select("id, full_name, role_title, client_name, journey_layer")
    .eq("wave_id", waveId)
    .in("status", ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"])
    .order("full_name");
  const people = cands ?? [];
  const nameOf = (id: string) => people.find((c) => c.id === id)?.full_name ?? "—";

  const { data: clsData } = await db.from("teacher_classes").select("id, held_on, author, objective, topic, highlights, next_steps, comments").eq("wave_id", waveId).order("held_on", { ascending: false });
  const classes = (clsData ?? []) as Cls[];
  const { data: att } = classes.length ? await db.from("teacher_class_attendance").select("class_id, candidate_id, attended").in("class_id", classes.map((c) => c.id)) : { data: [] as AttendanceRow[] };
  const rows = (att ?? []) as AttendanceRow[];
  const summary = attendanceByPerson(classes, rows, people.map((p) => p.id));
  const alerts = summary.filter((s) => s.alert).sort((a, b) => "hml".indexOf(a.alert!.level[0]) - "hml".indexOf(b.alert!.level[0]));
  const totalMarks = rows.length;
  const avg = totalMarks ? Math.round((rows.filter((r) => r.attended).length / totalMarks) * 100) : null;

  const authors = [...new Set(classes.map((c) => c.author))];
  const { data: profs } = !isTeacher && authors.length ? await db.from("profiles").select("id, full_name, email").in("id", authors) : { data: [] };
  const authorName = (id: string) => (id === viewer.id ? "Tú" : profs?.find((p) => p.id === id)?.full_name ?? profs?.find((p) => p.id === id)?.email ?? "Profesor/a");

  const canWrite = isTeacher || viewer.role === "admin";
  const editing = clase && clase !== "nueva" ? classes.find((c) => c.id === clase && (c.author === viewer.id || viewer.role === "admin")) : null;
  const showForm = isTeacher ? true : clase === "nueva" || Boolean(editing);
  const today = todayChile();
  const formPeople = people.map((p) => ({ id: p.id, name: p.full_name, detail: [p.role_title, p.client_name, layerName(p.journey_layer as Layer | null)].filter(Boolean).join(" · ") }));

  const kpis: [string, string, IconName][] = [
    ["Clases registradas", String(classes.length), "book"],
    ["Asistencia promedio", avg === null ? "—" : `${avg}%`, "users"],
    ["Para seguimiento", String(alerts.filter((a) => a.alert!.level !== "low").length), "alert"],
    ["Última clase", classes[0] ? classDateLabel(classes[0].held_on) : "—", "clock"],
  ];
  const matrix = [...classes].slice(0, MATRIX_COLS).reverse();

  return (
    <div className="adm">
      <header className="adm-head">
        <div>
          <div className="eyebrow">{wave.name} · {isTeacher ? "Profesor" : "Seguimiento"}</div>
          <h1>{isTeacher ? "Tus clases" : "Clases y asistencia"}</h1>
          <p className="muted" style={{ maxWidth: 720 }}>
            {isTeacher
              ? "Después de cada clase (normalmente una por semana) registra de qué se trató y marca quién asistió. Delivery recibe automáticamente las alertas de inasistencia."
              : "Lo que registra el profesor en cada clase y la asistencia. Las alertas se calculan solas: dos clases seguidas sin asistir o asistencia bajo 75%."}
          </p>
        </div>
        {!isTeacher && canWrite && !showForm && <Link className="btn secondary" href="?clase=nueva">Registrar una clase</Link>}
      </header>

      <section className="adm-kpis">
        {kpis.map(([label, n, icon]) => (
          <div key={label} className="adm-kpi">
            <span className="ico"><Icon name={icon} size={20} /></span>
            <strong>{n}</strong>
            <small>{label}</small>
          </div>
        ))}
      </section>

      {showForm && canWrite && (
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>{editing ? `Editar clase del ${classDateLabel(editing.held_on)}` : "Registrar clase"}</h2>
            {editing ? <Link href={`/admin/profesor/${waveId}`} className="muted">← Registrar otra clase</Link> : <span className="muted">Toma 2 minutos</span>}
          </div>
          <ClassForm
            key={editing?.id ?? "nueva"}
            waveId={waveId}
            people={formPeople}
            initial={
              editing
                ? { id: editing.id, heldOn: editing.held_on, objective: editing.objective ?? "", topic: editing.topic ?? "", highlights: editing.highlights ?? "", nextSteps: editing.next_steps ?? "", comments: editing.comments ?? "" }
                : { heldOn: today, objective: "", topic: "", highlights: "", nextSteps: "", comments: "" }
            }
            attended={editing ? Object.fromEntries(rows.filter((r) => r.class_id === editing.id).map((r) => [r.candidate_id, r.attended])) : null}
          />
        </section>
      )}

      <section className="adm-card">
        <div className="adm-card-head"><h2>Para seguimiento de Delivery</h2><span className="muted">Calculado desde la asistencia</span></div>
        {alerts.length === 0 ? (
          <div className="empty"><Icon name="check" size={24} /><span>{classes.length ? "Sin alertas de asistencia." : "Aparecerán aquí cuando haya clases registradas."}</span></div>
        ) : (
          <div className="pending-list">
            {alerts.map((s) => (
              <div key={s.candidateId} className={`pending follow lvl-${s.alert!.level}`} style={{ cursor: "default" }}>
                <span className="ico"><Icon name={s.alert!.level === "low" ? "clock" : "alert"} size={20} /></span>
                <span className="txt">
                  <strong>{nameOf(s.candidateId)}</strong>
                  <small>Asistió a {s.attended} de {s.recorded} clase(s)</small>
                </span>
                <Badge tone={ALERT_TONE[s.alert!.level]}>{s.alert!.reason}</Badge>
                <span />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="adm-card">
        <div className="adm-card-head"><h2>Clases registradas</h2><span className="muted">{classes.length}</span></div>
        {classes.length === 0 ? (
          <div className="empty"><Icon name="book" size={24} /><span>Aún no hay clases registradas.</span></div>
        ) : (
          <div className="class-list">
            {classes.map((c) => {
              const mine = rows.filter((r) => r.class_id === c.id);
              const absent = mine.filter((r) => !r.attended).map((r) => nameOf(r.candidate_id));
              return (
                <article key={c.id} className="class-card">
                  <div className="spread" style={{ gap: 8, flexWrap: "wrap" }}>
                    <div>
                      <div className="eyebrow" style={{ margin: 0 }}>{classDateLabel(c.held_on)}{!isTeacher && ` · ${authorName(c.author)}`}</div>
                      <strong className="class-topic">{c.topic ?? "Sin tema"}</strong>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <Badge tone={absent.length ? "warn" : "ok"}>{mine.length - absent.length}/{mine.length} asistieron</Badge>
                      {(c.author === viewer.id || viewer.role === "admin") && <Link className="btn ghost small" href={`?clase=${c.id}`}>Editar</Link>}
                    </div>
                  </div>
                  <dl className="class-dl">
                    {c.objective && <><dt>Objetivo</dt><dd>{c.objective}</dd></>}
                    {c.highlights && <><dt>A destacar</dt><dd>{c.highlights}</dd></>}
                    {c.next_steps && <><dt>Próximos pasos</dt><dd>{c.next_steps}</dd></>}
                    {c.comments && <><dt>Comentarios</dt><dd>{c.comments}</dd></>}
                    {absent.length > 0 && <><dt>No asistieron</dt><dd>{absent.join(", ")}</dd></>}
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {matrix.length > 0 && (
        <section className="adm-card">
          <div className="adm-card-head"><h2>Asistencia por persona</h2><span className="muted">Últimas {matrix.length} clases</span></div>
          <div className="table-wrap" tabIndex={0}>
            <table className="attend-matrix">
              <thead>
                <tr><th>Participante</th>{matrix.map((c) => <th key={c.id}>{classDateLabel(c.held_on).replace(/^\S+ /, "")}</th>)}<th>Total</th></tr>
              </thead>
              <tbody>
                {summary.map((s) => (
                  <tr key={s.candidateId}>
                    <td><strong>{nameOf(s.candidateId)}</strong></td>
                    {matrix.map((c) => {
                      const r = rows.find((x) => x.class_id === c.id && x.candidate_id === s.candidateId);
                      return <td key={c.id} className={r ? (r.attended ? "in" : "out") : "na"} aria-label={r ? (r.attended ? "Asistió" : "No asistió") : "Sin registro"}>{r ? (r.attended ? "✓" : "✗") : "·"}</td>;
                    })}
                    <td><strong>{s.rate === null ? "—" : `${Math.round(s.rate * 100)}%`}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

    </div>
  );
}
