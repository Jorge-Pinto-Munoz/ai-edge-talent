import "server-only";
import { supabaseService } from "@/lib/supabase/server";

export const PUBLIC_VIDEOS_KEY = "public_stage_videos";

/** Video público por etapa del sitio (/programa/[etapa]): { slug: enlace }. Sin datos o sin llave: vacío. */
export async function publicStageVideos(): Promise<Record<string, string>> {
  try {
    const { data } = await supabaseService().from("app_settings").select("value").eq("key", PUBLIC_VIDEOS_KEY).maybeSingle();
    const v = { ...((data?.value ?? {}) as Record<string, string>) };
    // AI Lab y Showcase eran una sola etapa pública: su video pasa al AI Lab.
    if (v["ai-lab-showcase"] && !v["ai-lab"]) v["ai-lab"] = v["ai-lab-showcase"];
    delete v["ai-lab-showcase"];
    return v;
  } catch {
    return {};
  }
}
