import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/admission/auth";
import { myJourney } from "@/lib/journey/queries";
import { buildJourneyView } from "@/lib/journey/view";
import { JourneyApp } from "@/components/journey/path/JourneyApp";
import { Icon } from "@/components/site/Icon";
import { supabaseService } from "@/lib/supabase/server";
import { loadPortalData } from "@/lib/admission/portal-data";
import { CandidatePortal } from "@/components/admission/CandidatePortal";
import { isDemoEmail } from "@/lib/identity/demo";
import { SignOut } from "@/components/admission/SignOut";
import { after } from "next/server";
import { notifyStageOpen } from "@/lib/journey/opening";

export const metadata = { title: "Mi journey · AI Edge Talent" };
export const dynamic = "force-dynamic";

export default async function MiJourney() {
  const viewer = await getViewer();
  if (!viewer) redirect("/ingresar?next=/mi-journey");
  const j = await myJourney(viewer.id);

  if (!j) {
    // Aún sin journey: si tiene una postulación, ve su estado y resultado (el mismo portal de su enlace personal).
    const svc = supabaseService();
    const byUser = await svc.from("candidates").select("id").eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const byEmail = byUser.data ? null : await svc.from("candidates").select("id").eq("corporate_email", viewer.email).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const cand = byUser.data ?? byEmail?.data ?? null;
    const portal = cand ? await loadPortalData({ candidateId: cand.id }) : null;
    if (portal) {
      const first = portal.candidate.fullName.split(" ")[0];
      const out = portal.candidate.status === "NOT_SELECTED";
      return (
        <div className="stack mj-cand">
          {isDemoEmail(viewer.email) && <p className="jr-preview" role="note"><Icon name="user" size={18} /><span><strong>Cuenta de demostración</strong> · datos ficticios.</span></p>}
          <div className="spread">
            <h1 style={{ margin: 0 }}>Hola, {first}</h1>
            <div className="row" style={{ gap: 8 }}>
              <Link className="btn ghost" href="/">Ir al inicio</Link>
              <SignOut onDark={false} />
            </div>
          </div>
          <CandidatePortal data={portal} inPortal />
          {!out && portal.candidate.status !== "APPLICATION_STARTED" && (
            <nav className="row" aria-label="Seguir navegando" style={{ gap: 10, flexWrap: "wrap" }}>
              <Link className="btn" href="/">Volver al inicio</Link>
              <Link className="btn ghost" href="/programa">Conocer el programa</Link>
            </nav>
          )}
          {out && (
            <section className="card" aria-labelledby="mj-next">
              <h2 id="mj-next" style={{ marginTop: 0 }}>Qué sigue para ti</h2>
              <ul className="mj-next">
                <li><Icon name="users" size={18} /><span>Quedas en la <strong>banca de talento</strong>: te avisaremos cuando se abra la postulación de una próxima Wave.</span></li>
                <li><Icon name="spark" size={18} /><span>Mientras, prueba la IA en una tarea real de tu trabajo y anota qué cambió: es justo lo que evaluamos.</span></li>
                <li><Icon name="chat" size={18} /><span>¿Dudas sobre tu resultado? Escríbele a tu Delivery{portal.candidate.deliveryOwner ? ` (${portal.candidate.deliveryOwner})` : ""} o usa Ayuda.</span></li>
              </ul>
              <Link className="btn ghost" href="/programa">Conocer el programa</Link>
            </section>
          )}
        </div>
      );
    }
    return (
      <section className="state-page" aria-labelledby="mj-empty">
        <span className="state-code" aria-hidden="true"><Icon name="route" size={34} /></span>
        <h1 id="mj-empty">Tu journey aún no comienza</h1>
        <p>Se activa cuando aceptas tu compromiso de participación. Si ya postulaste, revisa el enlace personal que te enviamos por correo: ahí ves tu estado.</p>
        <div className="row" style={{ gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link className="btn" href="/programa">Conocer el programa</Link>
          <Link className="btn ghost" href="/postular/registro?wave=wave-3">Postular</Link>
        </div>
      </section>
    );
  }

  // Apertura programada ya vencida y aún sin aviso (el cron es diario): el aviso sale después de responder.
  after(() => notifyStageOpen(j.candidate.wave_id).catch(() => undefined));
  // Cuentas de demostración: se ven como el profesional, con los envíos desactivados.
  const view = await buildJourneyView(j, viewer.id, isDemoEmail(viewer.email) ? { label: j.candidate.full_name, demo: true } : null);
  return <JourneyApp v={view} />;
}
