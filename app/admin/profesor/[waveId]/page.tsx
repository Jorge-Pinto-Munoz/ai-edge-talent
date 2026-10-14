import { redirect } from "next/navigation";
import { requireAnyRolePage } from "@/lib/admission/auth";
import { ClassesWorkspace } from "@/components/teacher/ClassesWorkspace";

export const metadata = { title: "Clases · Portal AET" };
export const dynamic = "force-dynamic";

/** Ruta histórica: las clases ahora viven en Journey (son transversales a las etapas formativas). */
export default async function ProfesorWave({ params, searchParams }: { params: Promise<{ waveId: string }>; searchParams: Promise<{ clase?: string }> }) {
  const { waveId } = await params;
  const { clase } = await searchParams;
  const viewer = await requireAnyRolePage(`/admin/profesor/${waveId}`, ["admin", "delivery", "profesor"]);
  if (viewer.role !== "profesor") redirect(`/admin/journey/${waveId}?vista=clases${clase ? `&clase=${clase}` : ""}`);
  return <ClassesWorkspace waveId={waveId} clase={clase} viewer={viewer} base={`/admin/profesor/${waveId}?`} />;
}
