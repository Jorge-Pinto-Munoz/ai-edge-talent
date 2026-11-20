import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admission/admin-only";
import { getViewer } from "@/lib/admission/auth";
import { supabaseService } from "@/lib/supabase/server";
import { ReSessions } from "@/components/teacher/ReSessions";

export const metadata = { title: "Ver como AI Coach · Portal AET" };
export const dynamic = "force-dynamic";

/**
 * Ver como AI Coach: lo que ve al entrar — «Mis sesiones» de Role Enablement de sus Waves (asignadas por correo en
 * wave_staff). El admin lo ve con sus propios permisos.
 */
export default async function VerCoach({ searchParams }: { searchParams: Promise<{ id?: string; wave?: string }> }) {
  await requireAdminPage("/admin/vista");
  const viewer = (await getViewer())!;
  const { id, wave } = await searchParams;
  if (!id) notFound();
  const svc = supabaseService();
  const { data: p } = await svc.from("profiles").select("id, full_name, email, role").eq("id", id).maybeSingle();
  if (!p || p.role !== "mentor") notFound();
  const { data: staff } = await svc.from("wave_staff").select("wave_id").eq("email", p.email.toLowerCase()).eq("role", "mentor");
  const waveIds = (staff ?? []).map((s) => s.wave_id);
  const { data: waves } = waveIds.length ? await svc.from("waves").select("id, name").in("id", waveIds).order("created_at", { ascending: false }) : { data: [] as { id: string; name: string }[] };
  const current = (waves ?? []).find((w) => w.id === wave) ?? (waves ?? [])[0] ?? null;
  const name = p.full_name ?? p.email;
  return (
    <div className="adm">
      <div className="jr-preview" role="note"><span><strong>Vista de admin</strong> · así ve su portal {name} (AI Coach). Tú lo ves con tus permisos de admin.</span></div>
      <header className="adm-head">
        <div>
          <div className="eyebrow">{current ? `${current.name} · AI Coach` : "AI Coach"}</div>
          <h1>Sesiones de Role Enablement</h1>
          <p className="muted" style={{ maxWidth: 760 }}>Al ingresar, {name.split(" ")[0]} llega aquí: registra las 4 sesiones de sus Waves. En su menú también ve Assessment, AI First Mindset y Role Enablement en solo lectura, y su feedback semanal.</p>
        </div>
      </header>
      {!current ? (
        <section className="adm-card"><div className="empty"><strong>Aún no tiene Waves asignadas.</strong><span>Asígnaselas en Usuarios y accesos → su ficha → «Waves que acompaña como AI Coach».</span></div></section>
      ) : (
        <>
          {(waves ?? []).length > 1 && (
            <nav className="view-toggle" aria-label="Waves del AI Coach">
              {(waves ?? []).map((w) => <a key={w.id} href={`/admin/vista/coach?id=${p.id}&wave=${w.id}`} aria-current={w.id === current.id ? "true" : undefined}>{w.name.replace("AI Edge Talent · ", "")}</a>)}
            </nav>
          )}
          <ReSessions waveId={current.id} viewer={viewer} />
        </>
      )}
    </div>
  );
}
