import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { listCandidates } from "@/lib/admission/queries";
import { CandidateTable } from "@/components/admission/CandidateTable";
import { fmtDeadline } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function WaveAdmission({ params }: { params: Promise<{ waveId: string }> }) {
  const { waveId } = await params;
  const viewer = await requireStaffPage(`/admin/admision/${waveId}`);
  const db = await supabaseUser();
  const { data: wave } = await db.from("waves").select("id, name, application_deadline").eq("id", waveId).single();
  if (!wave) notFound();
  const candidates = await listCandidates(waveId);
  return (
    <div className="stack">
      <div className="spread">
        <div>
          <div className="eyebrow"><Link href="/admin/admision">Admisión</Link> · {wave.name}</div>
          <h1 style={{ margin: 0 }}>Candidatos</h1>
          {wave.application_deadline && <p className="muted" style={{ margin: "4px 0 0" }}>Deadline: {fmtDeadline(wave.application_deadline)}</p>}
        </div>
        <Link className="btn secondary" href={`/admin/admision/${waveId}/importar`}>Importar base</Link>
      </div>
      <CandidateTable waveId={waveId} candidates={candidates} isAdmin={viewer.role === "admin"} />
    </div>
  );
}
