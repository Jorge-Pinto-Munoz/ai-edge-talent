import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/admission/auth";
import { myJourney } from "@/lib/journey/queries";
import { buildJourneyView } from "@/lib/journey/view";
import { JourneyApp } from "@/components/journey/path/JourneyApp";
import { Icon } from "@/components/site/Icon";

export const metadata = { title: "Mi journey · AI Edge Talent" };
export const dynamic = "force-dynamic";

export default async function MiJourney() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/mi-journey");
  const j = await myJourney(viewer.id);

  if (!j) {
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

  const view = await buildJourneyView(j, viewer.id);
  return <JourneyApp v={view} />;
}
