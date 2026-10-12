import { redirect } from "next/navigation";
import { getViewer } from "@/lib/admission/auth";

export const dynamic = "force-dynamic";

/** Después del login, cada rol aterriza en su portal. */
export default async function Inicio() {
  const v = await getViewer();
  if (!v) redirect("/login?next=/inicio");
  const home = { admin: "/admin/admision", delivery: "/admin/admision", mentor: "/mentor", client: "/cliente", kiber: "/mi-journey" }[v.role];
  redirect(home);
}
