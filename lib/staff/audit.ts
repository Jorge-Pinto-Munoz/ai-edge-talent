import "server-only";
import { supabaseService } from "@/lib/supabase/server";
import type { Viewer } from "@/lib/admission/auth";

/** Una sesión de auditoría se considera la misma mientras haya actividad en los últimos 30 minutos. */
const IDLE_MIN = 30;

export async function openAccessSession(s: { userId: string; email: string; role: string; method: "CODE" | "LINK"; userAgent: string | null }) {
  const svc = supabaseService();
  await svc.from("access_sessions").update({ ended_at: new Date().toISOString() }).eq("user_id", s.userId).is("ended_at", null);
  const { data } = await svc.from("access_sessions").insert({ user_id: s.userId, email: s.email, role: s.role, method: s.method, user_agent: s.userAgent }).select("id").single();
  return data?.id as string | undefined;
}

/**
 * Registra la sección consultada del área de equipo (informado en pantalla). Reutiliza la sesión activa
 * o abre una nueva si la persona entró por enlace o estuvo inactiva más de 30 minutos.
 */
export async function trackStaffAccess(v: Viewer, path: string, userAgent: string | null) {
  try {
    const svc = supabaseService();
    const since = new Date(Date.now() - IDLE_MIN * 60_000).toISOString();
    const { data: cur } = await svc.from("access_sessions").select("id").eq("user_id", v.id).is("ended_at", null).gte("last_seen_at", since).order("last_seen_at", { ascending: false }).limit(1).maybeSingle();
    const id = cur?.id ?? (await openAccessSession({ userId: v.id, email: v.email, role: v.role, method: "LINK", userAgent }));
    if (!id) return;
    await Promise.all([
      svc.from("access_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", id),
      svc.from("access_events").insert({ session_id: id, user_id: v.id, path: path.slice(0, 200) }),
    ]);
  } catch (e) {
    console.error("[equipo] auditoría", e); // la auditoría nunca bloquea la navegación
  }
}
