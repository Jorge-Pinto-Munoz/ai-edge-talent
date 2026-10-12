import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admission/admin-only";
import { loadPortalData } from "@/lib/admission/portal-data";
import { CandidatePortal } from "@/components/admission/CandidatePortal";

export const metadata = { title: "Ver como candidato · Portal AET" };
export const dynamic = "force-dynamic";

export default async function VerCandidato({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireAdminPage("/admin/vista");
  const { id } = await searchParams;
  if (!id) notFound();
  const data = await loadPortalData({ candidateId: id });
  if (!data) notFound();
  return (
    <div className="stack">
      <div className="jr-preview" role="note"><span><strong>Vista de admin</strong> · así ve su enlace personal {data.candidate.fullName}. Los envíos están desactivados.</span></div>
      <fieldset className="preview-lock" disabled>
        <CandidatePortal data={data} />
      </fieldset>
    </div>
  );
}
