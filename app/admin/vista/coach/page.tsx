import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admission/admin-only";
import { supabaseService } from "@/lib/supabase/server";
import { CoachPortal } from "@/components/coach/CoachPortal";

export const metadata = { title: "Ver como AI Coach · Portal AET" };
export const dynamic = "force-dynamic";

export default async function VerCoach({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireAdminPage("/admin/vista");
  const { id } = await searchParams;
  if (!id) notFound();
  const { data: p } = await supabaseService().from("profiles").select("id, full_name, email, role").eq("id", id).maybeSingle();
  if (!p || p.role !== "mentor") notFound();
  return <CoachPortal coachId={p.id} preview={{ label: p.full_name ?? p.email }} />;
}
