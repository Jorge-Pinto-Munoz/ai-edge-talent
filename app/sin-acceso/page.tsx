import Link from "next/link";
import { SignOut } from "@/components/admission/SignOut";

export const metadata = { title: "Sin acceso · AI Edge Talent" };

export default function SinAcceso() {
  return (
    <section className="state-page" aria-labelledby="sa-title">
      <span className="state-code" aria-hidden="true">⌀</span>
      <h1 id="sa-title">Esta sección no es para tu cuenta</h1>
      <p>Cada persona ve solo lo que le corresponde según su rol. Si crees que deberías tener acceso, pídeselo a un admin de AI Edge Talent.</p>
      <div className="row" style={{ gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Link className="btn" href="/inicio">Ir a mi espacio</Link>
        <SignOut onDark={false} label="Ingresar con otra cuenta" />
      </div>
    </section>
  );
}
