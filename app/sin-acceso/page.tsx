import Link from "next/link";
import { Callout } from "@/components/ui";

export default function SinAcceso() {
  return (
    <div className="narrow stack">
      <Callout tone="warn" title="Tu cuenta no tiene acceso a esta sección">
        Si necesitas acceso de administración o Delivery, pídeselo a un admin de AI Edge Talent.
      </Callout>
      <Link href="/">Volver al inicio</Link>
    </div>
  );
}
