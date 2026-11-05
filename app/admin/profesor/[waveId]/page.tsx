import { redirect } from "next/navigation";
import { requireAnyRolePage } from "@/lib/admission/auth";
import { supabaseService } from "@/lib/supabase/server";
import { ReSessions } from "@/components/teacher/ReSessions";

export const metadata = { title: "Sesiones de Role Enablement · Portal AET" };
export const dynamic = "force-dynamic";

/** Espacio del profesor: las 4 sesiones semanales de Role Enablement de su Wave. Admin y Delivery las ven en la etapa. */
export default async function ProfesorWave({ params, searchParams }: { params: Promise<{ waveId: string }>; searchParams: Promise<{ s?: string }> }) {
  const { waveId } = await params;
  const { s } = await searchParams;
  const viewer = await requireAnyRolePage(`/admin/profesor/${waveId}`, ["admin", "delivery", "profesor"]);
  if (viewer.role !== "profesor") redirect(`/admin/journey/${waveId}/role-enablement?tab=clases`);
  const { data: wave } = await supabaseService().from("waves").select("name").eq("id", waveId).maybeSingle();
  return (
    <div className="adm">
      <header className="adm-head">
        <div>
          <div className="eyebrow">{wave?.name ?? waveId} · Profesor/a</div>
          <h1>Sesiones de Role Enablement</h1>
          <p className="muted" style={{ maxWidth: 760 }}>
            Son 4 sesiones, una por semana. Después de cada una deja la fecha, el tema, tus notas y el material para los profesionales;
            marca la asistencia y, si quieres, un comentario sobre cada persona. Lo marcado con candado solo lo ve el admin.
          </p>
        </div>
      </header>
      <ReSessions waveId={waveId} viewer={viewer} open={Number(s) || undefined} />
    </div>
  );
}
