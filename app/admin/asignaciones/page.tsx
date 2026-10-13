import { redirect } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AsignacionesIndex() {
  const v = await requireStaffPage("/admin/asignaciones");
  if (v.role !== "admin") redirect("/sin-acceso");
  const { data } = await (await supabaseUser()).from("waves").select("id, status").order("created_at", { ascending: false });
  const first = (data ?? []).find((w) => w.status !== "CLOSED") ?? data?.[0];
  redirect(first ? `/admin/asignaciones/${first.id}` : "/admin");
}
