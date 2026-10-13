import { redirect } from "next/navigation";
import { getViewer } from "@/lib/admission/auth";
import { HOME_BY_ROLE } from "@/lib/identity/service";
import { IdentityFlow, type FlowMode } from "@/components/identity/IdentityFlow";

export const metadata = { title: "Ingresar · AI Edge Talent" };
export const dynamic = "force-dynamic";

const MODES: FlowMode[] = ["ingresar", "activar", "restablecer", "especial"];

/** Ingreso unificado (profesionales, Delivery, clientes y equipo): correo + código personal de 4 dígitos. */
export default async function Ingresar({ searchParams }: { searchParams: Promise<{ modo?: string; email?: string; next?: string }> }) {
  const sp = await searchParams;
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : undefined;
  const v = await getViewer();
  if (v && sp.modo !== "especial") redirect(next ?? HOME_BY_ROLE[v.role] ?? "/inicio");
  const mode = MODES.includes(sp.modo as FlowMode) ? (sp.modo as FlowMode) : "ingresar";
  return (
    <section className="auth-page">
      <div className="auth-card">
        <div className="auth-mark" aria-hidden="true"><img src="/brand/kibernum-blanco.svg" alt="" /></div>
        <IdentityFlow initialMode={mode} initialEmail={sp.email ?? ""} next={next} />
        <p className="auth-foot">Registramos los ingresos para tu seguridad. En el área de equipo también registramos las secciones consultadas (180 días).</p>
      </div>
    </section>
  );
}
