import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { ContentEditor } from "@/components/journey-admin/ContentEditor";
import type { Capsule, StageGuide } from "@/lib/journey/queries";

export const dynamic = "force-dynamic";

export default async function Contenido({ params }: { params: Promise<{ waveId: string }> }) {
  const { waveId } = await params;
  const viewer = await requireStaffPage(`/admin/contenido/${waveId}`);
  if (viewer.role !== "admin") redirect("/sin-acceso");
  const db = await supabaseUser();
  const { data: wave } = await db.from("waves").select("id, name").eq("id", waveId).single();
  if (!wave) notFound();
  const [{ data: guides }, { data: capsules }] = await Promise.all([
    db.from("stage_guides").select("*").eq("wave_id", waveId),
    db.from("capsules").select("*").eq("wave_id", waveId).order("layer").order("position"),
  ]);
  return (
    <div className="stack">
      <div>
        <div className="eyebrow"><Link href={`/admin/journey/${waveId}`}>← Journey</Link> · {wave.name}</div>
        <h1 style={{ margin: 0 }}>Contenido y videos</h1>
        <p className="muted">Video explicativo por etapa y micro-cápsulas con material descargable y tareas. Los videos pueden ser un enlace (YouTube no listado, Vimeo, Stream) o un archivo subido.</p>
      </div>
      <ContentEditor waveId={waveId} guides={(guides ?? []) as StageGuide[]} capsules={(capsules ?? []) as Capsule[]} />
    </div>
  );
}
