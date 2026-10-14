import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admission/admin-only";
import { supabaseService } from "@/lib/supabase/server";
import { TeamHome } from "@/components/staff/TeamHome";
import { ROLE_LABEL } from "@/lib/identity/roles";

export const metadata = { title: "Ver como Delivery · Portal AET" };
export const dynamic = "force-dynamic";

/** Inicio de Delivery (o Business Partner) exactamente como lo ve esa persona, en solo lectura. */
export default async function VerDelivery({ searchParams }: { searchParams: Promise<{ id?: string; wave?: string }> }) {
  await requireAdminPage("/admin/vista");
  const { id, wave } = await searchParams;
  if (!id) notFound();
  const { data: p } = await supabaseService().from("profiles").select("id, full_name, email, role").eq("id", id).maybeSingle();
  if (!p || (p.role !== "delivery" && p.role !== "bp")) notFound();
  const name = p.full_name ?? p.email;
  return (
    <div className="stack">
      <div className="jr-preview" role="note"><span><strong>Vista de admin</strong> · así ve su inicio {name} ({ROLE_LABEL[p.role]}). Solo lectura.</span></div>
      <TeamHome viewer={{ role: p.role, email: p.email, fullName: p.full_name }} wave={wave} preview={{ pickerHref: `/admin/vista/delivery?id=${p.id}&` }} />
    </div>
  );
}
