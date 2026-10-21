import "server-only";
import { supabaseService } from "@/lib/supabase/server";

export const PUBLIC_VIDEOS_KEY = "public_stage_videos";

/** Video público por etapa del sitio (/programa/[etapa]): { slug: enlace }. Sin datos o sin llave: vacío. */
export async function publicStageVideos(): Promise<Record<string, string>> {
  try {
    const { data } = await supabaseService().from("app_settings").select("value").eq("key", PUBLIC_VIDEOS_KEY).maybeSingle();
    return (data?.value ?? {}) as Record<string, string>;
  } catch {
    return {};
  }
}
