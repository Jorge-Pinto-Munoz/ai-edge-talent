import { notFound, redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/admission/admin-only";
import { supabaseService } from "@/lib/supabase/server";
import { inJourney } from "@/lib/admission/view-as";

export const dynamic = "force-dynamic";

/** Profesional: si ya está inscrito ve su journey; si no, su postulación. */
export default async function VerPersona({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireAdminPage("/admin/vista");
  const { id } = await searchParams;
  if (!id) notFound();
  const { data: c } = await supabaseService().from("candidates").select("id, status").eq("id", id).maybeSingle();
  if (!c) notFound();
  redirect(`/admin/vista/${inJourney(c.status) ? "profesional" : "candidato"}?id=${c.id}`);
}
