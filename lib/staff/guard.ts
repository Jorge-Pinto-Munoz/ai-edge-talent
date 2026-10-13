import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getViewer, type Viewer } from "@/lib/admission/auth";
import { trackStaffAccess } from "./audit";

/**
 * Área de equipo (Delivery y admin): se valida en el servidor en cada página. Sin sesión → ingreso con código;
 * con sesión de otro rol → sin acceso. Cada visita queda en el registro de accesos.
 */
export async function requireTeamPage(path: string): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect(`/ingresar?next=${encodeURIComponent(path)}`);
  if (v.role !== "delivery" && v.role !== "admin") redirect("/sin-acceso");
  await trackStaffAccess(v, path, (await headers()).get("user-agent")?.slice(0, 300) ?? null);
  return v;
}
