"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/admission/auth";
import { supabaseService } from "@/lib/supabase/server";
import { errorText } from "@/lib/text/errors";
import { SHOWCASE_TEMPLATE_KEY, showcaseTemplate } from "./template";

/** Guarda la plantilla oficial del Showcase (ya subida al bucket `content` bajo `programa/`). Solo admin. */
export async function saveShowcaseTemplate(file: { name: string; path: string; size: number } | null): Promise<{ ok: boolean; message: string }> {
  try {
    const viewer = await requireRole(["admin"]);
    if (file && !file.path.startsWith("programa/")) throw new Error("Archivo no válido.");
    const svc = supabaseService();
    const prev = await showcaseTemplate();
    if (file) {
      const { error } = await svc.from("app_settings").upsert({ key: SHOWCASE_TEMPLATE_KEY, value: { name: file.name.slice(0, 200), path: file.path, size: file.size, updatedAt: new Date().toISOString() }, updated_by: viewer.id, updated_at: new Date().toISOString() });
      if (error) throw error;
    } else {
      const { error } = await svc.from("app_settings").delete().eq("key", SHOWCASE_TEMPLATE_KEY);
      if (error) throw error;
    }
    if (prev && prev.path !== file?.path) await svc.storage.from("content").remove([prev.path]);
    revalidatePath("/admin/journey", "layout");
    revalidatePath("/mi-journey");
    return { ok: true, message: file ? "Plantilla publicada: ya la ven los participantes en AI Lab y Showcase." : "Plantilla quitada." };
  } catch (e) {
    return { ok: false, message: errorText(e) };
  }
}
