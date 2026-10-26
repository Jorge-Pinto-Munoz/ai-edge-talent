import { notFound, redirect } from "next/navigation";
import { getViewer } from "@/lib/admission/auth";
import { myJourney } from "@/lib/journey/queries";

export const dynamic = "force-dynamic";

/** Las cápsulas se despliegan como módulos dentro de Mi journey; este enlace (correos, marcadores) lleva al módulo. */
export default async function CapsulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/ingresar?next=/mi-journey/capsula/${id}`);
  const j = await myJourney(viewer.id);
  if (!j || !j.capsules.some((x) => x.id === id)) notFound();
  redirect(`/mi-journey?m=${id}`);
}
