import { NextResponse } from "next/server";
import JSZip from "jszip";
import { getViewer } from "@/lib/admission/auth";
import { supabaseService } from "@/lib/supabase/server";
import { stageBySlug } from "@/lib/journey/stages";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type FileRef = { name: string; path: string };
const clean = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^\w.\- ]+/g, "").trim().slice(0, 80) || "archivo";

/**
 * Entregas finales de la etapa en un ZIP: por persona, su entrega aprobada (o la última, si aún no aprueba).
 * Una carpeta por persona. `?ids=` (separados por coma) limita a las personas seleccionadas. Solo admin.
 */
export async function GET(req: Request, { params }: { params: Promise<{ waveId: string; etapa: string }> }) {
  const viewer = await getViewer();
  if (!viewer || viewer.role !== "admin") return NextResponse.json({ error: "Solo admin." }, { status: 403 });
  const { waveId, etapa } = await params;
  const stage = stageBySlug(etapa);
  if (!stage || stage.layer === "ASSESSMENT") return NextResponse.json({ error: "Etapa no válida." }, { status: 404 });
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").map((x) => x.trim()).filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 200);
  const svc = supabaseService();
  let q = svc
    .from("submissions")
    .select("candidate_id, capsule_id, attempt, status, files, capsules!inner(title, layer, wave_id), candidates!inner(full_name)")
    .eq("capsules.layer", stage.layer)
    .eq("capsules.wave_id", waveId);
  if (ids.length) q = q.in("candidate_id", ids);
  const { data: subs } = await q;
  // Por persona y módulo: la aprobada; si no hay, la de mayor intento.
  const best = new Map<string, (typeof subs extends (infer T)[] | null ? T : never)>();
  for (const s of subs ?? []) {
    const k = `${s.candidate_id}:${s.capsule_id}`;
    const cur = best.get(k);
    const better = !cur || (s.status === "APPROVED" && cur.status !== "APPROVED") || (cur.status !== "APPROVED" && s.attempt > cur.attempt);
    if (better) best.set(k, s);
  }
  const zip = new JSZip();
  let n = 0;
  const missing: string[] = [];
  for (const s of best.values()) {
    const person = clean((s.candidates as unknown as { full_name: string }).full_name);
    const title = (s.capsules as unknown as { title: string }).title;
    for (const f of (s.files ?? []) as FileRef[]) {
      const { data } = await svc.storage.from("submissions").download(f.path);
      if (!data) { missing.push(`${person}: ${f.name}`); continue; }
      const tag = s.status === "APPROVED" ? "" : ` (intento ${s.attempt}, sin aprobar)`;
      zip.file(`${person}/${clean(title)}${tag} - ${clean(f.name)}`, new Uint8Array(await data.arrayBuffer()));
      n++;
    }
  }
  if (missing.length) zip.file("_no_descargados.txt", missing.join("\n"));
  if (!n && !missing.length) return NextResponse.json({ error: "Aún no hay entregas en esta etapa." }, { status: 404 });
  const buf = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(buf, {
    headers: {
      "content-type": "application/zip",
      "content-disposition": `attachment; filename="Entregas_${clean(stage.name).replace(/ /g, "_")}_${waveId}_${date}.zip"`,
      "cache-control": "no-store",
    },
  });
}
