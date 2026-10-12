import { notFound } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { loadPortalData } from "@/lib/admission/portal-data";
import { CandidatePortal } from "@/components/admission/CandidatePortal";
import { Callout } from "@/components/ui";

export const metadata = { title: "Tu postulación · AI Edge Talent", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PostularTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!isSupabaseConfigured()) return <Callout tone="warn" title="Base de datos no configurada" />;
  if (!/^[a-f0-9]{36}$/.test(token)) notFound();
  const data = await loadPortalData({ token });
  if (!data) notFound();
  return <CandidatePortal data={data} />;
}
