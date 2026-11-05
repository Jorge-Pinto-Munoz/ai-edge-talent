import "server-only";
import { supabaseService } from "@/lib/supabase/server";

/** Plantilla oficial de la presentación del Showcase (una para todo el programa; la sube el admin). */
export const SHOWCASE_TEMPLATE_KEY = "showcase_template";
export type ShowcaseTemplate = { name: string; path: string; size: number; updatedAt: string };

export async function showcaseTemplate(): Promise<ShowcaseTemplate | null> {
  const { data } = await supabaseService().from("app_settings").select("value").eq("key", SHOWCASE_TEMPLATE_KEY).maybeSingle();
  const v = data?.value as ShowcaseTemplate | null | undefined;
  return v?.path ? v : null;
}
