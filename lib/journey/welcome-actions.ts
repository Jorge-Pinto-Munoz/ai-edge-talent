"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/admission/auth";
import { renderIdentity } from "@/lib/email/identity";
import { errorText } from "@/lib/text/errors";
import { pendingReWelcome, sendReWelcome } from "./welcome";

/** Vista previa del correo de bienvenida a Role Enablement (asunto y cuerpo). Solo admin. */
export async function previewReWelcome(): Promise<{ ok: boolean; message: string; data?: { subject: string; html: string } }> {
  try {
    await requireRole(["admin"]);
    const r = renderIdentity("RE_WELCOME", { name: "Nombre Apellido", link: "https://ai-edge-talent.vercel.app/mi-journey" });
    return { ok: true, message: "ok", data: { subject: r.subject, html: r.html } };
  } catch (e) {
    return { ok: false, message: errorText(e) };
  }
}

/** Envía la bienvenida a quienes están en Role Enablement y aún no la reciben (nunca duplica). Solo admin. */
export async function sendReWelcomeAll(waveId: string): Promise<{ ok: boolean; message: string }> {
  try {
    const viewer = await requireRole(["admin"]);
    const { pending } = await pendingReWelcome(waveId);
    if (!pending.length) return { ok: true, message: "Todas las personas en Role Enablement ya recibieron la bienvenida." };
    let sent = 0;
    const failed: string[] = [];
    for (const p of pending) {
      const r = await sendReWelcome(p.id, { actor: viewer.id });
      if (r === "sent") sent++;
      else if (r === "failed") failed.push(p.full_name);
    }
    revalidatePath(`/admin/journey/${waveId}`, "layout");
    return {
      ok: failed.length === 0,
      message: `${sent} correo(s) enviado(s) con copia a su Delivery.${failed.length ? ` No salió para: ${failed.join(", ")} (se reintenta solo; también puedes reenviarlo desde Comunicaciones).` : ""}`,
    };
  } catch (e) {
    return { ok: false, message: errorText(e) };
  }
}
