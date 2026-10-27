import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { ContentEditor } from "@/components/journey-admin/ContentEditor";
import { PublicStageVideos } from "@/components/journey-admin/PublicStageVideos";
import { publicStageVideos } from "@/lib/site/stage-videos";
import { PUBLIC_STAGES } from "@/lib/data/site";
import { Callout, fmtDate } from "@/components/ui";
import type { Capsule, StageGuide } from "@/lib/journey/queries";

export const dynamic = "force-dynamic";

export default async function Contenido({ params }: { params: Promise<{ waveId: string }> }) {
  const { waveId } = await params;
  const viewer = await requireStaffPage(`/admin/contenido/${waveId}`);
  if (viewer.role !== "admin") redirect("/sin-acceso");
  const db = await supabaseUser();
  const { data: wave } = await db.from("waves").select("id, name").eq("id", waveId).single();
  if (!wave) notFound();
  const [{ data: guides }, { data: capsules }, { data: opening }] = await Promise.all([
    db.from("stage_guides").select("*").eq("wave_id", waveId),
    db.from("capsules").select("*").eq("wave_id", waveId).order("layer").order("position"),
    db.from("wave_stage_openings").select("opens_at").eq("wave_id", waveId).eq("layer", "AI_MINDSET").maybeSingle(),
  ]);
  // Las cápsulas de AI First Mindset solo las ven los profesionales cuando la etapa está abierta para la Wave.
  const opensAt = opening?.opens_at ?? null;
  const mindsetOpen = Boolean(opensAt && new Date(opensAt).getTime() <= Date.now());
  const mindsetPublished = (capsules ?? []).filter((c) => c.layer === "AI_MINDSET" && c.published).length;
  return (
    <div className="stack">
      <div>
        <div className="eyebrow"><Link href={`/admin/journey/${waveId}`}>← Journey</Link> · {wave.name}</div>
        <h1 style={{ margin: 0 }}>Contenido y videos</h1>
        <p className="muted">Video explicativo por etapa y micro-cápsulas con material descargable y tareas. Los videos pueden ser un enlace (YouTube no listado, Vimeo, Stream) o un archivo subido.</p>
      </div>
      {!mindsetOpen && (
        <Callout tone="warn" title={opensAt ? `AI First Mindset abre el ${fmtDate(opensAt)}: hasta entonces los profesionales no ven sus cápsulas.` : `AI First Mindset está cerrada para ${wave.name}: los profesionales no ven ${mindsetPublished ? `las ${mindsetPublished} cápsulas publicadas` : "sus cápsulas"}.`}>
          <Link className="btn small" href={`/admin/journey/${waveId}/mindset`}>Abrir o programar la etapa</Link>
        </Callout>
      )}
      <PublicStageVideos stages={PUBLIC_STAGES.map((st) => ({ slug: st.slug, name: st.name }))} videos={await publicStageVideos()} />
      <ContentEditor waveId={waveId} guides={(guides ?? []) as StageGuide[]} capsules={(capsules ?? []) as Capsule[]} />
    </div>
  );
}
