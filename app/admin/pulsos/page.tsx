import { redirect } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Entra al informe de la Wave más reciente. */
export default async function PulsosIndex() {
  await requireStaffPage("/admin/pulsos");
  const db = await supabaseUser();
  const { data } = await db.from("waves").select("id, status").order("created_at", { ascending: false });
  const first = (data ?? []).find((w) => w.status !== "CLOSED") ?? data?.[0];
  redirect(first ? `/admin/pulsos/${first.id}` : "/admin");
}
