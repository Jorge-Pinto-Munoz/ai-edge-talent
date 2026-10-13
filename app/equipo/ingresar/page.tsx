import { redirect } from "next/navigation";
import { getViewer } from "@/lib/admission/auth";
import { StaffLogin } from "@/components/staff/StaffLogin";

export const metadata = { title: "Ingreso equipo · AI Edge Talent" };
export const dynamic = "force-dynamic";

export default async function IngresoEquipo({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/equipo";
  const v = await getViewer();
  if (v && (v.role === "delivery" || v.role === "admin")) redirect(safe);
  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-mark" aria-hidden="true"><img src="/brand/kibernum-blanco.svg" alt="" /></div>
        <div className="eyebrow">Área de equipo · Delivery</div>
        <h1>Ingresa con tu correo corporativo</h1>
        <p className="muted">Te enviamos un código de 4 dígitos. Solo las cuentas autorizadas de Kibernum pueden ingresar.</p>
        {v && <p className="auth-warn" role="note">Tu sesión actual ({v.email}) no tiene acceso al área de equipo. Ingresa con una cuenta autorizada.</p>}
        <StaffLogin next={safe} />
        <p className="auth-foot">Registramos tus ingresos y las secciones del área de equipo que consultas, solo para auditoría. Se conservan 180 días.</p>
      </div>
    </section>
  );
}
