"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { supabaseService, supabaseUser } from "@/lib/supabase/server";
import { getViewer, requireRole } from "@/lib/admission/auth";
import { sendEmail } from "@/lib/email/send";
import { env } from "@/lib/supabase/env";
import { SUPPORT_TOPICS } from "@/lib/data/help";
import { errorText } from "@/lib/text/errors";

export type SupportResult = { ok: boolean; message: string };
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const MAX_PER_HOUR = 5;

/**
 * Pregunta que el FAQ no resolvió: se guarda siempre (bandeja Soporte del admin) y se envía por correo
 * al líder del servicio (SUPPORT_EMAIL o, si no está, a los admin). Responder el correo le llega a quien preguntó.
 */
export async function submitSupport(input: { name: string; email: string; audience: string; topic: string; message: string; page: string; website?: string }): Promise<SupportResult> {
  try {
    if (input.website) return { ok: true, message: "Recibido." }; // trampa para bots: campo oculto
    const name = input.name.trim().slice(0, 120);
    const email = input.email.trim().toLowerCase();
    const message = input.message.trim();
    const topic = (SUPPORT_TOPICS as readonly string[]).includes(input.topic) ? input.topic : "Otro";
    const audience = ["profesional", "cliente", "equipo"].includes(input.audience) ? input.audience : "otro";
    if (name.length < 2) throw new Error("Cuéntanos tu nombre.");
    if (!EMAIL_RE.test(email)) throw new Error("Revisa tu correo: lo usaremos para responderte.");
    if (message.length < 10) throw new Error("Escribe tu pregunta con un poco más de detalle.");
    if (message.length > 4000) throw new Error("El mensaje es muy largo (máximo 4.000 caracteres).");

    const svc = supabaseService();
    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await svc.from("support_requests").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", since);
    if ((count ?? 0) >= MAX_PER_HOUR) throw new Error("Ya recibimos varias preguntas tuyas en la última hora. Te responderemos pronto.");

    const viewer = await getViewer().catch(() => null);
    const page = input.page.slice(0, 200);
    const { data: row, error } = await svc
      .from("support_requests")
      .insert({ name, email, audience, topic, message, page, user_id: viewer?.id ?? null })
      .select("id")
      .single();
    if (error) throw error;

    // Destino: SUPPORT_EMAIL, o todos los admin.
    let to = (process.env.SUPPORT_EMAIL ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    if (!to.length) {
      const { data: admins } = await svc.from("role_grants").select("email").eq("role", "admin");
      to = (admins ?? []).map((a) => a.email);
    }
    const host = (await headers()).get("host");
    const inbox = `${env.appUrl || (host ? `https://${host}` : "")}/admin/soporte`;
    const body = `${name} (${email}) · ${audience} · ${topic}\nDesde: ${page}\n\n${message}\n\n—\nResponde este correo para contestarle directamente.\nBandeja de soporte: ${inbox}`;
    const r = to.length ? await sendEmail(to, `[AET Soporte] ${topic} · ${name}`, body, email) : { id: null, error: "Sin destinatario configurado." };
    await svc.from("support_requests").update(r.error ? { email_status: "FAILED", email_error: r.error.slice(0, 300) } : { email_status: "SENT" }).eq("id", row.id);
    revalidatePath("/admin/soporte");
    return { ok: true, message: "Listo, recibimos tu pregunta. Te responderemos a tu correo." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "No pudimos enviar tu pregunta. Intenta de nuevo." };
  }
}

export async function setSupportStatus(id: string, status: "OPEN" | "RESOLVED"): Promise<SupportResult> {
  try {
    const viewer = await requireRole(["admin"]);
    const { error } = await (await supabaseUser())
      .from("support_requests")
      .update(status === "RESOLVED" ? { status, resolved_at: new Date().toISOString(), resolved_by: viewer.id } : { status, resolved_at: null, resolved_by: null })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/admin/soporte");
    return { ok: true, message: status === "RESOLVED" ? "Marcada como resuelta." : "Reabierta." };
  } catch (e) {
    return { ok: false, message: errorText(e) };
  }
}
