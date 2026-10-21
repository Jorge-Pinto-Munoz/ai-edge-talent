"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/admission/auth";
import { supabaseService } from "@/lib/supabase/server";
import { PUBLIC_STAGES } from "@/lib/data/site";
import { PUBLIC_VIDEOS_KEY, publicStageVideos } from "./stage-videos";

/** Guarda (o quita, con enlace vacío) el video público de una etapa del sitio. Solo admin. */
export async function savePublicStageVideo(slug: string, url: string): Promise<{ ok: boolean; message: string }> {
  try {
    const viewer = await requireRole(["admin"]);
    if (!PUBLIC_STAGES.some((s) => s.slug === slug)) throw new Error("Etapa desconocida.");
    const link = url.trim();
    if (link && !/^https:\/\/\S+$/i.test(link)) throw new Error("Pega un enlace que empiece con https://");
    const current = await publicStageVideos();
    const next = { ...current };
    if (link) next[slug] = link;
    else delete next[slug];
    const { error } = await supabaseService().from("app_settings").upsert({ key: PUBLIC_VIDEOS_KEY, value: next, updated_by: viewer.id, updated_at: new Date().toISOString() });
    if (error) throw error;
    revalidatePath(`/programa/${slug}`);
    return { ok: true, message: link ? "Video guardado: ya se ve en la página pública de la etapa." : "Video quitado de la página pública." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
