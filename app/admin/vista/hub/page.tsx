import { notFound, redirect } from "next/navigation";
import { requireAdminPage } from "@/lib/admission/admin-only";
import { supabaseService } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Abre el AI Lab & Showcase como lo ve ese Líder Hub AI: su primera Wave asignada, en solo lectura. */
export default async function VerHub({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  await requireAdminPage("/admin/vista");
  const { id } = await searchParams;
  if (!id) notFound();
  const svc = supabaseService();
  const { data: p } = await svc.from("profiles").select("id, email, role").eq("id", id).maybeSingle();
  if (!p || p.role !== "hub") notFound();
  const { data: ws } = await svc.from("wave_staff").select("wave_id").eq("email", p.email).eq("role", "hub");
  const waves = (ws ?? []).map((w) => w.wave_id).sort((a, b) => Number(b.match(/\d+/)?.[0] ?? 0) - Number(a.match(/\d+/)?.[0] ?? 0));
  redirect(`/admin/lab/${waves[0] ?? "sin-wave"}?como=${p.id}`);
}
