import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties } from "react";
import { requireStaffPage } from "@/lib/admission/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { supabaseUser } from "@/lib/supabase/server";
import { waveDashboard } from "@/lib/admin/dashboard";
import { ADMISSION_LABEL, WAVE_STATUS_LABEL, type AdmissionStatus, type WaveStatus } from "@/lib/domain/types";
import { Callout, fmtDate, fmtDeadline } from "@/components/ui";
import { Icon, type IconName } from "@/components/site/Icon";
import { Countdown } from "@/components/site/Countdown";
import { Reveal } from "@/components/site/Reveal";

export const metadata = { title: "Resumen · Portal AET" };
export const dynamic = "force-dynamic";

const PENDING_ICON: Record<string, IconName> = { evaluate: "spark", decide: "users", conditions: "check", submissions: "book", certs: "badge", followups: "clock" };

export default async function AdminResumen({ searchParams }: { searchParams: Promise<{ wave?: string }> }) {
  if (!isSupabaseConfigured()) redirect("/admin/waves");
  const viewer = await requireStaffPage("/admin");
  const isAdmin = viewer.role === "admin";
  let waveId = (await searchParams).wave ?? "";
  if (!waveId) {
    const db = await supabaseUser();
    const { data } = await db.from("waves").select("id, status").neq("status", "CLOSED").order("created_at", { ascending: false }).limit(1);
    waveId = data?.[0]?.id ?? "wave-3";
  }
  const d = await waveDashboard(waveId, isAdmin);
  if (!d) return <Callout tone="warn" title="No encontramos esa Wave." />;

  const open = d.pending.filter((p) => p.count > 0);
  const top = Math.max(1, d.funnel[0].count);
  const deadlineFuture = d.wave.application_deadline && new Date(d.wave.application_deadline).getTime() > Date.now();
  const firstName = (viewer.fullName ?? viewer.email).split(/[ .@]/)[0];

  return (
    <div className="adm">
      <header className="adm-head">
        <div>
          <div className="eyebrow">{d.wave.name} · {WAVE_STATUS_LABEL[d.wave.status as WaveStatus] ?? d.wave.status}</div>
          <h1>Hola, {firstName.charAt(0).toUpperCase() + firstName.slice(1)}</h1>
          <p className="muted">{open.length === 0 ? "No hay nada pendiente en esta Wave. Todo al día." : `Tienes ${open.length} tipo${open.length > 1 ? "s" : ""} de pendiente en esta Wave.`}</p>
        </div>
        {d.wave.application_deadline && (
          <div className="adm-deadline">
            <small>{deadlineFuture ? "Cierre de postulación" : "Postulación cerrada"}</small>
            {deadlineFuture ? <Countdown to={d.wave.application_deadline} compact /> : <strong>{fmtDeadline(d.wave.application_deadline)}</strong>}
          </div>
        )}
      </header>

      <section className="adm-kpis">
        {[
          ["Candidatos", d.funnel[0].count, "users"],
          ["Postularon", d.funnel[1].count, "spark"],
          ["Seleccionados", d.funnel[3].count, "check"],
          ["Inscritos", d.funnel[4].count, "flag"],
        ].map(([label, n, icon], i) => (
          <Reveal key={label as string} delay={i * 50} className="adm-kpi">
            <span className="ico"><Icon name={icon as IconName} size={20} /></span>
            <strong>{n as number}</strong>
            <small>{label as string}</small>
          </Reveal>
        ))}
      </section>

      <div className="adm-grid">
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Pendientes</h2>
            <span className="muted">Lo que necesita una acción</span>
          </div>
          <div className="pending-list">
            {d.pending.map((p, i) => (
              <Reveal key={p.key} delay={i * 40}>
                <Link href={p.href} className={`pending ${p.count === 0 ? "done" : ""}`}>
                  <span className="ico"><Icon name={p.count === 0 ? "check" : PENDING_ICON[p.key]} size={20} /></span>
                  <span className="txt">
                    <strong>{p.label}</strong>
                    <small>{p.count === 0 ? "Al día" : p.hint}</small>
                  </span>
                  <span className="count">{p.count}</span>
                  <Icon name="arrowRight" size={18} className="go" />
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Embudo de la Wave</h2>
            <span className="muted">Cuántas personas llegan a cada etapa</span>
          </div>
          {d.total === 0 ? (
            <div className="empty">
              <Icon name="users" size={32} />
              <p>Todavía no hay candidatos en esta Wave.</p>
              {isAdmin && <Link className="pill accent" href={`/admin/admision/${waveId}/importar`}>Importar base de candidatos</Link>}
            </div>
          ) : (
            <Reveal className="funnel">
              {d.funnel.map((f) => (
                <div key={f.label} className="funnel-row">
                  <span className="lbl">{f.label}</span>
                  <span className="bar"><span style={{ "--w": f.count / top } as CSSProperties} /></span>
                  <span className="n">{f.count}<small>{Math.round((f.count / top) * 100)}%</small></span>
                </div>
              ))}
            </Reveal>
          )}
        </section>

        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Actividad reciente</h2>
            <Link className="more-link" href={`/admin/admision/${waveId}`}>Ver candidatos <Icon name="arrowRight" size={16} /></Link>
          </div>
          {d.recent.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>Sin movimientos todavía. Aquí verás cada cambio de estado, con quién lo hizo.</p>
          ) : (
            <ul className="activity">
              {d.recent.map((e, i) => (
                <li key={i}>
                  <span className="dot" aria-hidden="true" />
                  <span>
                    <strong>{e.name}</strong> pasó a <em>{ADMISSION_LABEL[e.to as AdmissionStatus] ?? e.to}</em>
                    <small>{fmtDate(e.at)}{e.actor ? ` · ${e.actor}` : ""}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Atajos</h2>
          </div>
          <div className="shortcuts">
            {[
              isAdmin && { href: `/admin/admision/${waveId}/importar`, label: "Importar candidatos", icon: "users" as IconName },
              { href: `/admin/journey/${waveId}?tab=grupos`, label: "Grupos y mentores", icon: "route" as IconName },
              isAdmin && { href: `/admin/contenido/${waveId}`, label: "Videos y cápsulas", icon: "play" as IconName },
              isAdmin && { href: "/admin/talento/importar", label: "Cargar Waves pasadas", icon: "layers" as IconName },
              { href: "/admin/talento", label: "Pool de talento", icon: "star" as IconName },
              isAdmin && { href: "/admin/accesos", label: "Dar accesos", icon: "key" as IconName },
            ]
              .filter((x): x is { href: string; label: string; icon: IconName } => Boolean(x))
              .map((s) => (
                <Link key={s.href} href={s.href} className="shortcut">
                  <span className="ico"><Icon name={s.icon} size={20} /></span>
                  {s.label}
                </Link>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
