import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { AccessForm } from "@/components/admission/AccessForm";

export const dynamic = "force-dynamic";

export default async function Accesos() {
  const viewer = await requireStaffPage("/admin/accesos");
  if (viewer.role !== "admin") redirect("/sin-acceso");
  const db = await supabaseUser();
  const [{ data: grants }, { data: waves }, { data: staff }] = await Promise.all([
    db.from("role_grants").select("*").order("granted_at", { ascending: false }),
    db.from("waves").select("id, name").order("created_at", { ascending: false }),
    db.from("wave_staff").select("email, role, wave_id"),
  ]);
  const wavesOf = (email: string) => (staff ?? []).filter((s) => s.email === email).map((s) => s.wave_id).join(", ");
  return (
    <div className="stack narrow">
      <div className="eyebrow"><Link href="/admin/admision">← Admisión</Link></div>
      <h1>Accesos</h1>
      <p className="muted">Asigna el rol antes de que la persona ingrese por primera vez (o cámbialo después). Quien ingresa sin rol asignado queda como Kiber. Profesor y Líder Hub AI se asignan a una Wave (también desde Cierre semanal y AI Lab & Showcase).</p>
      <AccessForm waves={waves ?? []} />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Correo</th><th>Rol</th><th>Cliente / Wave</th></tr></thead>
          <tbody>{(grants ?? []).map((g) => <tr key={g.email}><td>{g.email}</td><td>{g.role}</td><td>{g.client_name ?? (wavesOf(g.email) || "—")}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
