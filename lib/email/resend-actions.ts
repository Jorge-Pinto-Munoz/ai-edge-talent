"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { requireRole } from "@/lib/admission/auth";
import { audit } from "@/lib/identity/service";
import { sendEmail } from "./send";

/**
 * Reenvía un correo emitido tal como salió (mismo asunto, cuerpo y copia), o a otra dirección. Los correos con
 * código de acceso no se reenvían (el código se guarda enmascarado): la persona debe pedir uno nuevo.
 */
export async function resendEmail(id: string, toOverride?: string): Promise<{ ok: boolean; message: string }> {
  try {
    const viewer = await requireRole(["admin"]);
    const svc = supabaseService();
    const { data: m } = await svc.from("email_messages").select("*").eq("id", id).maybeSingle();
    if (!m) throw new Error("Correo no encontrado.");
    if (/••••/.test(m.body_text)) throw new Error("Este correo llevaba un código de un solo uso: no se reenvía. La persona puede pedir un código nuevo al ingresar.");
    const to = (toOverride?.trim() || m.to_email).toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new Error("Correo de destino no válido.");
    const cc: string[] = toOverride?.trim() ? [] : m.cc_emails ?? [];
    const { data: row } = await svc.from("email_messages").insert({
      to_email: to, cc_emails: cc, template: m.template, kind: "resend", subject: m.subject, body_text: m.body_text, body_html: m.body_html,
      candidate_id: m.candidate_id, wave_id: m.wave_id, user_id: m.user_id, sent_by: viewer.id,
    }).select("id").single();
    const res = await sendEmail(to, m.subject, m.body_text, undefined, m.body_html ?? undefined, cc);
    if (row) await svc.from("email_messages").update(res.error ? { status: "failed", error: res.error.slice(0, 300) } : { status: "sent", provider_id: res.id, sent_at: new Date().toISOString() }).eq("id", row.id);
    await audit("email.resent", { actor: viewer.id, actorEmail: viewer.email, targetEmail: to, candidateId: m.candidate_id, waveId: m.wave_id, details: { original: id, ok: !res.error } }, svc);
    revalidatePath("/admin/comunicaciones");
    return res.error ? { ok: false, message: `No se pudo reenviar: ${res.error}` } : { ok: true, message: `Reenviado a ${to}${cc.length ? ` con copia a ${cc.join(", ")}` : ""}.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}
