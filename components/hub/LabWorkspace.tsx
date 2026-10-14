import "server-only";
import Link from "next/link";
import { myStaffWaves, type Viewer } from "@/lib/admission/auth";
import { supabaseService, supabaseUser } from "@/lib/supabase/server";
import { LAB_CLASSES, LAB_STATUS, labDecisionLabel, labStatusLabel, labStatusTone, type LabDecision, type LabMode, type LabStatus } from "@/lib/hub/rules";
import { LabSessionForm, PassToLab, ProjectForm, ShowcaseForm } from "@/components/hub/HubForms";
import { LabFiles, type LabFile } from "@/components/hub/LabFiles";
import { WaveStaffManager } from "@/components/admin/WaveStaffManager";
import { Icon, type IconName } from "@/components/site/Icon";
import { Badge } from "@/components/ui";


export const LAB_TABS: { key: string; label: string; icon: IconName }[] = [
  { key: "pase", label: "Pase al Lab", icon: "flag" },
  { key: "clases", label: "Clases", icon: "users" },
  { key: "proyectos", label: "Proyectos", icon: "flask" },
  { key: "showcase", label: "Showcase", icon: "presentation" },
];

type Project = {
  id: string; title: string; problem: string | null; client_name: string | null; mode: LabMode; status: LabStatus; hub_notes: string | null;
  showcase_date: string | null; showcase_decision: LabDecision | null; showcase_notes: string | null;
  lab_project_members: { candidate_id: string }[];
  lab_project_files: (LabFile & { project_id: string })[];
};

/**
 * AI Lab & Showcase de una Wave: pase al Lab, clases, proyectos y Showcase. Se usa en Journey (etapa AI Lab & Showcase)
 * y en la ruta propia del Líder Hub AI. `como`: el admin la ve como ese Líder Hub AI (solo lectura).
 * `base`: URL de la vista con sus parámetros, terminada en "?" o "&". `embedded` oculta encabezado y pestañas propias.
 */
export async function LabWorkspace({ waveId, tab: rawTab, real, como, base, embedded = false }: { waveId: string; tab?: string; real: Viewer; como?: string; base: string; embedded?: boolean }) {
  const tab = LAB_TABS.some((t) => t.key === rawTab) ? rawTab! : "pase";
  const db = await supabaseUser();
  // Ver como (solo admin): la página tal como la ve ese Líder Hub AI, en solo lectura.
  const asHub = real.role === "admin" && como
    ? (await supabaseService().from("profiles").select("id, email, full_name, role").eq("id", como).eq("role", "hub").maybeSingle()).data
    : null;
  const viewer = asHub ? { ...real, role: "hub" as const, email: asHub.email, fullName: asHub.full_name } : real;
  const hubWaves = asHub
    ? ((await supabaseService().from("wave_staff").select("wave_id").eq("email", asHub.email).eq("role", "hub")).data ?? []).map((w) => w.wave_id)
    : viewer.role === "hub" ? await myStaffWaves(viewer) : [];
  const allowed = viewer.role === "hub" ? hubWaves.includes(waveId) : true;
  const banner = asHub && (
    <div className="jr-preview" role="note"><span><strong>Vista de admin</strong> · así ve el AI Lab &amp; Showcase {asHub.full_name ?? asHub.email} (Líder Hub AI). Solo lectura.</span></div>
  );
  const q = asHub ? `&como=${asHub.id}` : "";
  const { data: wave } = allowed ? await db.from("waves").select("id, name").eq("id", waveId).maybeSingle() : { data: null };
  if (!wave) {
    return (
      <div className="adm">
        {banner}
        <header className="adm-head"><div><div className="eyebrow">Líder Hub AI</div><h1>AI Lab & Showcase</h1></div></header>
        <section className="adm-card"><div className="empty"><Icon name="layers" size={28} /><strong>Aún no tienes una Wave asignada.</strong><span>El equipo AI Edge Talent te asignará como líder del Hub AI de una Wave.</span></div></section>
      </div>
    );
  }
  const canEdit = !asHub && (viewer.role === "admin" || viewer.role === "hub");

  const { data: people } = await db
    .from("candidates")
    .select("id, full_name, role_title, client_name, journey_layer")
    .eq("wave_id", waveId)
    .in("journey_layer", ["ROLE_ENABLEMENT", "AI_LAB_SHOWCASE", "CLOSURE"])
    .order("full_name");
  const enablement = (people ?? []).filter((p) => p.journey_layer === "ROLE_ENABLEMENT");
  const inLab = (people ?? []).filter((p) => p.journey_layer === "AI_LAB_SHOWCASE" || p.journey_layer === "CLOSURE");
  const nameOf = (id: string) => people?.find((p) => p.id === id)?.full_name ?? "—";

  const [{ data: certs }, { data: projData }, { data: sessions }] = await Promise.all([
    enablement.length ? db.from("certifications").select("candidate_id, result, status, created_at").in("candidate_id", enablement.map((p) => p.id)).order("created_at", { ascending: false }) : Promise.resolve({ data: [] as { candidate_id: string; result: string; status: string }[] }),
    db.from("lab_projects").select("id, title, problem, client_name, mode, status, hub_notes, showcase_date, showcase_decision, showcase_notes, lab_project_members(candidate_id), lab_project_files(id, project_id, name, size_bytes, kind, created_at, uploaded_by)").eq("wave_id", waveId).order("created_at"),
    db.from("lab_sessions").select("id, n, held_on, notes, lab_session_entries(project_id, attended, note)").eq("wave_id", waveId),
  ]);
  const projects = (projData ?? []) as unknown as Project[];
  const members = (p: Project) => p.lab_project_members.map((m) => nameOf(m.candidate_id)).join(", ");
  const assigned = new Set(projects.flatMap((p) => p.lab_project_members.map((m) => m.candidate_id)));
  const withoutProject = inLab.filter((p) => !assigned.has(p.id));

  const gatePeople = enablement.map((p) => {
    const mine = (certs ?? []).filter((c) => c.candidate_id === p.id);
    const verified = mine.find((c) => c.status === "VERIFIED");
    const last = verified ?? mine[0];
    const ready = verified?.result === "PASSED";
    const cert = !last ? "Sin registro" : last.status === "PENDING_REVIEW" ? "En verificación" : last.status === "REJECTED" ? "Registro rechazado" : last.result === "PASSED" ? "Aprobada y verificada" : "No aprobada";
    return { id: p.id, name: p.full_name, role: p.role_title, client: p.client_name, cert, ready };
  });

  const kpis: [string, number, IconName][] = [
    ["Listos para pasar", gatePeople.filter((p) => p.ready).length, "flag"],
    ["En el Lab", inLab.length, "users"],
    ["Proyectos", projects.length, "flask"],
    ["Listos para Showcase", projects.filter((p) => p.status === "READY").length, "presentation"],
  ];

  const { data: staff } = viewer.role === "admin" ? await db.from("wave_staff").select("email").eq("wave_id", waveId).eq("role", "hub") : { data: [] };
  const staffEmails = (staff ?? []).map((s) => s.email);
  const { data: staffProfiles } = staffEmails.length ? await db.from("profiles").select("email, full_name").in("email", staffEmails) : { data: [] };
  const pickPeople = (p?: Project) => inLab.map((x) => ({ id: x.id, name: x.full_name, taken: assigned.has(x.id) && !p?.lab_project_members.some((m) => m.candidate_id === x.id) }));

  return (
    <div className="adm">
      {banner}
      {!embedded && <header className="adm-head">
        <div>
          <div className="eyebrow">{wave.name} · {viewer.role === "hub" ? "Líder Hub AI" : "Hub AI"}</div>
          <h1>AI Lab & Showcase</h1>
          <p className="muted" style={{ maxWidth: 760 }}>
            El Hub AI decide quién pasa al Lab, acompaña las dos clases —la Clase 1 con la idea del desafío y la Clase 2 con lo construido—, consolida los proyectos individuales o grupales y lleva el Showcase.
          </p>
        </div>
      </header>}

      <section className="adm-kpis">
        {kpis.map(([label, n, icon]) => (
          <div key={label} className="adm-kpi">
            <span className="ico"><Icon name={icon} size={20} /></span>
            <strong>{n}</strong>
            <small>{label}</small>
          </div>
        ))}
      </section>

      {!embedded && <nav className="view-toggle" aria-label="Secciones del Lab" style={{ alignSelf: "start", flexWrap: "wrap" }}>
        {LAB_TABS.map((t) => (
          <Link key={t.key} href={`${base}tab=${t.key}${q}`} aria-current={tab === t.key ? "true" : undefined}><Icon name={t.icon} size={16} /> {t.label}</Link>
        ))}
      </nav>}

      {tab === "pase" && (
        <div className="adm-grid">
          <section className="adm-card">
            <div className="adm-card-head"><h2>Quiénes pueden pasar al Lab</h2><span className="muted">Gate: AI CERT aprobada y verificada</span></div>
            <PassToLab waveId={waveId} people={gatePeople} readOnly={!canEdit} />
          </section>
          <section className="adm-card">
            <div className="adm-card-head"><h2>Ya en el Lab</h2><span className="muted">{inLab.length}</span></div>
            {inLab.length === 0 ? <div className="empty"><span>Aún nadie pasa al Lab.</span></div> : (
              <ul className="staff-list">
                {inLab.map((p) => (
                  <li key={p.id}>
                    <span><strong>{p.full_name}</strong><small className="muted"> · {p.client_name ?? "—"}</small></span>
                    {assigned.has(p.id) ? <Badge tone="ok">Con proyecto</Badge> : <Badge tone="warn">Sin proyecto</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "clases" && (
        <div className="adm-grid even">
          {LAB_CLASSES.map((c) => {
            const s = (sessions ?? []).find((x) => x.n === c.n);
            return (
              <section key={c.n} className="adm-card">
                <div className="adm-card-head"><h2>{c.title}</h2>{s?.held_on && <Badge tone="ok">Realizada</Badge>}</div>
                <p style={{ marginTop: 0 }}><strong>Llegan con:</strong> {c.brings}<br /><span className="muted">{c.does}</span></p>
                <LabSessionForm
                  waveId={waveId}
                  n={c.n}
                  heldOn={s?.held_on ?? null}
                  notes={s?.notes ?? null}
                  projects={projects.map((p) => ({ id: p.id, title: p.title, members: members(p) }))}
                  entries={(s?.lab_session_entries ?? []) as { project_id: string; attended: boolean | null; note: string | null }[]}
                  readOnly={!canEdit}
                />
              </section>
            );
          })}
        </div>
      )}

      {tab === "proyectos" && (
        <>
          {withoutProject.length > 0 && (
            <section className="adm-card">
              <div className="adm-card-head"><h2>En el Lab sin proyecto</h2><span className="muted">{withoutProject.length}</span></div>
              <p style={{ margin: 0 }}>{withoutProject.map((p) => p.full_name).join(" · ")}</p>
            </section>
          )}
          <div className="lab-board">
            {LAB_STATUS.map((st) => {
              const col = projects.filter((p) => p.status === st.id);
              return (
                <div key={st.id} className="board-col">
                  <div className="board-col-head"><strong>{st.label}</strong><span className="n">{col.length}</span></div>
                  <small className="muted" style={{ padding: "0 6px" }}>{st.hint}</small>
                  {col.map((p) => (
                    <article key={p.id} className="board-card lab-card">
                      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                        <Badge tone={p.mode === "GROUP" ? "brand" : undefined}>{p.mode === "GROUP" ? "Grupal" : "Individual"}</Badge>
                        {p.client_name && <small className="muted">{p.client_name}</small>}
                      </div>
                      <strong>{p.title}</strong>
                      <small>{members(p)}</small>
                      {p.problem && <small className="muted">{p.problem}</small>}
                      {p.hub_notes && <small><em>Hub: {p.hub_notes}</em></small>}
                      <LabFiles projectId={p.id} files={p.lab_project_files} canUpload={canEdit} deleteAll={canEdit} />
                      {canEdit && (
                        <details className="lab-edit">
                          <summary>Editar</summary>
                          <ProjectForm waveId={waveId} people={pickPeople(p)} initial={{ id: p.id, title: p.title, problem: p.problem ?? "", clientName: p.client_name ?? "", mode: p.mode, status: p.status, hubNotes: p.hub_notes ?? "", memberIds: p.lab_project_members.map((m) => m.candidate_id) }} />
                        </details>
                      )}
                    </article>
                  ))}
                </div>
              );
            })}
          </div>
          {canEdit && (
            <section className="adm-card">
              <div className="adm-card-head"><h2>Nuevo proyecto</h2><span className="muted">Individual o grupal: una persona participa en un solo proyecto</span></div>
              <ProjectForm waveId={waveId} people={pickPeople()} initial={{ title: "", problem: "", clientName: "", mode: "INDIVIDUAL", status: "IDEA", hubNotes: "", memberIds: [] }} />
            </section>
          )}
        </>
      )}

      {tab === "showcase" && (
        <section className="adm-card">
          <div className="adm-card-head"><h2>Showcase</h2><span className="muted">Presentaciones descargables y resultado por proyecto</span></div>
          {projects.length === 0 ? <div className="empty"><span>Aún no hay proyectos.</span></div> : (
            <div className="showcase-list">
              {projects.map((p) => (
                <article key={p.id} className="showcase-item">
                  <div className="spread" style={{ gap: 8, flexWrap: "wrap" }}>
                    <div>
                      <strong>{p.title}</strong><br />
                      <small className="muted">{members(p)}{p.client_name ? ` · ${p.client_name}` : ""}</small>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      <Badge tone={labStatusTone(p.status)}>{labStatusLabel(p.status)}</Badge>
                      {p.showcase_decision && <Badge tone="brand">{labDecisionLabel(p.showcase_decision)}</Badge>}
                    </div>
                  </div>
                  <div className="showcase-grid">
                    <LabFiles projectId={p.id} files={p.lab_project_files} canUpload={canEdit} deleteAll={canEdit} />
                    <ShowcaseForm projectId={p.id} date={p.showcase_date} decision={p.showcase_decision} notes={p.showcase_notes} readOnly={!canEdit} />
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {viewer.role === "admin" && <WaveStaffManager waveId={waveId} role="hub" people={staffEmails.map((email) => ({ email, name: staffProfiles?.find((p) => p.email === email)?.full_name ?? null }))} />}
    </div>
  );
}
