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
import { supabaseService } from "@/lib/supabase/server";
import { loadWavePeople } from "@/lib/pulse/experience-data";
import { applyFilters, experience, operational } from "@/lib/pulse/experience";
import { STAGE_STATUS } from "@/lib/journey/closure";
import { LAYERS } from "@/lib/journey/rules";
import { ExperienceByStage, ExperienceDetail, ExperienceSummary } from "@/components/pulse/WaveExperience";
import { ShareExperience } from "@/components/pulse/ShareExperience";
import { AiSummary } from "@/components/pulse/AiSummary";
import { closingTexts } from "@/lib/pulse/summary-data";
import { aiConfigured } from "@/lib/ai/client";
import { CLOSING_LAYERS } from "@/lib/pulse/experience";
import type { PulseSummary } from "@/lib/ai/pulse-summary";

export const metadata = { title: "Avance y experiencia · Portal AET" };

const LEVELS = [["resumen", "Resumen"], ["etapa", "Por etapa"], ["detalle", "Detalle"], ["habilitacion", "Indicadores de habilitación"]] as const;
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

type SP = { nivel?: string; etapa?: string; cliente?: string; delivery?: string; estado?: string };

export default async function PulsosReport({ params, searchParams }: { params: Promise<{ waveId: string }>; searchParams: Promise<SP> }) {
  const { waveId } = await params;
  const sp = await searchParams;
  const nivel = LEVELS.some(([k]) => k === sp.nivel) ? sp.nivel! : "resumen";
  const viewer = await requireStaffPage(`/admin/pulsos/${waveId}`);
  if (viewer.role !== "admin") redirect("/sin-acceso");
  const db = await supabaseUser();
  const { data: wave } = await db.from("waves").select("id, name").eq("id", waveId).single();
  if (!wave) notFound();
  const [r, all, { data: settings }, { data: team }] = await Promise.all([
    waveReport(waveId),
    loadWavePeople(waveId),
    supabaseService().from("wave_settings").select("share_experience").eq("wave_id", waveId).maybeSingle(),
    supabaseService().from("wave_staff").select("email").eq("wave_id", waveId).eq("role", "delivery"),
  ]);
  const filters = { layer: sp.etapa, client: sp.cliente, delivery: sp.delivery, status: sp.estado };
  const people = applyFilters(all, filters);
  const ops = operational(people);
  const exp = experience(people);
  const clients = [...new Set(all.map((p) => p.client).filter(Boolean))] as string[];
  const deliveries = [...new Set([...(team ?? []).map((t) => t.email), ...all.map((p) => p.delivery).filter(Boolean)])] as string[];
  const { data: dprof } = deliveries.length ? await supabaseService().from("profiles").select("email, full_name").in("email", deliveries) : { data: [] };
  const dName = (e: string | null) => (dprof ?? []).find((d) => d.email === e)?.full_name || e || "";
  // Síntesis con IA guardadas (solo en "Por etapa", sobre toda la Wave: los filtros no aplican a la síntesis).
  const ai: Partial<Record<(typeof CLOSING_LAYERS)[number], { initial: PulseSummary | null; stale: boolean; texts: number }>> = {};
  if (nivel === "etapa") {
    const { data: saved } = await supabaseService().from("ai_summaries").select("layer, input_hash, content").eq("wave_id", waveId);
    for (const l of CLOSING_LAYERS) {
      const t = await closingTexts(waveId, l);
      const s = (saved ?? []).find((x) => x.layer === l);
      ai[l] = { initial: (s?.content as PulseSummary) ?? null, stale: Boolean(s && s.input_hash !== t.hash), texts: t.rows.length };
    }
  }
  const qs = (k: string) => new URLSearchParams(Object.entries({ ...sp, nivel: k }).filter(([, v]) => v) as [string, string][]).toString();
  const enab = [["Pulso intermedio", r.enablementMid], ["Pulso de cierre", r.enablementClose]] as const;
  const readings = r.persons.filter((p) => p.pulse || p.alert);

  return (
    <div className="stack report">
      <div className="spread">
        <div>
          <div className="eyebrow">{wave.name}</div>
          <h1 style={{ margin: 0 }}>Avance y experiencia</h1>
          <p className="muted" style={{ margin: "6px 0 0" }}>Cada etapa se cierra con su pulso obligatorio, que se habilita al cumplir los requisitos académicos (el intermedio aparece a los {MID_DAYS} días de Role Enablement). Todo se recalcula con cada respuesta, sin datos estimados.</p>
        </div>
        <PrintButton />
      </div>

      <ShareExperience waveId={waveId} shared={Boolean(settings?.share_experience)} />

      <nav className="row" aria-label="Nivel del informe">
        {LEVELS.map(([k, label]) => <Link key={k} href={`?${qs(k)}`} className={`btn small ${nivel === k ? "" : "ghost"}`} aria-current={nivel === k ? "page" : undefined}>{label}</Link>)}
      </nav>

      {nivel !== "habilitacion" && (
        <form className="ex-filters" method="get">
          <input type="hidden" name="nivel" value={nivel} />
          <label>Etapa<select name="etapa" defaultValue={sp.etapa ?? ""}><option value="">Todas</option>{LAYERS.filter((l) => l.id !== "ASSESSMENT").map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
          <label>Cliente<select name="cliente" defaultValue={sp.cliente ?? ""}><option value="">Todos</option>{clients.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
          <label>Delivery<select name="delivery" defaultValue={sp.delivery ?? ""}><option value="">Todos</option><option value="none">Sin Delivery asignado</option>{deliveries.map((d) => <option key={d} value={d}>{dName(d)}</option>)}</select></label>
          <label>Estado<select name="estado" defaultValue={sp.estado ?? ""}><option value="">Todos</option>{Object.entries(STAGE_STATUS).filter(([k]) => k !== "LOCKED").map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
          <button className="btn small secondary">Filtrar</button>
          {(sp.etapa || sp.cliente || sp.delivery || sp.estado) && <Link className="btn small ghost" href={`?nivel=${nivel}`}>Limpiar</Link>}
          <small className="muted">{people.length} de {all.length} personas</small>
        </form>
      )}

      {nivel === "resumen" && <ExperienceSummary ops={ops} exp={exp} />}
      {nivel === "etapa" && <ExperienceByStage exp={exp} extra={(l) => ai[l] ? <AiSummary waveId={waveId} layer={l} configured={aiConfigured()} {...ai[l]!} /> : null} />}
      {nivel === "detalle" && <ExperienceDetail people={people} deliveryName={dName} />}

      {nivel === "habilitacion" && (<>

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
      </>)}
    </div>
  );
}
