import { redirect } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { SupportStatusButton } from "@/components/admin/SupportStatusButton";
import { Icon } from "@/components/site/Icon";
import { Badge, fmtDate } from "@/components/ui";

export const metadata = { title: "Soporte · Portal AET" };
export const dynamic = "force-dynamic";

type Req = { id: string; created_at: string; name: string; email: string; audience: string; topic: string; message: string; page: string | null; status: "OPEN" | "RESOLVED"; email_status: "PENDING" | "SENT" | "FAILED"; email_error: string | null; resolved_at: string | null };

export default async function Soporte({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const viewer = await requireStaffPage("/admin/soporte");
  if (viewer.role !== "admin") redirect("/sin-acceso");
  const ver = (await searchParams).ver === "resueltas" ? "RESOLVED" : "OPEN";
  const db = await supabaseUser();
  const { data } = await db.from("support_requests").select("*").order("created_at", { ascending: false }).limit(200);
  const all = (data ?? []) as Req[];
  const rows = all.filter((r) => r.status === ver);
  const open = all.filter((r) => r.status === "OPEN").length;
  const failed = all.filter((r) => r.status === "OPEN" && r.email_status !== "SENT").length;

  return (
    <div className="adm">
      <header className="adm-head">
        <div>
          <div className="eyebrow">Canal de soporte</div>
          <h1>Soporte</h1>
          <p className="muted" style={{ maxWidth: 720 }}>Preguntas que llegan desde el botón Ayuda (sitio, portal del profesional y portal del cliente). Cada una te llega por correo; responder el correo le contesta a quien preguntó.</p>
        </div>
        <div className="adm-deadline"><small>Abiertas</small><strong>{open}</strong></div>
      </header>
      {failed > 0 && (
        <div className="callout warn" role="note">
          <strong>{failed} pregunta(s) abiertas no llegaron por correo</strong>
          El envío de correos aún no está configurado (RESEND_API_KEY y RESEND_TEST_TO en Vercel). Las preguntas quedan guardadas aquí igual.
        </div>
      )}
      <nav className="view-toggle" aria-label="Filtrar" style={{ alignSelf: "start" }}>
        <a href="?ver=abiertas" aria-current={ver === "OPEN" ? "true" : undefined}>Abiertas · {open}</a>
        <a href="?ver=resueltas" aria-current={ver === "RESOLVED" ? "true" : undefined}>Resueltas · {all.length - open}</a>
      </nav>
      <section className="adm-card">
        {rows.length === 0 ? (
          <div className="empty"><Icon name="check" size={26} /><span>{ver === "OPEN" ? "No hay preguntas pendientes." : "Aún no hay preguntas resueltas."}</span></div>
        ) : (
          <ul className="support-list">
            {rows.map((r) => (
              <li key={r.id}>
                <div className="support-top">
                  <div>
                    <strong>{r.name}</strong> <small className="muted">· {r.email}</small>
                    <div className="row" style={{ gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                      <Badge tone="brand">{r.topic}</Badge>
                      <Badge>{r.audience === "cliente" ? "Cliente" : r.audience === "profesional" ? "Profesional" : r.audience}</Badge>
                      {r.email_status === "SENT" ? <Badge tone="ok">Correo enviado</Badge> : <Badge tone="warn">Sin correo</Badge>}
                    </div>
                  </div>
                  <small className="muted">{fmtDate(r.created_at)}</small>
                </div>
                <p className="support-msg">{r.message}</p>
                <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
                  <a className="btn small" href={`mailto:${r.email}?subject=${encodeURIComponent(`Re: ${r.topic} · AI Edge Talent`)}&body=${encodeURIComponent(`Hola ${r.name.split(" ")[0]},\n\n\n\n—\nTu pregunta: ${r.message.slice(0, 500)}`)}`}>
                    Responder por correo
                  </a>
                  <SupportStatusButton id={r.id} status={r.status} />
                  {r.page && <small className="muted">Desde {r.page}</small>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
