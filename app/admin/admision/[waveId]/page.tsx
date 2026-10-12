import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { listCandidates } from "@/lib/admission/queries";
import { CandidateTable } from "@/components/admission/CandidateTable";
import { CandidateBoard } from "@/components/admission/CandidateBoard";
import { fmtDeadline } from "@/components/ui";
import { Icon } from "@/components/site/Icon";
import { ApplyLink } from "@/components/admin/ApplyLink";
import { env } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function WaveAdmission({ params, searchParams }: { params: Promise<{ waveId: string }>; searchParams: Promise<{ vista?: string; estado?: string }> }) {
  const { waveId } = await params;
  const { vista, estado } = await searchParams;
  const board = vista === "columnas";
  const viewer = await requireStaffPage(`/admin/admision/${waveId}`);
  const db = await supabaseUser();
  const { data: wave } = await db.from("waves").select("id, name, application_deadline").eq("id", waveId).single();
  if (!wave) notFound();
  const candidates = await listCandidates(waveId);
  return (
    <div className="stack">
      <div className="spread">
        <div>
          <div className="eyebrow">Admisión · {wave.name}</div>
          <h1 style={{ margin: 0 }}>Candidatos <span className="muted" style={{ fontWeight: 600 }}>{candidates.length}</span></h1>
          {wave.application_deadline && <p className="muted" style={{ margin: "4px 0 0" }}>Cierre: {fmtDeadline(wave.application_deadline)}</p>}
        </div>
        <div className="row">
          <nav className="view-toggle" aria-label="Vista">
            <Link href={`/admin/admision/${waveId}`} aria-current={!board}><Icon name="list" size={16} /> Lista</Link>
            <Link href={`/admin/admision/${waveId}?vista=columnas`} aria-current={board}><Icon name="kanban" size={16} /> Columnas</Link>
          </nav>
          {viewer.role === "admin" && <a className="btn small" href={`/admin/admision/${waveId}/exportar`} download>Descargar Excel</a>}
        </div>
      </div>
      <ApplyLink url={`${env.appUrl}/postular/registro?wave=${waveId}`} />
      {board ? (
        <CandidateBoard waveId={waveId} candidates={candidates} isAdmin={viewer.role === "admin"} />
      ) : (
        <CandidateTable waveId={waveId} candidates={candidates} isAdmin={viewer.role === "admin"} initialStatus={estado ?? ""} />
      )}
    </div>
  );
}
