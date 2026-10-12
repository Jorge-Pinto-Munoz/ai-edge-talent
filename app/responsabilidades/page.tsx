import { ResponsibilityMatrix } from "@/components/journey";

export const metadata = { title: "Responsabilidades · AET Platform" };

export default function RaciPage() {
  return (
    <div className="stack">
      <h1>Matriz de responsabilidades (RACI)</h1>
      <p className="lead">
        R = Responsible · A = Accountable · C = Consulted · I = Informed. Solo se muestran responsabilidades definidas por Product HQ; el resto queda como{" "}
        <span className="pending-def">PENDIENTE DE DEFINICIÓN</span>.
      </p>
      <ResponsibilityMatrix />
    </div>
  );
}
