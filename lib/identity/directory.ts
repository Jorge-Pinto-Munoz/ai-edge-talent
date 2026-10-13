import "server-only";
import { supabaseService } from "@/lib/supabase/server";

export interface DeliveryOption { email: string; name: string }

/** Delivery disponibles para elegir: autorizados (role_grants) y cuentas Delivery activas, sin duplicados. */
export async function deliveryDirectory(): Promise<DeliveryOption[]> {
  const svc = supabaseService();
  const [{ data: grants }, { data: profiles }] = await Promise.all([
    svc.from("role_grants").select("email, full_name").eq("role", "delivery"),
    svc.from("profiles").select("email, full_name, status").eq("role", "delivery"),
  ]);
  const out = new Map<string, DeliveryOption>();
  for (const g of grants ?? []) out.set(g.email, { email: g.email, name: g.full_name || g.email });
  for (const p of profiles ?? []) {
    if (p.status === "REVOKED" || p.status === "DELETED") { out.delete(p.email); continue; }
    out.set(p.email, { email: p.email, name: p.full_name || out.get(p.email)?.name || p.email });
  }
  // Las cuentas de prueba locales (.test) no se ofrecen en producción.
  return [...out.values()].filter((d) => process.env.NODE_ENV !== "production" || !d.email.endsWith(".test")).sort((a, b) => a.name.localeCompare(b.name, "es"));
}
