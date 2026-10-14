import { SignOut } from "@/components/admission/SignOut";
import { supabaseUser } from "@/lib/supabase/server";
import { LAYERS, layerName, type Layer } from "@/lib/journey/rules";
import { WAVE_STATUS_LABEL, type WaveStatus } from "@/lib/domain/types";
import { Icon } from "@/components/site/Icon";
import { certifiedRate } from "@/lib/aicert/stats";
import { Callout, fmtDate } from "@/components/ui";
import { PulseCard } from "@/components/pulse/PulseCard";
import { pulseDef } from "@/lib/pulse/definitions";
import { dueClientPulse } from "@/lib/pulse/rules";

/**
 * Portal del cliente: en qué va cada Wave y su gente, sin puntajes ni detalle de evaluación.
 * Con `clientName` (vista previa del admin) muestra exactamente lo que vería ese cliente.
 */
export async function ClientPortal({ clientName, preview }: { clientName?: string; preview?: boolean }) {
  const db = await supabaseUser();
  const [{ data: peopleAll }, { data: statusAll }, { data: allWaves }, stat, { data: pulsesAll }] = await Promise.all([
    db.from("client_candidate_journey").select("*").order("full_name"),
    db.from("client_candidate_status").select("wave_id, visible_status, client_name"),
    db.from("waves").select("id, name, status"),
    certifiedRate(),
    db.from("pulse_responses").select("wave_id, pulse, client_name").eq("respondent", "CLIENT"),
  ]);
  // El cliente ya recibe solo lo suyo (vistas con RLS); en vista previa se filtra por el cliente elegido.
  const people = clientName ? (peopleAll ?? []).filter((p) => p.client_name === clientName) : peopleAll ?? [];
  const status = clientName ? (statusAll ?? []).filter((s) => s.client_name === clientName) : statusAll ?? [];
  const wave = (id: string) => allWaves?.find((w) => w.id === id);
  const journeyWaves = [...new Set(people.map((p) => p.wave_id))];
  const admissionWaves = [...new Set(status.map((s) => s.wave_id))].filter((w) => !journeyWaves.includes(w));

  return (
    <div className="stack">
      <div className="dark-band" style={{ position: "relative" }}>
        {!preview && <div style={{ position: "absolute", top: 16, right: 16 }}><SignOut /></div>}
        <div className="eyebrow">AI Edge Talent · Cliente{clientName ? ` · ${clientName}` : ""}</div>
        <h1 style={{ color: "#fff", margin: 0 }}>En qué va el programa</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>Vista general por Wave: aquí ves cómo avanzan tus profesionales.</p>
      </div>
      {journeyWaves.length === 0 && admissionWaves.length === 0 && <Callout title="Aún no hay profesionales de tu organización en una Wave activa" />}
      {admissionWaves.map((w) => {
        const counts = status.filter((s) => s.wave_id === w).reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.visible_status]: (acc[s.visible_status] ?? 0) + 1 }), {});
        return (
          <div key={w} className="card">
            <div className="eyebrow">Wave en admisión</div>
            <h2 style={{ marginTop: 0 }}>{wave(w)?.name ?? w}</h2>
            <ul>{Object.entries(counts).map(([k, v]) => <li key={k}>{k}: <strong>{v}</strong></li>)}</ul>
          </div>
        );
      })}
      {journeyWaves.map((wid) => {
        const w = wave(wid);
        const mine = people.filter((p) => p.wave_id === wid);
        const answered = (pulsesAll ?? []).filter((r) => r.wave_id === wid && (!clientName || r.client_name === clientName)).map((r) => r.pulse);
        // Las Waves cerradas (históricas) no piden pulsos.
        const due = w?.status === "CLOSED" ? null : dueClientPulse(mine.map((p) => p.journey_layer as Layer | null), answered);
        const def = due ? pulseDef(due) : null;
        return (
          <div key={wid} className="card">
            <div className="spread">
              <h2 style={{ margin: 0 }}>{w?.name ?? wid}</h2>
              {w && <span className="badge">{WAVE_STATUS_LABEL[w.status as WaveStatus]}</span>}
            </div>
            <p className="muted">{mine.length} profesional(es) de tu organización en el journey.</p>
            {def && (
              <div style={{ marginBottom: 14 }}>
                <PulseCard def={def} waveId={wid} preview={preview} text={due === "CLIENTE_INICIO" ? "Tu punto de partida: con la misma pregunta al cierre medimos las horas ahorradas." : "Tu mirada al cierre y las horas de hoy, para medir el antes y el después."} />
              </div>
            )}
            <div className="rail">
              {LAYERS.filter((l) => l.id !== "ASSESSMENT").map((l) => {
                const n = mine.filter((p) => p.journey_layer === l.id).length;
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
              <table className="rtable">
                <thead><tr><th>Profesional</th><th>Rol</th><th>Etapa</th><th>Desde</th><th>Avance AI CERT</th></tr></thead>
                <tbody>
                  {mine.map((p) => (
                    <tr key={p.id}>
                      <td className="rt-title">{p.full_name}</td>
                      <td data-label="Rol">{p.role_title ?? "—"}</td>
                      <td data-label="Etapa">{p.journey_layer ? layerName(p.journey_layer as Layer) : "Inscrito/a, por iniciar"}</td>
                      <td data-label="Desde">{p.journey_layer_since ? fmtDate(p.journey_layer_since) : "—"}</td>
                      <td data-label="Avance AI CERT">{p.aicert_tramo ? <>{p.aicert_course_name ?? (p.aicert_course === "SPECIALIST" ? "Especialista" : "Introductorio")}<br /><small className="muted">Tramo {p.aicert_tramo} · {p.aicert_percent}%</small></> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      <Callout title="Tu rol en el proceso">
        Habilitar la disponibilidad coordinada (normalmente 2–3 h/semana según etapa), ayudar a validar el problema en AI Lab y tomar una decisión de continuidad en el Showcase.
      </Callout>
      <div className="cat-teaser">
        <div>
          <div className="eyebrow">Certificaciones AI CERTs</div>
          <h3>Explora el talento que puedes desarrollar en tu equipo</h3>
          <p>Por rol: qué certificación corresponde, qué aprende cada profesional y cómo lo aplica.{stat ? ` En Waves cerradas, ${stat.rate} % de los inscritos se certificó.` : ""}</p>
        </div>
        <a className="pill accent lg" href="/certificaciones">Ver certificaciones <Icon name="arrowRight" size={18} /></a>
      </div>
    </div>
  );
}
