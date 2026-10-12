"use client";

import Link from "next/link";
import { useEffect } from "react";

/** Si algo falla al cargar una página, se ofrece reintentar sin perder la sesión. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <section className="state-page" role="alert" aria-labelledby="err-title">
      <span className="state-code" aria-hidden="true">!</span>
      <h1 id="err-title">Algo no salió bien</h1>
      <p>No pudimos cargar esta página. Tus datos guardados no se pierden: vuelve a intentarlo en unos segundos.</p>
      <div className="row" style={{ gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button type="button" className="btn" onClick={reset}>Reintentar</button>
        <Link className="btn ghost" href="/inicio">Ir a mi espacio</Link>
      </div>
      {error.digest && <small className="muted">Código para soporte: {error.digest}</small>}
    </section>
  );
}
