import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdminPage } from "@/lib/admission/admin-only";
import { supabaseService } from "@/lib/supabase/server";
import { layerName, type Layer } from "@/lib/journey/rules";
import { ADMISSION_LABEL, type AdmissionStatus } from "@/lib/domain/types";
import { inJourney } from "@/lib/admission/view-as";
import { sortWaves } from "@/lib/waves/order";
import { Icon, type IconName } from "@/components/site/Icon";

export const metadata = { title: "Ver como · Portal AET" };
export const dynamic = "force-dynamic";

const live = ["DELETED", "REVOKED"];
const short = (name: string) => name.replace("AI Edge Talent · ", "");

/** El admin ve la plataforma como cada persona: elige el rol, la persona y abre su vista exacta, en solo lectura. */
export default async function VerComo() {
  await requireAdminPage("/admin/vista");
  const db = supabaseService();
  const [{ data: cands }, { data: staff }, { data: waveStaff }, { data: assigned }, { data: clientGrants }, { data: rawWaves }] = await Promise.all([
    db.from("candidates").select("id, full_name, wave_id, status, journey_layer, client_name").order("full_name"),
    db.from("profiles").select("id, full_name, email, role, status").in("role", ["delivery", "mentor", "hub", "bp"]).order("full_name"),
    db.from("wave_staff").select("email, wave_id").eq("role", "hub"),
    db.from("delivery_assignments").select("delivery_email"),
    db.from("role_grants").select("client_name").eq("role", "client"),
    db.from("waves").select("id, name, status"),
  ]);
  const waves = sortWaves(rawWaves ?? []);
  const waveName = (id: string) => short(waves.find((w) => w.id === id)?.name ?? id);
  const people = (role: string) => (staff ?? []).filter((p) => p.role === role && !live.includes(p.status));
  const nameOf = (p: { full_name: string | null; email: string }) => p.full_name ?? p.email;

  // Delivery: solo quienes ya ingresaron (cuenta activa), con cuántos profesionales los eligieron.
  const deliveries = people("delivery").filter((p) => p.status === "ACTIVE");
  const notYet = people("delivery").length - deliveries.length;
  const mineCount = (email: string) => (assigned ?? []).filter((a) => a.delivery_email === email).length;
  const coaches = people("mentor");
  const hubs = people("hub");
  const hubWaves = (email: string) => (waveStaff ?? []).filter((w) => w.email === email).map((w) => waveName(w.wave_id));
  const bps = people("bp");
  const clients = [...new Set([...(cands ?? []).map((c) => c.client_name), ...(clientGrants ?? []).map((g) => g.client_name)].filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "es"));
  const byWave = waves.map((w) => ({ w, xs: (cands ?? []).filter((c) => c.wave_id === w.id) })).filter((g) => g.xs.length);
  const stage = (c: { status: string; journey_layer: string | null }) =>
    inJourney(c.status) ? layerName(c.journey_layer as Layer | null) : ADMISSION_LABEL[c.status as AdmissionStatus] ?? c.status;

  return (
    <div className="adm">
      <header className="adm-head">
        <div>
          <div className="eyebrow">Solo administración</div>
          <h1>Ver como</h1>
          <p className="muted" style={{ maxWidth: 720 }}>
            Abre la plataforma tal como la ve cada persona, para mostrarle qué verá en cada etapa. Es solo lectura: no se envía ni se modifica nada.
          </p>
        </div>
      </header>

      <div className="vc-grid">
        <RoleCard
          icon="users" title="Delivery" sees="Sus profesionales en cada etapa, quién postuló y qué necesita atención."
          action="/admin/vista/delivery" field="id" label="Delivery" cta="Ver como Delivery"
          options={deliveries.map((p) => ({ value: p.id, text: `${nameOf(p)} · ${mineCount(p.email) === 1 ? "1 profesional" : `${mineCount(p.email)} profesionales`}` }))}
          meta={notYet > 0 ? `${notYet} Delivery aún no ingresa: aparecerá aquí después de su primer ingreso.` : undefined}
          empty={<>Ningún Delivery ha ingresado todavía. Aparecen aquí después de su primer ingreso con código.</>}
        />
        <RoleCard
          icon="route" title="Profesional" sees="Su postulación mientras postula; su journey cuando ya está inscrito."
          action="/admin/vista/persona" field="id" label="Profesional" cta="Ver como profesional"
          groups={byWave.map(({ w, xs }) => ({ label: short(w.name), options: xs.map((c) => ({ value: c.id, text: `${c.full_name} · ${stage(c)}` })) }))}
          empty={<>Aún no hay profesionales registrados.</>}
        />
        <RoleCard
          icon="chat" title="AI Coach" sees="Sus grupos y el feedback semanal de cada profesional."
          action="/admin/vista/coach" field="id" label="AI Coach" cta="Ver como AI Coach"
          options={coaches.map((p) => ({ value: p.id, text: nameOf(p) }))}
          empty={<>Aún no hay AI Coaches. Créalos en <Link href="/admin/usuarios">Usuarios y accesos</Link>.</>}
        />
        <RoleCard
          icon="flask" title="Líder Hub AI" sees="Quién pasa al AI Lab, las dos clases, los proyectos y el Showcase."
          action="/admin/vista/hub" field="id" label="Líder Hub AI" cta="Ver como Líder Hub AI"
          options={hubs.map((p) => ({ value: p.id, text: `${nameOf(p)} · ${hubWaves(p.email).join(", ") || "sin Wave asignada"}` }))}
          empty={<>Aún no hay Líderes Hub AI. Créalos en <Link href="/admin/usuarios">Usuarios y accesos</Link>.</>}
        />
      </div>

      <section className="adm-card vc-others" aria-labelledby="vc-o">
        <div className="adm-card-head"><h2 id="vc-o">Otros roles</h2></div>
        <div className="vc-rows">
          <MiniRow icon="building" title="Cliente" sees="Avance de sus profesionales, sin puntajes."
            action="/admin/vista/cliente" field="nombre" label="Cliente" cta="Ver como cliente"
            options={clients.map((c) => ({ value: c, text: c }))} empty="Aún no hay clientes." />
          <MiniRow icon="star" title="Business Partner" sees="El inicio del equipo, en solo lectura."
            action="/admin/vista/delivery" field="id" label="Business Partner" cta="Ver como BP"
            options={bps.map((p) => ({ value: p.id, text: nameOf(p) }))} empty="Aún no hay Business Partners." />
          <div className="vc-row">
            <span className="vc-ico sm"><Icon name="compass" size={18} /></span>
            <div className="vc-row-txt"><strong>Visitante</strong><small className="muted">El sitio público, sin sesión.</small></div>
            <Link className="btn ghost" href="/" target="_blank">Abrir sitio público</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

type Opt = { value: string; text: string };

function Picker({ id, field, label, options, groups }: { id: string; field: string; label: string; options?: Opt[]; groups?: { label: string; options: Opt[] }[] }) {
  const n = (options?.length ?? 0) + (groups ?? []).reduce((s, g) => s + g.options.length, 0);
  return (
    <>
      <label htmlFor={id} className="sr-only">{label}</label>
      <select id={id} name={field} required defaultValue="">
        <option value="" disabled>Elige {label === "Profesional" ? "un profesional" : label === "Cliente" ? "un cliente" : `un ${label}`} ({n})</option>
        {options?.map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}
        {groups?.map((g) => <optgroup key={g.label} label={g.label}>{g.options.map((o) => <option key={o.value} value={o.value}>{o.text}</option>)}</optgroup>)}
      </select>
    </>
  );
}

function RoleCard(p: { icon: IconName; title: string; sees: string; action: string; field: string; label: string; cta: string; options?: Opt[]; groups?: { label: string; options: Opt[] }[]; empty: ReactNode; meta?: string }) {
  const n = (p.options?.length ?? 0) + (p.groups ?? []).reduce((s, g) => s + g.options.length, 0);
  const id = `vc-${p.title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <section className="adm-card vc-card" aria-labelledby={`${id}-t`}>
      <div className="vc-head">
        <span className="vc-ico"><Icon name={p.icon} size={22} /></span>
        <div>
          <h2 id={`${id}-t`}>{p.title}</h2>
          <p className="muted">{p.sees}</p>
          {p.meta && <p className="vc-meta muted">{p.meta}</p>}
        </div>
      </div>
      {n > 0 ? (
        <form action={p.action} className="vc-form">
          <Picker id={id} field={p.field} label={p.label} options={p.options} groups={p.groups} />
          <button className="btn">{p.cta}</button>
        </form>
      ) : (
        <p className="vc-empty">{p.empty}</p>
      )}
    </section>
  );
}

function MiniRow(p: { icon: IconName; title: string; sees: string; action: string; field: string; label: string; cta: string; options: Opt[]; empty: string }) {
  const id = `vc-${p.title.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="vc-row">
      <span className="vc-ico sm"><Icon name={p.icon} size={18} /></span>
      <div className="vc-row-txt"><strong>{p.title}</strong><small className="muted">{p.sees}</small></div>
      {p.options.length ? (
        <form action={p.action} className="vc-form">
          <Picker id={id} field={p.field} label={p.label} options={p.options} />
          <button className="btn ghost">{p.cta}</button>
        </form>
      ) : <span className="muted vc-row-empty">{p.empty}</span>}
    </div>
  );
}
