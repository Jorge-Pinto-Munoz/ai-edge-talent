import { redirect } from "next/navigation";
import { getViewer } from "@/lib/admission/auth";

export const dynamic = "force-dynamic";

/** Después del login, cada rol aterriza en su portal. */
export default async function Inicio() {
  const v = await getViewer();
  if (!v) redirect("/ingresar?next=/inicio");
  const home = { admin: "/admin", delivery: "/equipo", bp: "/equipo", mentor: "/ai-coach", client: "/cliente", kiber: "/mi-journey", profesor: "/admin/profesor", hub: "/admin/lab" }[v.role];
  redirect(home);
}
