import { redirect } from "next/navigation";
import { myStaffWaves, requireAnyRolePage } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Entra a la Wave más reciente que corresponda al rol. */
export default async function ProfesorIndex() {
  const viewer = await requireAnyRolePage("/admin/lab", ["admin", "delivery", "hub"]);
  const db = await supabaseUser();
  const mine = viewer.role === "hub" ? await myStaffWaves(viewer) : null;
  const { data } = await db.from("waves").select("id, status").order("created_at", { ascending: false });
  const waves = (data ?? []).filter((w) => !mine || mine.includes(w.id));
  const first = waves.find((w) => w.status !== "CLOSED") ?? waves[0];
  if (!first) redirect("/admin/lab/sin-wave");
  redirect(`/admin/lab/${first.id}`);
}
