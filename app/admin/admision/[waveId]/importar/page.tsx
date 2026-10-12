import Link from "next/link";
import { requireStaffPage } from "@/lib/admission/auth";
import { ImportForm } from "@/components/admission/ImportForm";

export default async function ImportPage({ params }: { params: Promise<{ waveId: string }> }) {
  const { waveId } = await params;
  await requireStaffPage(`/admin/admision/${waveId}/importar`);
  return (
    <div className="stack narrow">
      <div className="eyebrow"><Link href={`/admin/admision/${waveId}`}>← Candidatos</Link></div>
      <h1>Importar base de candidatos</h1>
      <p className="muted">
        Sube un CSV (exportado de Excel o Monday) o pega el contenido. Columnas reconocidas: <strong>Nombre</strong>, <strong>Correo</strong> (obligatorias), Cliente, Rol, Equipo, Especialidad, Delivery.
        Separador coma o punto y coma. Los correos ya existentes en la Wave no se duplican.
      </p>
      <ImportForm waveId={waveId} />
    </div>
  );
}
