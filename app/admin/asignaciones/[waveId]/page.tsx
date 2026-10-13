import { notFound, redirect } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseService } from "@/lib/supabase/server";
import { AssignmentsBoard, type ProRow, type DeliveryRow } from "@/components/identity/AssignmentsBoard";
import { Kpi } from "@/components/ds/Status";

export const metadata = { title: "Equipo de la Wave · Portal AET" };
export const dynamic = "force-dynamic";

const IN_WAVE = ["SELECTED", "CONDITIONS_PENDING", "CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"];

/** Equipo de la Wave: qué Delivery acompaña a qué profesional, con alertas de cobertura y de ingreso. */
export default async function Asignaciones({ params }: { params: Promise<{ waveId: string }> }) {
  const { waveId } = await params;
  const v = await requireStaffPage(`/admin/asignaciones/${waveId}`);
  if (v.role !== "admin") redirect("/sin-acceso");
  const svc = supabaseService();
  const { data: wave } = await svc.from("waves").select("id, name").eq("id", waveId).single();
  if (!wave) notFound();
  const [{ data: cands }, { data: staff }, { data: assigns }, { data: deliveries }, authUsers] = await Promise.all([
    svc.from("candidates").select("id, full_name, client_name, role_title, status, journey_layer").eq("wave_id", waveId).in("status", IN_WAVE).order("full_name"),
    svc.from("wave_staff").select("email").eq("wave_id", waveId).eq("role", "delivery"),
    svc.from("delivery_assignments").select("candidate_id, delivery_email").eq("wave_id", waveId),
    svc.from("profiles").select("id, email, full_name, status").eq("role", "delivery").order("full_name"),
    svc.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const signIn = new Map((authUsers.data?.users ?? []).map((u) => [u.email?.toLowerCase(), u.last_sign_in_at ?? null]));
  const inWave = new Set((staff ?? []).map((s) => s.email));
  const assigned = new Map((assigns ?? []).map((a) => [a.candidate_id, a.delivery_email]));

  const pros: ProRow[] = (cands ?? []).map((c) => ({ id: c.id, name: c.full_name, client: c.client_name, role: c.role_title, layer: c.journey_layer, status: c.status, delivery: assigned.get(c.id) ?? null }));
  const team: DeliveryRow[] = (deliveries ?? []).filter((d) => inWave.has(d.email)).map((d) => ({
    email: d.email, name: d.full_name ?? d.email, status: d.status, lastSignIn: signIn.get(d.email) ?? null,
    count: pros.filter((p) => p.delivery === d.email).length,
  }));
  const k = {
    unassigned: pros.filter((p) => !p.delivery).length,
    idle: team.filter((d) => d.count === 0).length,
    neverIn: team.filter((d) => !d.lastSignIn).length,
  };
  return (
    <div className="stack">
      <div>
        <div className="eyebrow">{wave.name}</div>
        <h1 style={{ margin: 0 }}>Equipo de la Wave</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>Cada profesional debe tener un Delivery responsable y cada Delivery de la Wave, profesionales a cargo.</p>
      </div>
      <div className="kpi-grid">
        <Kpi label="Profesionales" value={pros.length} hint="Seleccionados e inscritos" />
        <Kpi label="Delivery en la Wave" value={team.length} />
        <Kpi label="Sin Delivery asignado" value={k.unassigned} hint={k.unassigned ? "Asígnalos abajo" : "Todos cubiertos"} />
        <Kpi label="Delivery sin profesionales" value={k.idle} />
        <Kpi label="Delivery que no han ingresado" value={k.neverIn} />
      </div>
      <AssignmentsBoard waveId={waveId} pros={pros} team={team} allDeliveries={(deliveries ?? []).filter((d) => d.status !== "DELETED" && d.status !== "REVOKED").map((d) => ({ email: d.email, name: d.full_name ?? d.email }))} />
    </div>
  );
}
