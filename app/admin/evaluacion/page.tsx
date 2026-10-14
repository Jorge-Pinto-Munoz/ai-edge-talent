import { redirect } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { currentWaveId } from "@/lib/waves/current";

export const metadata = { title: "Cómo evaluamos · Portal AET" };
export const dynamic = "force-dynamic";

/** Ruta histórica: los criterios viven en Journey → Assessment → Criterios de evaluación. */
export default async function Evaluacion() {
  const viewer = await requireStaffPage("/admin/evaluacion");
  if (viewer.role !== "admin") redirect("/sin-acceso");
  redirect(`/admin/journey/${await currentWaveId()}/assessment?tab=criterios`);
}
