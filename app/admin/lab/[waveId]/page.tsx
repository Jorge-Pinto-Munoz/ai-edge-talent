import { redirect } from "next/navigation";
import { requireAnyRolePage } from "@/lib/admission/auth";
import { LabWorkspace } from "@/components/hub/LabWorkspace";

export const metadata = { title: "AI Lab & Showcase · Portal AET" };
export const dynamic = "force-dynamic";

/** Espacio del Líder Hub AI. Admin y Delivery lo ven dentro de Journey → AI Lab & Showcase (salvo en Ver como). */
export default async function LabWave({ params, searchParams }: { params: Promise<{ waveId: string }>; searchParams: Promise<{ tab?: string; como?: string }> }) {
  const { waveId } = await params;
  const { tab, como } = await searchParams;
  const real = await requireAnyRolePage(`/admin/lab/${waveId}`, ["admin", "delivery", "hub"]);
  if (real.role !== "hub" && !como) redirect(`/admin/journey/${waveId}/ai-lab${tab ? `?tab=${tab}` : ""}`);
  return <LabWorkspace waveId={waveId} tab={tab} real={real} como={como} base={`/admin/lab/${waveId}?`} />;
}
