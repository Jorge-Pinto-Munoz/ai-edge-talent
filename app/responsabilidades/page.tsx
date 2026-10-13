import Link from "next/link";
import { ResponsibilityMatrix } from "@/components/journey";
import { requireTeamPage } from "@/lib/staff/guard";

export const metadata = { title: "Responsabilidades · AET Platform" };

export const dynamic = "force-dynamic";

export default async function RaciPage() {
  await requireTeamPage("/responsabilidades");
  return (
    <div className="stack team">
      <div className="eyebrow"><Link href="/equipo">Área de equipo</Link> · RACI</div>
      <h1>Matriz de responsabilidades (RACI)</h1>
      <p className="lead">
        R = Responsible · A = Accountable · C = Consulted · I = Informed. Solo se muestran responsabilidades definidas por Product HQ; el resto queda como{" "}
        <span className="pending-def">PENDIENTE DE DEFINICIÓN</span>.
      </p>
      <ResponsibilityMatrix />
    </div>
  );
}
