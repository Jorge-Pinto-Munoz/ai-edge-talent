import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { AccessForm } from "@/components/admission/AccessForm";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = { admin: "Admin", delivery: "Delivery", client: "Cliente", kiber: "Profesional", mentor: "AI Coach", profesor: "Profesor", hub: "Líder Hub AI" };
const fmtDT = (iso: string | null) => (iso ? new Date(iso).toLocaleString("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const dur = (a: string, b: string) => {
  const m = Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));
  return m < 1 ? "< 1 min" : m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${m % 60} min`;
};

export default async function Accesos({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "roles" } = await searchParams;
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
      <nav className="row" aria-label="Secciones">
        <Link href="?tab=roles" className={`btn small ${tab === "roles" ? "" : "ghost"}`}>Roles</Link>
        <Link href="?tab=registro" className={`btn small ${tab === "registro" ? "" : "ghost"}`}>Registro de ingresos del equipo</Link>
      </nav>
      {tab === "registro" ? await Registro() : (<>
      <p className="muted">Asigna el rol antes de que la persona ingrese por primera vez (o cámbialo después). Quien ingresa sin rol asignado queda como Kiber. Profesor y Líder Hub AI se asignan a una Wave (también desde Cierre semanal y AI Lab & Showcase).</p>
      <AccessForm waves={waves ?? []} />
      <div className="table-wrap" tabIndex={0}>
        <table>
          <thead><tr><th>Correo</th><th>Rol</th><th>Cliente / Wave</th></tr></thead>
          <tbody>{(grants ?? []).map((g) => <tr key={g.email}><td>{g.email}</td><td>{ROLE_LABEL[g.role] ?? g.role}</td><td>{g.client_name ?? (wavesOf(g.email) || "—")}</td></tr>)}</tbody>
        </table>
      </div>
      </>)}
    </div>
  );
}

/** Registro de ingresos del área de equipo: quién, cuándo, cuánto duró y qué consultó. Retención: 180 días. */
async function Registro() {
  const db = await supabaseUser();
  await db.rpc("purge_access_logs");
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: sessions } = await db.from("access_sessions").select("id, email, role, method, started_at, last_seen_at, ended_at, access_events(path)").gte("started_at", since).order("started_at", { ascending: false }).limit(200);
  const rows = sessions ?? [];
  const week = rows.filter((r) => r.started_at >= new Date(Date.now() - 7 * 86_400_000).toISOString());
  const people = new Set(week.map((r) => r.email)).size;
  const lastBy = new Map<string, string>();
  for (const r of rows) if (!lastBy.has(r.email) || r.last_seen_at > lastBy.get(r.email)!) lastBy.set(r.email, r.last_seen_at);
  return (
    <>
      <p className="muted">Ingresos de Delivery y admin al área de equipo de los últimos 30 días. Se conservan 180 días y solo el admin los ve. Las personas están informadas en la pantalla de ingreso.</p>
      <div className="team-kpis">
        <div className="ds-kpi"><span className="ds-kpi-label">Ingresos (7 días)</span><strong>{week.length}</strong></div>
        <div className="ds-kpi"><span className="ds-kpi-label">Personas (7 días)</span><strong>{people}</strong></div>
        <div className="ds-kpi"><span className="ds-kpi-label">Último acceso</span><strong style={{ fontSize: "1.1rem" }}>{rows[0] ? fmtDT(rows[0].last_seen_at) : "—"}</strong></div>
      </div>
      {rows.length === 0 ? <p className="help-none">Aún no hay ingresos registrados.</p> : (
        <div className="table-wrap" tabIndex={0}>
          <table className="rtable">
            <thead><tr><th>Persona</th><th>Ingreso</th><th>Último acceso</th><th>Duración</th><th>Secciones</th></tr></thead>
            <tbody>
              {rows.map((r) => {
                const paths = [...new Set(((r.access_events ?? []) as { path: string }[]).map((e) => e.path))];
                return (
                  <tr key={r.id}>
                    <td className="rt-title">{r.email}<br /><small className="muted">{ROLE_LABEL[r.role] ?? r.role} · {r.method === "CODE" ? "con código" : "con enlace"}</small></td>
                    <td data-label="Ingreso">{fmtDT(r.started_at)}</td>
                    <td data-label="Último acceso">{fmtDT(r.last_seen_at)}{r.ended_at ? <><br /><small className="muted">Salió {fmtDT(r.ended_at)}</small></> : null}</td>
                    <td data-label="Duración">≈ {dur(r.started_at, r.ended_at ?? r.last_seen_at)}</td>
                    <td data-label="Secciones"><small>{paths.join(" · ") || "—"}</small></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
