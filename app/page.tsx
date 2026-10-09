"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store/StoreProvider";
import { setRole } from "@/lib/store/state";
import type { Role } from "@/lib/domain/types";
import { LifecycleRail } from "@/components/journey";

const ENTRIES: { role: Role; title: string; body: string; href: string }[] = [
  { role: "KIBER", title: "Soy profesional / Kiber", body: "Postula, revisa tu estado, acepta tu compromiso y sigue tu journey.", href: "/kiber" },
  { role: "CLIENT", title: "Soy cliente", body: "Conoce tu rol en cada fase, nomina profesionales y revisa su avance.", href: "/client/journey" },
  { role: "DELIVERY", title: "Soy Delivery", body: "Opera Waves, revisa nominaciones y consulta qué hacer en cada etapa.", href: "/delivery/waves" },
  { role: "PRODUCT_LEAD", title: "Soy Product Lead", body: "Prepara Waves, verifica readiness y declara WAVE READY.", href: "/admin/waves" },
];

const PRINCIPLE: [string, string, string][] = [
  ["Qué es AET", "/programa", "Portal del programa"],
  ["Dónde estamos", "/delivery/waves", "Wave Portfolio · /kiber · /client/journey"],
  ["Qué ocurrió", "/delivery/waves/wave-3", "Historial de eventos por participante"],
  ["Qué toca ahora", "/kiber", "Siguiente paso por rol"],
  ["Quién es responsable", "/responsabilidades", "Matriz RACI"],
  ["Qué evidencia necesitamos", "/delivery/playbook", "Evidencia por etapa"],
  ["Qué regla aplica", "/kiber/conditions", "Condiciones versionadas"],
  ["Qué puede pasar después", "/programa", "¿Qué pasa si no apruebo?"],
  ["Dónde pedir ayuda", "/ayuda", "FAQ por rol"],
];

export default function Home() {
  const { run } = useStore();
  const router = useRouter();
  return (
    <div className="stack">
      <section className="hero">
        <div className="eyebrow">AI Edge Talent · Kibernum</div>
        <h1>AET Platform</h1>
        <p className="lead">
          El ciclo completo de AI Edge Talent en un solo lugar: desde la preparación de la Wave y la nominación hasta el Showcase, el cierre y la adopción piloto.
        </p>
        <div className="row">
          <Link className="btn" href="/wave-3/postular">
            Postular a Wave 3
          </Link>
          <Link className="btn secondary" href="/programa">
            Conocer cómo funciona AI Edge Talent
          </Link>
        </div>
      </section>

      <h2>Entrar según tu rol</h2>
      <div className="grid grid-2">
        {ENTRIES.map((e) => (
          <button
            key={e.role}
            className="card"
            style={{ textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }}
            onClick={() => {
              run((s) => setRole(s, e.role));
              router.push(e.href);
            }}
          >
            <h3>{e.title}</h3>
            <p className="muted" style={{ margin: 0 }}>{e.body}</p>
          </button>
        ))}
      </div>

      <h2>Ciclo completo AET</h2>
      <p className="muted">Las etapas de preparación, comerciales y de admisión se distinguen del journey pedagógico oficial.</p>
      <LifecycleRail />

      <h2>Sin preguntar por fuera del sistema</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pregunta</th>
              <th>Dónde se responde</th>
            </tr>
          </thead>
          <tbody>
            {PRINCIPLE.map(([q, href, where]) => (
              <tr key={q}>
                <td>{q}</td>
                <td>
                  <Link href={href}>{where}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
