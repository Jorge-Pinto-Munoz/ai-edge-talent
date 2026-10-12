import Link from "next/link";
import { requireAdminPage } from "@/lib/admission/admin-only";
import { supabaseService } from "@/lib/supabase/server";
import { layerName, type Layer } from "@/lib/journey/rules";
import { ADMISSION_LABEL, type AdmissionStatus } from "@/lib/domain/types";
import { Icon, type IconName } from "@/components/site/Icon";

export const metadata = { title: "Ver como · Portal AET" };
export const dynamic = "force-dynamic";

/** El admin ve la plataforma como cada persona: elige a alguien y abre su vista exacta, en modo solo lectura. */
export default async function VerComo() {
  await requireAdminPage("/admin/vista");
  const db = supabaseService();
  const [{ data: cands }, { data: coaches }, { data: clientGrants }, { data: waves }] = await Promise.all([
    db.from("candidates").select("id, full_name, wave_id, status, journey_layer, client_name").order("full_name"),
    db.from("profiles").select("id, full_name, email").eq("role", "mentor").order("email"),
    db.from("role_grants").select("client_name").eq("role", "client"),
    db.from("waves").select("id, name, created_at").order("created_at", { ascending: false }),
  ]);
  const wName = (id: string) => waves?.find((w) => w.id === id)?.name.replace("AI Edge Talent · ", "") ?? id;
  const active = (cands ?? []).filter((c) => ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"].includes(c.status));
  const clients = [...new Set([...(cands ?? []).map((c) => c.client_name), ...(clientGrants ?? []).map((g) => g.client_name)].filter(Boolean) as string[])].sort();
  const byWave = <T extends { wave_id: string }>(xs: T[]) => (waves ?? []).map((w) => ({ w, xs: xs.filter((x) => x.wave_id === w.id) })).filter((g) => g.xs.length);

  const Card = ({ icon, title, body, children }: { icon: IconName; title: string; body: string; children: React.ReactNode }) => (
    <section className="adm-card vc-card">
      <div className="vc-head"><span className="vc-ico"><Icon name={icon} size={22} /></span><div><h2>{title}</h2><p className="muted">{body}</p></div></div>
      {children}
    </section>
  );

  return (
    <div className="adm">
      <header className="adm-head">
        <div>
          <div className="eyebrow">Solo admin del proyecto</div>
          <h1>Ver como</h1>
          <p className="muted" style={{ maxWidth: 760 }}>Abre la plataforma exactamente como la ve cada persona. Es solo lectura: puedes recorrer todo, pero no enviar nada en su nombre. Delivery, Hub AI y AI Coach no tienen esta opción.</p>
        </div>
      </header>
      <div className="adm-grid even">
        <Card icon="route" title="Profesional en su journey" body="Su camino, siguiente paso, materiales y entregas.">
          <form action="/admin/vista/profesional" className="vc-form">
            <label htmlFor="vc-p" className="sr-only">Profesional</label>
            <select id="vc-p" name="id" required defaultValue="">
              <option value="" disabled>Elige un/a participante</option>
              {byWave(active).map(({ w, xs }) => (
                <optgroup key={w.id} label={w.name}>{xs.map((c) => <option key={c.id} value={c.id}>{c.full_name} · {layerName(c.journey_layer as Layer | null)}</option>)}</optgroup>
              ))}
            </select>
            <button className="btn">Ver su journey</button>
          </form>
        </Card>
        <Card icon="send" title="Candidato/a en su postulación" body="Su enlace personal: formulario, resultado, video de rescate o compromiso.">
          <form action="/admin/vista/candidato" className="vc-form">
            <label htmlFor="vc-c" className="sr-only">Candidato/a</label>
            <select id="vc-c" name="id" required defaultValue="">
              <option value="" disabled>Elige un/a candidato/a</option>
              {byWave(cands ?? []).map(({ w, xs }) => (
                <optgroup key={w.id} label={w.name}>{xs.map((c) => <option key={c.id} value={c.id}>{c.full_name} · {ADMISSION_LABEL[c.status as AdmissionStatus] ?? c.status}</option>)}</optgroup>
              ))}
            </select>
            <button className="btn">Ver su postulación</button>
          </form>
        </Card>
        <Card icon="building" title="Cliente" body="Avance de sus profesionales por Wave, sin puntajes.">
          <form action="/admin/vista/cliente" className="vc-form">
            <label htmlFor="vc-k" className="sr-only">Cliente</label>
            <select id="vc-k" name="nombre" required defaultValue="">
              <option value="" disabled>Elige un cliente</option>
              {clients.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button className="btn">Ver como cliente</button>
          </form>
        </Card>
        <Card icon="chat" title="AI Coach" body="Sus grupos y el feedback semanal.">
          {(coaches ?? []).length ? (
            <form action="/admin/vista/coach" className="vc-form">
              <label htmlFor="vc-m" className="sr-only">AI Coach</label>
              <select id="vc-m" name="id" required defaultValue="">
                <option value="" disabled>Elige un AI Coach</option>
                {(coaches ?? []).map((m) => <option key={m.id} value={m.id}>{m.full_name ?? m.email}</option>)}
              </select>
              <button className="btn">Ver como AI Coach</button>
            </form>
          ) : <p className="muted" style={{ margin: 0 }}>Aún no hay AI Coaches. Se asignan en Journey → Grupos.</p>}
        </Card>
      </div>
      <section className="adm-card">
        <div className="adm-card-head"><h2>Profesor, Líder Hub AI y Delivery</h2></div>
        <p style={{ marginTop: 0 }}>Como admin ya ves lo mismo que ellos, con permisos de edición:</p>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <Link className="btn ghost small" href="/admin/profesor">Clases (Profesor)</Link>
          <Link className="btn ghost small" href="/admin/lab">AI Lab &amp; Showcase (Hub AI)</Link>
          <Link className="btn ghost small" href="/admin">Resumen (Delivery)</Link>
          <Link className="btn ghost small" href="/">Sitio público</Link>
        </div>
      </section>
      <p className="muted"><small>{active.length} participantes activos · {(cands ?? []).length} candidatos en {wName(waves?.[0]?.id ?? "")} y Waves anteriores.</small></p>
    </div>
  );
}
