import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { listCandidates } from "@/lib/admission/queries";
import { admissionCounts } from "@/lib/admission/phases";
import { waveReference } from "@/lib/waves/reference";
import { CandidateTable } from "@/components/admission/CandidateTable";
import { chipFromParams } from "@/lib/admission/queue";
import { CandidateBoard } from "@/components/admission/CandidateBoard";
import { CapacityMeter } from "@/components/admission/CapacityMeter";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { fmtDeadline } from "@/components/ui";
import { Icon, type IconName } from "@/components/site/Icon";
import { ApplyLink } from "@/components/admin/ApplyLink";
import { env } from "@/lib/supabase/env";

export const metadata = { title: "Admisión · Portal AET" };
export const dynamic = "force-dynamic";

/** Admisión de una Wave: indicadores, referencia de selección, flujo por fases y gestión de candidatos. */
export default async function WaveAdmission({ params, searchParams }: { params: Promise<{ waveId: string }>; searchParams: Promise<{ vista?: string; estado?: string; filtro?: string }> }) {
  const { waveId } = await params;
  const { vista, estado, filtro } = await searchParams;
  const board = vista === "columnas";
  const viewer = await requireStaffPage(`/admin/admision/${waveId}`);
  const isAdmin = viewer.role === "admin";
  const db = await supabaseUser();
  const { data: wave } = await db.from("waves").select("id, name, application_deadline").eq("id", waveId).single();
  if (!wave) notFound();
  const [candidates, reference] = await Promise.all([listCandidates(waveId), waveReference(waveId)]);
  const k = admissionCounts(candidates.map((c) => c.status));
  const open = wave.application_deadline && new Date(wave.application_deadline).getTime() > Date.now();

  const kpis: { label: string; value: number; hint: string; icon: IconName }[] = [
    { label: "Postulaciones recibidas", value: k.submitted, hint: k.started ? `${k.started} más la están completando` : "Sin postulaciones a medio camino", icon: "send" },
    { label: "Assessment evaluados", value: k.evaluated, hint: k.assessmentPending ? `${k.assessmentPending} por evaluar` : "Ninguno por evaluar", icon: "target" },
    { label: "Decisiones pendientes", value: k.decisionPending, hint: k.decisionPending ? "Esperan tu decisión" : "Al día", icon: "alert" },
    { label: "Seleccionados", value: k.selected, hint: `${k.enrolled} inscritos · ${k.enrollPending} por inscribirse`, icon: "check" },
  ];

  return (
    <div className="adm">
      <Breadcrumbs items={[{ label: wave.name.replace("AI Edge Talent · ", ""), href: `/admin?wave=${waveId}` }, { label: "Admisión" }]} />
      <header className="adm-head">
        <div>
          <h1>Admisión</h1>
          <p className="muted">
            {k.total === 1 ? "1 candidato" : `${k.total} candidatos`} en la Wave{wave.application_deadline ? ` · ${open ? "cierra" : "cerró"} ${fmtDeadline(wave.application_deadline)}` : ""}. No hay límite de postulaciones.
          </p>
        </div>
        <div className="row">
          <nav className="view-toggle" aria-label="Vista">
            <Link href={`/admin/admision/${waveId}`} aria-current={!board}><Icon name="list" size={16} /> Lista</Link>
            <Link href={`/admin/admision/${waveId}?vista=columnas`} aria-current={board}><Icon name="kanban" size={16} /> Columnas</Link>
          </nav>
          {isAdmin && <a className="btn small" href={`/admin/admision/${waveId}/exportar`} download>Descargar Excel</a>}
        </div>
      </header>

      {(!wave.application_deadline || open) && <ApplyLink url={`${env.appUrl}/postular/registro?wave=${waveId}`} />}

      <section className="adm-kpis" aria-label="Indicadores de admisión">
        {kpis.map((x) => (
          <div key={x.label} className="adm-kpi">
            <span className="ico"><Icon name={x.icon} size={20} /></span>
            <strong>{x.value}</strong>
            <small>{x.label}</small>
            <span className="adm-kpi-hint">{x.hint}</span>
          </div>
        ))}
      </section>

      <CapacityMeter waveId={waveId} selected={k.selected} received={k.submitted} reference={reference} canEdit={isAdmin} />

      {board ? (
        <CandidateBoard waveId={waveId} candidates={candidates} isAdmin={isAdmin} />
      ) : (
        <CandidateTable waveId={waveId} candidates={candidates} isAdmin={isAdmin} initialChip={chipFromParams(filtro, estado)} />
      )}
    </div>
  );
}
