import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admission/admin-only";
import { ClientPortal } from "@/components/client/ClientPortal";

export const metadata = { title: "Ver como cliente · Portal AET" };
export const dynamic = "force-dynamic";

export default async function VerCliente({ searchParams }: { searchParams: Promise<{ nombre?: string }> }) {
  await requireAdminPage("/admin/vista");
  const { nombre } = await searchParams;
  if (!nombre) notFound();
  return (
    <div className="stack">
      <div className="jr-preview" role="note"><span><strong>Vista de admin</strong> · así ve la plataforma {nombre}.</span></div>
      <ClientPortal clientName={nombre} preview />
    </div>
  );
}
