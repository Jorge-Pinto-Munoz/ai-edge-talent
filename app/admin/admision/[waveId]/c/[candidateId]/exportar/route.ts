import { NextResponse } from "next/server";
import { getViewer } from "@/lib/admission/auth";
import { buildAdmissionWorkbook } from "@/lib/admin/export";

export const dynamic = "force-dynamic";

/** Excel de un candidato: su evaluación, análisis ejecutivo y respuestas. Solo admin. */
export async function GET(_: Request, { params }: { params: Promise<{ waveId: string; candidateId: string }> }) {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return NextResponse.json({ error: "Solo admin." }, { status: 403 });
  const { waveId, candidateId } = await params;
  const { buffer, filename } = await buildAdmissionWorkbook(waveId, candidateId);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}
