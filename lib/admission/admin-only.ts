import "server-only";
import { redirect } from "next/navigation";
import { requireStaffPage, type Viewer } from "./auth";

/** Páginas solo para el admin del proyecto (no Delivery, Hub AI ni AI Coach). */
export async function requireAdminPage(next: string): Promise<Viewer> {
  const v = await requireStaffPage(next);
  if (v.role !== "admin") redirect("/sin-acceso");
  return v;
}
