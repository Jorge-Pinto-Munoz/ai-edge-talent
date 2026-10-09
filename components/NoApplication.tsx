"use client";

import Link from "next/link";
import { useStore } from "@/lib/store/StoreProvider";
import { setCurrentApplication } from "@/lib/store/state";
import { ADMISSION_LABEL } from "@/lib/domain/types";

export function NoApplication() {
  const { state, run } = useStore();
  return (
    <div className="stack narrow">
      <h1>Aún no tienes una postulación en este navegador</h1>
      <p className="muted">Si recibiste una invitación, usa tu enlace personal. También puedes postular directamente a Wave 3.</p>
      <Link className="btn" href="/wave-3/postular">
        Postular a Wave 3
      </Link>
      <div className="card">
        <div className="eyebrow">Demo</div>
        <p className="muted">Ver la plataforma como uno de los participantes de demostración:</p>
        <div className="row">
          {state.applications.map((a) => (
            <button key={a.id} className="btn ghost small" onClick={() => run((s) => setCurrentApplication(s, a.id))}>
              {a.participantName} · {ADMISSION_LABEL[a.applicationStatus]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
