import { redirect } from "next/navigation";
import { getViewer } from "@/lib/admission/auth";
import { ClientPortal } from "@/components/client/ClientPortal";

export const metadata = { title: "Cliente · AI Edge Talent" };
export const dynamic = "force-dynamic";

export default async function ClientePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/ingresar?next=/cliente");
  if (viewer.role !== "client" && viewer.role !== "admin" && viewer.role !== "delivery") redirect("/inicio");
  return <ClientPortal />;
}
