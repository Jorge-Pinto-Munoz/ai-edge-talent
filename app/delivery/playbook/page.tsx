import { DeliveryPlaybookList, ExpectationCard } from "@/components/journey";
import { LIFECYCLE } from "@/lib/data/journey";
import Link from "next/link";

export const metadata = { title: "Delivery Playbook · AET Platform" };

export default function Page() {
  return (
    <div className="stack">
      <h1>Delivery Playbook</h1>
      <p className="lead">Qué debe hacer Delivery en cada etapa: qué hacer, qué no hacer, qué evidencia debe existir, cuándo escalar y qué comunicar.</p>
      <p>
        Ver también: <Link href="/responsabilidades">RACI</Link> · <Link href="/delivery/onboarding">Mi readiness</Link> · <Link href="/ayuda?rol=DELIVERY">FAQ Delivery</Link>
      </p>
      <DeliveryPlaybookList />
      <h2>Expectativas por etapa</h2>
      <p className="muted">La misma información del journey, con la mirada de Delivery, Cliente y la evidencia AET.</p>
      {LIFECYCLE.map((s) => (
        <ExpectationCard key={s.id} stageId={s.id} audiences={["delivery", "client", "aetEvidence"]} />
      ))}
    </div>
  );
}
