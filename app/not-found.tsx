import Link from "next/link";

export const metadata = { title: "Página no encontrada · AI Edge Talent" };

export default function NotFound() {
  return (
    <section className="state-page" aria-labelledby="nf-title">
      <span className="state-code" aria-hidden="true">404</span>
      <h1 id="nf-title">No encontramos esta página</h1>
      <p>Puede que el enlace haya cambiado o que ya no esté disponible. Si llegaste desde un correo, revisa que el enlace esté completo.</p>
      <div className="row" style={{ gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <Link className="btn" href="/">Ir al inicio</Link>
        <Link className="btn ghost" href="/inicio">Ir a mi espacio</Link>
      </div>
    </section>
  );
}
