import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseService } from "@/lib/supabase/server";
import { pinStatus } from "@/lib/identity/pin";
import { UsersConsole, type UserRow } from "@/components/identity/UsersConsole";
import { AccessRequests, type RequestRow } from "@/components/identity/AccessRequests";
import { ReminderSettings } from "@/components/identity/ReminderSettings";
import { Kpi } from "@/components/ds/Status";

export const metadata = { title: "Usuarios y accesos · Portal AET" };
export const dynamic = "force-dynamic";

const TABS = [["usuarios", "Usuarios"], ["solicitudes", "Solicitudes de cuenta"], ["config", "Recordatorios"]] as const;

/** Consola central de identidad: cuentas, estados, códigos (sin verlos), Waves, solicitudes y configuración. */
export default async function Usuarios({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "usuarios" } = await searchParams;
  const viewer = await requireStaffPage("/admin/usuarios");
  if (viewer.role !== "admin") redirect("/sin-acceso");
  const svc = supabaseService();
  const now = new Date();

  const [{ data: profiles }, { data: creds }, { data: cands }, { data: staff }, { data: codes }, { data: waves }, { data: reqs }, { data: settings }, authUsers] = await Promise.all([
    svc.from("profiles").select("id, email, full_name, role, status, phone, created_at").order("created_at", { ascending: false }),
    svc.from("user_credentials").select("user_id, pin_hash, pin_set_at, must_change, locked_until, last_login_at"),
    svc.from("candidates").select("id, user_id, corporate_email, wave_id, client_name, status, journey_layer, created_at").order("created_at", { ascending: false }),
    svc.from("wave_staff").select("email, wave_id, role"),
    svc.from("staff_login_codes").select("email, purpose, expires_at, created_at").is("consumed_at", null).gt("expires_at", now.toISOString()),
    svc.from("waves").select("id, name, status").order("created_at", { ascending: false }),
    svc.from("access_requests").select("*").order("created_at", { ascending: false }).limit(200),
    svc.from("app_settings").select("value").eq("key", "reminders").maybeSingle(),
    svc.auth.admin.listUsers({ perPage: 1000 }),
  ]);
  const { data: sent } = tab === "config"
    ? await svc.from("email_messages").select("id, to_email, template, status, error, attempts, created_at, sent_at").in("template", ["PULSE_REMINDER", "DELIVERY_PULSE_ALERT"]).order("created_at", { ascending: false }).limit(50)
    : { data: [] };
  const lastSignIn = new Map((authUsers.data?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]));
  const credOf = new Map((creds ?? []).map((c) => [c.user_id, c]));
  const waveName = (id: string) => (waves ?? []).find((w) => w.id === id)?.name.replace("AI Edge Talent · ", "") ?? id;

  const rows: UserRow[] = (profiles ?? []).map((p) => {
    const c = credOf.get(p.id) ?? null;
    const myCands = (cands ?? []).filter((x) => x.user_id === p.id || x.corporate_email?.toLowerCase() === p.email);
    const myWaves = p.role === "kiber" ? [...new Set(myCands.map((x) => x.wave_id))] : (staff ?? []).filter((s) => s.email === p.email).map((s) => s.wave_id);
    const code = (codes ?? []).filter((k) => k.email === p.email && (k.purpose === "ACTIVATION" || k.purpose === "RESET")).sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    const ps = pinStatus(c ? { pin_hash: c.pin_hash, must_change: c.must_change, locked_until: c.locked_until } : null, now);
    return {
      id: p.id,
      name: p.full_name ?? "",
      email: p.email,
      role: p.role,
      status: p.status,
      phone: p.phone,
      waves: myWaves.map((w) => ({ id: w, name: waveName(w) })),
      client: myCands[0]?.client_name ?? null,
      pin: ps.key,
      pinLabel: ps.label,
      pinSetAt: c?.pin_set_at ?? null,
      lockedUntil: c?.locked_until && new Date(c.locked_until) > now ? c.locked_until : null,
      tempCode: code ? { purpose: code.purpose, expiresAt: code.expires_at } : null,
      lastAccess: c?.last_login_at ?? lastSignIn.get(p.id) ?? null,
      createdAt: p.created_at,
    };
  });

  const k = {
    active: rows.filter((r) => r.status === "ACTIVE").length,
    pending: rows.filter((r) => r.status === "PENDING" || (r.status === "ACTIVE" && r.pin === "PENDING" && !r.lastAccess)).length,
    paused: rows.filter((r) => r.status === "PAUSED").length,
    blocked: rows.filter((r) => r.lockedUntil || r.status === "REVOKED").length,
    invites: rows.filter((r) => r.tempCode).length,
    requests: (reqs ?? []).filter((r) => r.status === "PENDING").length,
  };

  return (
    <div className="stack">
      <div>
        <div className="eyebrow">Administración</div>
        <h1 style={{ margin: 0 }}>Usuarios y accesos</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>Profesionales, Delivery y equipo en un solo lugar. Puedes restablecer cualquier acceso sin conocer los códigos personales: nunca se guardan ni se muestran.</p>
      </div>
      <div className="kpi-grid">
        <Kpi label="Activos" value={k.active} />
        <Kpi label="Pendientes de activación" value={k.pending} />
        <Kpi label="Pausados" value={k.paused} />
        <Kpi label="Bloqueados o revocados" value={k.blocked} />
        <Kpi label="Invitaciones vigentes" value={k.invites} hint="Códigos temporales sin usar" />
        <Kpi label="Solicitudes de cuenta" value={k.requests} hint={k.requests ? "Requieren tu decisión" : "Sin pendientes"} />
      </div>
      <nav className="row" aria-label="Secciones">
        {TABS.map(([key, label]) => <Link key={key} href={`?tab=${key}`} className={`btn small ${tab === key ? "" : "ghost"}`}>{label}{key === "solicitudes" && k.requests ? ` · ${k.requests}` : ""}</Link>)}
      </nav>
      {tab === "usuarios" && <UsersConsole rows={rows} waves={(waves ?? []).map((w) => ({ id: w.id, name: w.name.replace("AI Edge Talent · ", ""), status: w.status }))} myId={viewer.id} />}
      {tab === "solicitudes" && (
        <AccessRequests
          rows={(reqs ?? []) as RequestRow[]}
          candidatesByEmail={Object.fromEntries((reqs ?? []).map((r) => [r.email, (cands ?? []).filter((c) => c.corporate_email?.toLowerCase() === r.email).map((c) => ({ id: c.id, label: `${waveName(c.wave_id)} · ${c.status}${c.journey_layer ? ` · ${c.journey_layer}` : ""}` }))]))}
          existing={Object.fromEntries((reqs ?? []).map((r) => [r.email, rows.find((x) => x.email === r.email)?.status ?? null]))}
        />
      )}
      {tab === "config" && (
        <>
          <ReminderSettings value={(settings?.value as { every_days: number; max: number; delivery_after_days: number }) ?? { every_days: 3, max: 3, delivery_after_days: 5 }} />
          <section className="card" aria-labelledby="hist-t">
            <h2 id="hist-t" style={{ marginTop: 0 }}>Historial de envíos</h2>
            <p className="muted" style={{ marginTop: 0 }}>Recordatorios a profesionales y avisos a Delivery. «Enviado» significa aceptado por el proveedor de correo; no confirma que se haya leído.</p>
            {!sent?.length ? <p className="muted">Aún no hay envíos.</p> : (
              <div className="table-wrap" tabIndex={0}>
                <table className="rtable">
                  <thead><tr><th>Fecha</th><th>Tipo</th><th>Destinatario</th><th>Estado</th></tr></thead>
                  <tbody>
                    {sent.map((m) => (
                      <tr key={m.id}>
                        <td data-label="Fecha">{new Date(m.created_at).toLocaleString("es-CL", { timeZone: "America/Santiago", dateStyle: "short", timeStyle: "short" })}</td>
                        <td data-label="Tipo">{m.template === "PULSE_REMINDER" ? "Recordatorio de pulso" : "Aviso a Delivery"}</td>
                        <td data-label="Destinatario">{m.to_email}</td>
                        <td data-label="Estado"><span className={`ds-status s-${m.status === "sent" ? "done" : m.status === "failed" ? "blocked" : "pending"}`}>{m.status === "sent" ? "Enviado" : m.status === "failed" ? `Falló${m.attempts > 1 ? ` (${m.attempts} intentos)` : ""}` : "En cola"}</span>{m.error && <><br /><small className="muted">{m.error}</small></>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
