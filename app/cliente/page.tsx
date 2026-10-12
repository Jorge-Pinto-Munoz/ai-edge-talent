import { redirect } from "next/navigation";
import { SignOut } from "@/components/admission/SignOut";
import { getViewer } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { LAYERS, layerName, type Layer } from "@/lib/journey/rules";
import { WAVE_STATUS_LABEL, type WaveStatus } from "@/lib/domain/types";
import { Callout, fmtDate } from "@/components/ui";

export const metadata = { title: "Cliente · AI Edge Talent" };
export const dynamic = "force-dynamic";

/** Vista general para clientes: en qué va cada Wave y su gente, sin puntajes ni detalle de evaluación. */
export default async function ClientePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/cliente");
  if (viewer.role !== "client" && viewer.role !== "admin" && viewer.role !== "delivery") redirect("/inicio");
  const db = await supabaseUser();
  const [{ data: overview }, { data: people }, { data: status }, { data: allWaves }] = await Promise.all([
    db.from("client_wave_overview").select("*"),
    db.from("client_candidate_journey").select("*").order("full_name"),
    db.from("client_candidate_status").select("wave_id, visible_status"),
    db.from("waves").select("id, name"),
  ]);
  const waveName = (id: string) => allWaves?.find((w) => w.id === id)?.name ?? id;
  const waves = [...new Map((overview ?? []).map((o) => [o.wave_id, { id: o.wave_id, name: o.wave_name, status: o.wave_status }])).values()];
  const admissionWaves = [...new Set((status ?? []).map((s) => s.wave_id))].filter((w) => !waves.some((x) => x.id === w));
  return (
    <div className="stack">
      <div className="dark-band" style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: 16, right: 16 }}><SignOut /></div>
        <div className="eyebrow">AI Edge Talent · Cliente</div>
        <h1 style={{ color: "#fff", margin: 0 }}>En qué va el programa</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>Vista general por Wave. Usted ve el avance de sus profesionales; no recibe puntajes ni evaluaciones detalladas.</p>
      </div>
      {waves.length === 0 && admissionWaves.length === 0 && <Callout title="Aún no hay profesionales de su organización en una Wave activa" />}
      {admissionWaves.map((w) => {
        const st = (status ?? []).filter((s) => s.wave_id === w);
        const counts = st.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.visible_status]: (acc[s.visible_status] ?? 0) + 1 }), {});
        return (
          <div key={w} className="card">
            <div className="eyebrow">Wave en admisión</div>
            <h2 style={{ marginTop: 0 }}>{waveName(w)}</h2>
            <ul>{Object.entries(counts).map(([k, v]) => <li key={k}>{k}: <strong>{v}</strong></li>)}</ul>
          </div>
        );
      })}
      {waves.map((w) => {
        const rows = (overview ?? []).filter((o) => o.wave_id === w.id);
        const total = rows.reduce((a, r) => a + r.people, 0);
        const mine = (people ?? []).filter((p) => p.wave_id === w.id);
        return (
          <div key={w.id} className="card">
            <div className="spread">
              <h2 style={{ margin: 0 }}>{w.name}</h2>
              <span className="badge">{WAVE_STATUS_LABEL[w.status as WaveStatus]}</span>
            </div>
            <p className="muted">{total} profesional(es) de su organización en el journey.</p>
            <div className="rail">
              {LAYERS.filter((l) => l.id !== "ASSESSMENT").map((l) => {
                const n = rows.find((r) => r.layer === l.id)?.people ?? 0;
                return (
                  <div key={l.id} className={`rail-item ${n > 0 ? "current" : ""}`}>
                    <div className="track">{n} persona(s)</div>
                    <strong>{l.name}</strong>
                    <p className="muted" style={{ margin: "4px 0 0" }}><small>{l.description}</small></p>
                  </div>
                );
              })}
            </div>
            <div className="table-wrap" tabIndex={0} style={{ marginTop: 12 }}>
              <table>
                <thead><tr><th>Profesional</th><th>Rol</th><th>Etapa</th><th>Desde</th></tr></thead>
                <tbody>
                  {mine.map((p) => (
                    <tr key={p.id}><td>{p.full_name}</td><td>{p.role_title ?? "—"}</td><td>{p.journey_layer ? layerName(p.journey_layer as Layer) : "Inscrito/a, por iniciar"}</td><td>{p.journey_layer_since ? fmtDate(p.journey_layer_since) : "—"}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      <Callout title="Su rol en el proceso">
        Habilitar la disponibilidad coordinada (normalmente 2–3 h/semana según etapa), ayudar a validar el problema en AI Lab y tomar una decisión de continuidad en el Showcase.
      </Callout>
    </div>
  );
}
