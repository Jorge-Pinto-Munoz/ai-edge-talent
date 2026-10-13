import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { waveReport } from "@/lib/pulse/report";
import { MID_DAYS } from "@/lib/pulse/rules";
import { layerName } from "@/lib/journey/rules";
import { progressLabel } from "@/lib/aicert/progress";
import { PrintButton } from "@/components/admin/PrintButton";
import { fmtDate } from "@/components/ui";

export const metadata = { title: "Pulsos e informe · Portal AET" };
export const dynamic = "force-dynamic";

const fmt = (x: number | null | undefined, suffix = "") => (x === null || x === undefined ? "—" : `${String(x).replace(".", ",")}${suffix}`);

/** Definiciones del informe W2: se muestran junto al valor para que el informe se lea solo. */
const IND = [
  ["ICAA", "Capacidad aplicada actual", "Comprender, aplicar, corregir, reforzar y enfrentar con estrategia (0–100).", "/100"],
  ["GPC", "Ganancia percibida de capacidad", "Hoy menos antes del acompañamiento (escala 1–5).", ""],
  ["TAE", "Avance evidenciado", "Declara un avance y lo describe con evidencia específica.", "%"],
  ["ICP", "Contribución percibida", "Cuánto atribuyen su avance a las clases (0–10).", "/10"],
  ["TRB", "Reducción de barreras", "Entre quienes tienen una barrera, se resolvió o bajó de forma importante.", "%"],
  ["TAI", "Autonomía intermedia", "Nivel 4 o más en organización y en estrategia.", "%"],
  ["TRI", "Riesgo intermedio", "Barrera de severidad 4–5 o sin avance observable.", "%"],
  ["TPV", "Progreso verificado", "Avance en la plataforma AI CERTs entre T0 y el pulso, o certificación aprobada.", "%"],
  ["TIIC", "Impacto intermedio corroborado", "GPC ≥ +0,5, evidencia válida, ICP ≥ 6 y progreso verificado, a la vez.", "%"],
] as const;

export default async function PulsosReport({ params }: { params: Promise<{ waveId: string }> }) {
  const { waveId } = await params;
  const viewer = await requireStaffPage(`/admin/pulsos/${waveId}`);
  if (viewer.role !== "admin") redirect("/sin-acceso");
  const db = await supabaseUser();
  const { data: wave } = await db.from("waves").select("id, name").eq("id", waveId).single();
  if (!wave) notFound();
  const r = await waveReport(waveId);
  const enab = [["Pulso intermedio", r.enablementMid], ["Pulso de cierre", r.enablementClose]] as const;
  const readings = r.persons.filter((p) => p.pulse || p.alert);

  return (
    <div className="stack report">
      <div className="spread">
        <div>
          <div className="eyebrow">{wave.name}</div>
          <h1 style={{ margin: 0 }}>Pulsos e informe</h1>
          <p className="muted" style={{ margin: "6px 0 0" }}>Los pulsos aparecen solos en el portal de cada persona al pasar de etapa (el intermedio, a los {MID_DAYS} días de Role Enablement). Este informe se recalcula con cada respuesta.</p>
        </div>
        <PrintButton />
      </div>

      <section className="card" aria-labelledby="cov">
        <h2 id="cov" style={{ marginTop: 0 }}>Respuestas por pulso</h2>
        <div className="table-wrap" tabIndex={0}>
          <table className="rtable">
            <thead><tr><th>Pulso</th><th>Cuándo aparece</th><th>Quién</th><th>Respuestas</th></tr></thead>
            <tbody>
              {r.coverage.map((c) => (
                <tr key={c.key}>
                  <td className="rt-title">{c.title}</td>
                  <td data-label="Cuándo">{c.when}</td>
                  <td data-label="Quién">{c.respondent === "CLIENT" ? "Cliente" : "Profesional"}</td>
                  <td data-label="Respuestas"><strong>{c.n}</strong>{c.of ? <span className="muted"> de {c.of}</span> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card" aria-labelledby="eff">
        <h2 id="eff" style={{ marginTop: 0 }}>Eficiencia: antes y después</h2>
        <p className="muted">Misma pregunta al inicio y al cierre: horas semanales en las tareas que se apoyan con IA. Solo cuenta a quienes respondieron ambas.</p>
        <div className="ind-grid">
          {([["Profesionales", r.efficiency.kiber], ["Clientes", r.efficiency.client]] as const).map(([who, e]) => (
            <div key={who} className="ind">
              <span>{who.toUpperCase()}</span>
              <b>{e ? `${fmt(e.savedPct, "%")}` : "—"}</b>
              <small>{e ? `${fmt(e.before)} h → ${fmt(e.after)} h por semana · ${fmt(e.savedHours)} h ahorradas · ${e.n} con antes y después` : "Aún sin pares inicio–cierre"}</small>
            </div>
          ))}
        </div>
      </section>

      <section className="card" aria-labelledby="mind">
        <h2 id="mind" style={{ marginTop: 0 }}>AI First Mindset</h2>
        {r.mindset.n === 0 ? <p className="muted">Sin respuestas todavía.</p> : (
          <>
            <div className="ind-grid">
              <div className="ind"><span>CALIDAD</span><b>{fmt(r.mindset.quality, " / 5")}</b><small>Promedio de los {r.mindset.items.length} ítems · {r.mindset.n} {r.mindset.n === 1 ? "respuesta" : "respuestas"}</small></div>
              <div className="ind"><span>NPS</span><b>{fmt(r.mindset.nps?.nps)}</b><small>{r.mindset.nps ? `${fmt(r.mindset.nps.promoters, "%")} promotores · ${fmt(r.mindset.nps.detractors, "%")} detractores · recomendación ${fmt(r.mindset.nps.avg)}/10` : ""}</small></div>
            </div>
            <div className="table-wrap" tabIndex={0} style={{ marginTop: 12 }}>
              <table className="rtable">
                <thead><tr><th>Ítem</th><th>Promedio</th><th>4 o 5</th></tr></thead>
                <tbody>{r.mindset.items.map((i) => <tr key={i.id}><td className="rt-title">{i.label}</td><td data-label="Promedio">{fmt(i.avg, " / 5")}</td><td data-label="4 o 5">{fmt(i.top, "%")}</td></tr>)}</tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="card" aria-labelledby="hab">
        <h2 id="hab" style={{ marginTop: 0 }}>Habilitación (Role Enablement)</h2>
        <p className="muted">TPV y TIIC usan el avance por tramo que registras en <Link href={`/admin/journey/${waveId}?tab=aicert`}>Avance AI CERT</Link>; la asistencia viene de las clases del profesor.</p>
        {enab.map(([label, ind]) => (
          <div key={label} style={{ marginTop: 14 }}>
            <h3 style={{ margin: "0 0 8px" }}>{label} <small className="muted">· {ind.n} {ind.n === 1 ? "respuesta" : "respuestas"}</small></h3>
            {ind.n === 0 ? <p className="muted" style={{ margin: 0 }}>Sin respuestas todavía.</p> : (
              <div className="ind-grid">
                {IND.map(([k, name, def, suffix]) => (
                  <div key={k} className="ind" title={def}>
                    <span>{k}</span>
                    <b>{fmt(ind[k], suffix)}</b>
                    <small>{name}{k === "ICP" && ind.ICP_high !== null ? ` · ${fmt(ind.ICP_high, "%")} con 8+` : ""}. {def}</small>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="card" aria-labelledby="ind">
        <h2 id="ind" style={{ marginTop: 0 }}>Lectura individual y alertas</h2>
        {readings.length === 0 ? <p className="muted">Sin lecturas ni alertas por ahora.</p> : (
          <div className="table-wrap" tabIndex={0}>
            <table className="rtable">
              <thead><tr><th>Persona</th><th>Plataforma</th><th>Último pulso</th><th>Alerta y acción recomendada</th></tr></thead>
              <tbody>
                {readings.map((p) => (
                  <tr key={p.id}>
                    <td className="rt-title">{p.name}<br /><small className="muted">{layerName(p.layer)}</small></td>
                    <td data-label="Plataforma">{progressLabel(p.progress)}{p.attendance !== null && <><br /><small className="muted">Asistencia {Math.round(p.attendance * 100)}%</small></>}</td>
                    <td data-label="Último pulso">
                      {p.pulse ? (
                        <small>ICAA {fmt(p.pulse.icaa)} · GPC {fmt(p.pulse.gpc)} · ICP {fmt(p.pulse.icp)}<br />{[p.pulse.tae && "con evidencia", p.pulse.tai && "autónomo/a", p.pulse.tpv && "progreso verificado", p.pulse.barrier && `barrera: ${p.pulse.barrier.toLowerCase()} (${p.pulse.severity})`].filter(Boolean).join(" · ") || "—"}</small>
                      ) : <span className="muted">—</span>}
                    </td>
                    <td data-label="Alerta">{p.alert ? <><span className={`risk ${p.alert.level.toLowerCase()}`}>{p.alert.level}</span> <small>{p.alert.reason}</small><br /><small className="muted">→ {p.alert.action}</small></> : <span className="muted">Sin alertas</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card" aria-labelledby="fin">
        <h2 id="fin" style={{ marginTop: 0 }}>AI Lab, cierre y cliente</h2>
        <div className="ind-grid">
          <div className="ind"><span>AI LAB · NPS</span><b>{fmt(r.lab.nps?.nps)}</b><small>{r.lab.n} respuestas · problema {fmt(r.lab.avg[0])} · sesiones {fmt(r.lab.avg[1])} · confianza {fmt(r.lab.avg[2])} · showcase {fmt(r.lab.avg[3])} (de 5)</small></div>
          <div className="ind"><span>CIERRE · NPS</span><b>{fmt(r.final.nps?.nps)}</b><small>{r.final.n} respuestas · evaluación general {fmt(r.final.overall, " / 5")}</small></div>
          <div className="ind"><span>CLIENTE · NPS</span><b>{fmt(r.client.nps?.nps)}</b><small>{r.client.n} respuestas · valor {fmt(r.client.value, " / 5")} · satisfacción {fmt(r.client.satisf, " / 5")}{r.client.continuity.length ? ` · continúa como piloto: ${r.client.continuity.filter((c) => c.startsWith("Sí")).length} de ${r.client.continuity.length}` : ""}</small></div>
        </div>
      </section>

      {r.comments.length > 0 && (
        <section className="card" aria-labelledby="com">
          <h2 id="com" style={{ marginTop: 0 }}>Comentarios</h2>
          <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {r.comments.map((c, i) => <li key={i} className="callout"><small className="muted">{r.coverage.find((x) => x.key === c.pulse)?.title} · {fmtDate(c.at)}</small><br />{c.text}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
