import Link from "next/link";
import { requireTeamPage } from "@/lib/staff/guard";
import { supabaseService, supabaseUser } from "@/lib/supabase/server";
import { waveReport } from "@/lib/pulse/report";
import { DELIVERY_STAGES } from "@/lib/data/delivery-guide";
import { DeliveryJourney, type StageLive } from "@/components/staff/DeliveryJourney";
import { Kpi } from "@/components/ds/Status";
import { Icon } from "@/components/site/Icon";
import { StaffSignOut } from "@/components/staff/StaffSignOut";
import { TeamWavePicker } from "@/components/staff/TeamWavePicker";
import { sortWaves } from "@/lib/waves/order";
import { loadWavePeople } from "@/lib/pulse/experience-data";
import { experience, operational } from "@/lib/pulse/experience";
import { ExperienceByStage, ExperienceDetail } from "@/components/pulse/WaveExperience";

export const metadata = { title: "Acompañamiento · Equipo AI Edge Talent" };
export const dynamic = "force-dynamic";

const ADMISSION = ["NOMINATED", "INVITED", "IDENTIFIED", "APPLICATION_STARTED", "APPLICATION_SUBMITTED", "ASSESSMENT_EVALUATED", "HUMAN_REVIEW", "RESCUE_REQUIRED", "SELECTED", "CONDITIONS_PENDING"];
const ORDER = ["assessment", "mindset", "certs", "lab", "showcase", "closure"];

/** Inicio de Delivery: en qué etapa está cada profesional, qué viene, qué te toca y qué necesita atención. */
export default async function EquipoHome({ searchParams }: { searchParams: Promise<{ wave?: string }> }) {
  const { wave: wq } = await searchParams;
  const viewer = await requireTeamPage("/equipo");
  // Business Partner: solo lectura. No tiene permisos de staff en la base; ya autorizado arriba, lee con la llave de servicio.
  const readOnly = viewer.role === "bp";
  const db = readOnly ? supabaseService() : await supabaseUser();
  const { data: rawWaves } = await db.from("waves").select("id, name, status");
  const waves = sortWaves(rawWaves ?? []);
  const { data: counts } = await db.from("candidates").select("wave_id").in("wave_id", waves.map((w) => w.id));
  const open = (waves ?? []).filter((w) => w.status !== "CLOSED");
  const wave = (waves ?? []).find((w) => w.id === wq) ?? open[0] ?? waves?.[0] ?? null;

  let live: StageLive[] = DELIVERY_STAGES.map((s) => ({ id: s.id, status: "pending", people: 0, attention: [] }));
  let totals = { admission: 0, journey: 0, attention: 0 };
  if (wave) {
    const [{ data: adm }, report, { data: labs }] = await Promise.all([
      db.from("candidates").select("id", { count: "exact" }).eq("wave_id", wave.id).in("status", ADMISSION),
      waveReport(wave.id, new Date(), readOnly ? supabaseService() : undefined),
      db.from("lab_projects").select("status, lab_project_members(candidate_id)").eq("wave_id", wave.id),
    ]);
    const ready = new Set((labs ?? []).filter((p) => p.status === "READY").flatMap((p) => (p.lab_project_members as { candidate_id: string }[]).map((m) => m.candidate_id)));
    const at = (id: string) => report.persons.filter((p) => {
      if (id === "mindset") return !p.layer || p.layer === "AI_MINDSET" || p.layer === "ASSESSMENT";
      if (id === "certs") return p.layer === "ROLE_ENABLEMENT";
      if (id === "lab") return p.layer === "AI_LAB_SHOWCASE" && !ready.has(p.id);
      if (id === "showcase") return p.layer === "AI_LAB_SHOWCASE" && ready.has(p.id);
      if (id === "closure") return p.layer === "CLOSURE";
      return false;
    });
    const counts = Object.fromEntries(ORDER.map((id) => [id, id === "assessment" ? (adm ?? []).length : at(id).length]));
    const lastWithPeople = Math.max(...ORDER.map((id, i) => (counts[id] > 0 ? i : -1)));
    live = ORDER.map((id, i) => {
      const attention = id === "assessment" ? [] : at(id).filter((p) => p.alert).map((p) => ({ id: p.id, name: p.name, reason: p.alert!.reason, action: p.alert!.action, level: p.alert!.level }));
      const status: StageLive["status"] = attention.length ? "attention" : counts[id] > 0 ? "progress" : i < lastWithPeople ? "done" : "pending";
      return { id, status, people: counts[id], attention };
    });
    totals = { admission: counts.assessment, journey: report.persons.length, attention: live.reduce((n, l) => n + l.attention.length, 0) };
  }

  // Experiencia de tus profesionales: solo las personas asignadas a este Delivery; las respuestas, solo si el admin las compartió.
  let mine: Awaited<ReturnType<typeof loadWavePeople>> | null = null;
  let shared = false;
  if (wave && viewer.role === "delivery") {
    const svc = supabaseService();
    const [{ data: assigned }, { data: ws }] = await Promise.all([
      svc.from("delivery_assignments").select("candidate_id").eq("wave_id", wave.id).eq("delivery_email", viewer.email),
      svc.from("wave_settings").select("share_experience").eq("wave_id", wave.id).maybeSingle(),
    ]);
    shared = Boolean(ws?.share_experience);
    mine = await loadWavePeople(wave.id, { onlyIds: (assigned ?? []).map((a) => a.candidate_id), withAnswers: shared });
  }
  const mineOps = mine ? operational(mine) : null;

  return (
    <div className="team">
      <header className="team-head">
        <div>
          <div className="eyebrow">Área de equipo · Acompañamiento</div>
          <h1>Hola{viewer.fullName ? `, ${viewer.fullName.split(" ")[0]}` : ""}.</h1>
          <p>Dónde está cada profesional, qué viene y qué te toca. Elige una etapa para ver tu gestión.</p>
        </div>
        <div className="team-head-actions">
          {waves.length > 1 && wave && <TeamWavePicker waves={waves.map((w) => ({ ...w, people: (counts ?? []).filter((c) => c.wave_id === w.id).length }))} value={wave.id} />}
          <StaffSignOut />
        </div>
      </header>

      <div className="team-kpis">
        <Kpi label="En admisión" value={totals.admission} hint="Nominados, postulando o en evaluación" />
        <Kpi label="En el journey" value={totals.journey} hint="Inscritos y avanzando" />
        <Kpi label="Requieren atención" value={totals.attention} hint={totals.attention ? "Revisa la etapa marcada" : "Sin alertas por ahora"} />
      </div>

      <DeliveryJourney stages={DELIVERY_STAGES} live={live} waveId={wave?.id ?? null} />

      {mine && mineOps && (
        <section className="team-exp stack" aria-labelledby="exp-t">
          <div>
            <h2 id="exp-t" style={{ margin: 0 }}>Experiencia de tus profesionales</h2>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Solo las personas que tienes asignadas en esta Wave, en modo lectura.{" "}
              {shared ? "El Líder de Servicio compartió su experiencia declarada en los pulsos de cierre." : "Ves su avance; su experiencia declarada aparecerá si el Líder de Servicio la comparte."}
            </p>
          </div>
          {mine.length === 0 ? (
            <p className="muted">Aún no tienes profesionales asignados en esta Wave. Si debieras tenerlos, avísale al Líder de Servicio.</p>
          ) : (
            <>
              <div className="team-kpis">
                <Kpi label="Asignados" value={mineOps.enrolled} hint={mineOps.neverSignedIn ? `${mineOps.neverSignedIn} sin primer ingreso` : "Todos ingresaron"} />
                <Kpi label="Pulsos de cierre pendientes" value={mineOps.pulsePending} hint={mineOps.pulsePending ? "Recuérdales responderlo: sin él no avanzan" : "Al día"} />
                <Kpi label="Requieren atención" value={mineOps.attention} />
                {shared && <Kpi label="Satisfacción promedio" value={experience(mine).satisfaction === null ? "—" : String(experience(mine).satisfaction).replace(".", ",")} hint="De 1 a 5, en sus pulsos de cierre" />}
              </div>
              <ExperienceDetail people={mine} showExperience={shared} />
              {shared && (
                <details>
                  <summary><strong>Ver sus respuestas por etapa</strong></summary>
                  <div className="stack" style={{ marginTop: 12 }}><ExperienceByStage exp={experience(mine)} /></div>
                </details>
              )}
            </>
          )}
        </section>
      )}

      <section className="team-res" aria-labelledby="res-t">
        <h2 id="res-t">Recursos del equipo</h2>
        <div className="team-res-grid">
          <Link href="/equipo/playbook" className="ds-tile"><Icon name="book" size={22} /><strong>Playbook de acompañamiento</strong><span>Checklists, comunicaciones, riesgos y escalamiento por etapa.</span></Link>
          <Link href="/responsabilidades" className="ds-tile"><Icon name="users" size={22} /><strong>Responsabilidades (RACI)</strong><span>Quién hace, decide, es consultado e informado.</span></Link>
          {!readOnly && <Link href={wave ? `/admin/admision/${wave.id}` : "/admin"} className="ds-tile"><Icon name="grid" size={22} /><strong>Portal operativo</strong><span>Admisión, journey, clases, pulsos y AI Lab de la Wave.</span></Link>}
        </div>
      </section>
      <p className="team-note">Registramos tus ingresos y las secciones del área de equipo que consultas, solo para auditoría (180 días).</p>
    </div>
  );
}
