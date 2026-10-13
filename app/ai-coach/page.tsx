import { redirect } from "next/navigation";
import { getViewer } from "@/lib/admission/auth";
import { CoachPortal } from "@/components/coach/CoachPortal";

export const metadata = { title: "AI Coach · AI Edge Talent" };
export const dynamic = "force-dynamic";

export default async function MentorPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/ai-coach");
  if (viewer.role !== "mentor") redirect("/inicio");
  return <CoachPortal coachId={viewer.id} />;
}
