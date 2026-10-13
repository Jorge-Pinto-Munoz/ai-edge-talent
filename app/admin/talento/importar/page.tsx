import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { HistoricalImport } from "@/components/talent/HistoricalImport";

export const dynamic = "force-dynamic";

export default async function ImportarHistorico() {
  const viewer = await requireStaffPage("/admin/talento/importar");
  if (viewer.role !== "admin") redirect("/sin-acceso");
  return (
    <div className="stack narrow">
      <div className="eyebrow"><Link href="/admin/talento">← Pool de talento</Link></div>
      <h1>Cargar participantes de Waves pasadas</h1>
      <p className="muted">
        CSV con columnas <strong>Nombre</strong> y <strong>Wave</strong> (p.ej. “Wave 1”); <strong>Correo</strong> recomendado (sin correo la persona queda registrada y se completa después) y opcionalmente Cliente, Rol, Especialidad, <strong>Certificación AI CERT</strong> (Sí / No), <strong>Resultado</strong> (Completó / No) y <strong>Estado servicio</strong> (En servicio / Banca / Salió).
        Si la persona ya existe, se reutiliza su ficha de talento.
      </p>
      <HistoricalImport />
    </div>
  );
}
