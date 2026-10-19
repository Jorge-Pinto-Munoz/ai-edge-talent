import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { TEMPLATE_LABEL, type EmailTemplate } from "@/lib/email/templates";
import { TEMPLATE_NAME, type IdentityTemplate } from "@/lib/email/identity";
import { ResendEmail } from "@/components/admin/ResendEmail";

export const metadata = { title: "Comunicaciones · Portal AET" };
export const dynamic = "force-dynamic";

const PAGE = 100;
const fmt = (iso: string) => new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
const typeLabel = (t: string) => TEMPLATE_NAME[t as IdentityTemplate] ?? TEMPLATE_LABEL[t as EmailTemplate] ?? t;
const STATUS: Record<string, [string, string]> = { sent: ["Enviado", "ok"], failed: ["Falló", "bad"], queued: ["En cola", "warn"] };

/** Registro de todos los correos emitidos: a quién, con copia a quién, cuándo, qué decía y si salió. */
export default async function Comunicaciones({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string; tipo?: string; id?: string; p?: string }> }) {
  const { q = "", estado = "", tipo = "", id, p = "1" } = await searchParams;
  const viewer = await requireStaffPage("/admin/comunicaciones");
  if (viewer.role !== "admin") redirect("/sin-acceso");
  const db = await supabaseUser();
  const page = Math.max(1, Number(p) || 1);
  let query = db.from("email_messages").select("id, to_email, cc_emails, template, kind, subject, status, error, created_at, sent_at, wave_id, candidate_id", { count: "exact" }).order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  const term = q.trim().replace(/[%,()]/g, " ");
  if (term) query = query.or(`to_email.ilike.%${term}%,subject.ilike.%${term}%`);
  if (estado) query = query.eq("status", estado);
  if (tipo) query = query.eq("template", tipo);
  const [{ data: rows, count }, { data: types }, sel] = await Promise.all([
    query,
    db.from("email_messages").select("template").order("template").limit(1000),
    id ? db.from("email_messages").select("*").eq("id", id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const msg = sel.data as null | { id: string; to_email: string; cc_emails: string[] | null; subject: string; body_text: string; body_html: string | null; status: string; error: string | null; created_at: string; sent_at: string | null; template: string; kind: string | null };
  const qs = (extra: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    const all = { q, estado, tipo, p: String(page), ...extra };
    for (const [k, v] of Object.entries(all)) if (v) u.set(k, v);
    return `?${u.toString()}`;
  };
  const templates = [...new Set((types ?? []).map((t) => t.template))];

  return (
    <div className="adm comms">
      <header className="adm-head">
        <div>
          <h1>Comunicaciones</h1>
          <p className="muted">Todos los correos que emitió la plataforma: destinatario, copia, fecha, contenido y resultado. {count ?? 0} en total.</p>
        </div>
      </header>

      <form className="adm-filters wide" method="get">
        <input type="search" name="q" defaultValue={q} placeholder="Buscar por correo o asunto" aria-label="Buscar" />
        <select name="tipo" defaultValue={tipo} aria-label="Tipo de correo">
          <option value="">Todos los tipos</option>
          {templates.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
        </select>
        <select name="estado" defaultValue={estado} aria-label="Estado">
          <option value="">Todos los estados</option>
          <option value="sent">Enviados</option>
          <option value="failed">Fallidos</option>
          <option value="queued">En cola</option>
        </select>
        <button className="btn small">Filtrar</button>
      </form>

      <div className={`comms-layout${msg ? " open" : ""}`}>
        <div className="table-wrap" tabIndex={0}>
          <table className="rtable adm-table">
            <thead><tr><th>Fecha y hora</th><th>Para</th><th>Copia</th><th>Asunto</th><th>Estado</th></tr></thead>
            <tbody>
              {(rows ?? []).map((r) => (
                <tr key={r.id} className={r.id === id ? "sel" : undefined}>
                  <td data-label="Fecha"><small>{fmt(r.created_at)}</small></td>
                  <td data-label="Para">{r.to_email}</td>
                  <td data-label="Copia"><small className="muted">{(r.cc_emails ?? []).join(", ") || "—"}</small></td>
                  <td data-label="Asunto"><Link href={qs({ id: r.id })}>{r.subject}</Link><br /><small className="muted">{typeLabel(r.template)}{r.kind === "resend" ? " · reenvío" : ""}</small></td>
                  <td data-label="Estado"><span className={`badge ${STATUS[r.status]?.[1] ?? ""}`}>{STATUS[r.status]?.[0] ?? r.status}</span>{r.error && <><br /><small className="error">{r.error}</small></>}</td>
                </tr>
              ))}
              {!rows?.length && <tr><td colSpan={5} className="muted">No hay correos con estos filtros.</td></tr>}
            </tbody>
          </table>
        </div>

        {msg && (
          <aside className="card comms-detail" aria-label="Detalle del correo">
            <div className="spread"><h2 className="h-card" style={{ margin: 0 }}>{msg.subject}</h2><Link className="btn ghost small" href={qs({ id: undefined })}>Cerrar</Link></div>
            <dl className="comms-meta">
              <div><dt>Para</dt><dd>{msg.to_email}</dd></div>
              <div><dt>Copia</dt><dd>{(msg.cc_emails ?? []).join(", ") || "—"}</dd></div>
              <div><dt>Creado</dt><dd>{fmt(msg.created_at)}</dd></div>
              <div><dt>Enviado</dt><dd>{msg.sent_at ? fmt(msg.sent_at) : "—"}</dd></div>
              <div><dt>Tipo</dt><dd>{typeLabel(msg.template)}</dd></div>
              <div><dt>Estado</dt><dd>{STATUS[msg.status]?.[0] ?? msg.status}{msg.error ? ` · ${msg.error}` : ""}</dd></div>
            </dl>
            {msg.body_html ? (
              <iframe className="comms-frame" title="Contenido del correo" sandbox="" srcDoc={msg.body_html} />
            ) : (
              <pre className="comms-text">{msg.body_text}</pre>
            )}
            <ResendEmail id={msg.id} to={msg.to_email} disabled={/••••/.test(msg.body_text) ? "Este correo llevaba un código de un solo uso: no se reenvía." : undefined} />
          </aside>
        )}
      </div>

      {(count ?? 0) > PAGE && (
        <div className="adm-more">
          {page > 1 && <Link className="btn ghost small" href={qs({ p: String(page - 1), id: undefined })}>Anteriores</Link>}
          <span className="muted">Página {page} de {Math.ceil((count ?? 0) / PAGE)}</span>
          {page * PAGE < (count ?? 0) && <Link className="btn ghost small" href={qs({ p: String(page + 1), id: undefined })}>Siguientes</Link>}
        </div>
      )}
    </div>
  );
}
