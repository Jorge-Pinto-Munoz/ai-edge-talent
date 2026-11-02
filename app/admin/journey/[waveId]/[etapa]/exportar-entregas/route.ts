import { NextResponse } from "next/server";
import { getViewer } from "@/lib/admission/auth";
import { buildDeliveriesWorkbook } from "@/lib/admin/export";
import { stageBySlug } from "@/lib/journey/stages";

export const dynamic = "force-dynamic";

/** Reporte de entregas de la etapa (nombre, correo, cliente, estado, puntaje y feedback). Solo admin. */
export async function GET(_: Request, { params }: { params: Promise<{ waveId: string; etapa: string }> }) {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return NextResponse.json({ error: "Solo admin." }, { status: 403 });
  const { waveId, etapa } = await params;
  const stage = stageBySlug(etapa);
  if (!stage || stage.layer === "ASSESSMENT") return NextResponse.json({ error: "Etapa no válida." }, { status: 404 });
  const { buffer, filename } = await buildDeliveriesWorkbook(waveId, stage.layer, stage.name);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
