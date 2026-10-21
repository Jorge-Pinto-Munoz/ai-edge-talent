import { NextResponse } from "next/server";
import { getViewer } from "@/lib/admission/auth";
import { buildContactWorkbook } from "@/lib/admin/export";

export const dynamic = "force-dynamic";

/** Informe de contactos de la Wave (nombre, cliente, rol, correo, teléfono, Delivery, puntaje, video de rescate). Solo admin. */
export async function GET(_: Request, { params }: { params: Promise<{ waveId: string }> }) {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return NextResponse.json({ error: "Solo admin." }, { status: 403 });
  const { waveId } = await params;
  const { buffer, filename } = await buildContactWorkbook(waveId);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
