import "@/app/mi-journey/journey.css";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admission/admin-only";
import { journeyForCandidate } from "@/lib/journey/queries";
import { buildJourneyView } from "@/lib/journey/view";
import { JourneyApp } from "@/components/journey/path/JourneyApp";

export const metadata = { title: "Ver como profesional · Portal AET" };
export const dynamic = "force-dynamic";

export default async function VerProfesional({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const viewer = await requireAdminPage("/admin/vista");
  const { id } = await searchParams;
  if (!id) notFound();
  const j = await journeyForCandidate(id);
  if (!j) notFound();
  const view = await buildJourneyView(j, viewer.id, { label: j.candidate.full_name });
  return <JourneyApp v={view} />;
}
