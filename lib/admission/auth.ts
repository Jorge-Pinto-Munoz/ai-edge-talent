import "server-only";
import { redirect } from "next/navigation";
import { supabaseUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type StaffRole = "admin" | "delivery";
export type AppRole = "admin" | "delivery" | "kiber" | "client" | "mentor" | "profesor" | "hub";
export interface Viewer {
  id: string;
  email: string;
  role: AppRole;
  fullName: string | null;
}

export async function getViewer(): Promise<Viewer | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await supabaseUser();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role, full_name, email").eq("id", user.id).single();
  if (!data) return null;
  return { id: user.id, email: data.email, role: data.role, fullName: data.full_name };
}

/** Páginas: redirige si no corresponde. */
export async function requireStaffPage(next: string): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (v.role !== "admin" && v.role !== "delivery") redirect("/sin-acceso");
  return v;
}

/** Acciones: lanza error (las acciones no deben redirigir silenciosamente). */
export async function requireRole(roles: StaffRole[]): Promise<Viewer> {
  const v = await getViewer();
  if (!v || !roles.includes(v.role as StaffRole)) throw new Error("No tienes permiso para esta acción.");
  return v;
}

/** Páginas compartidas entre el equipo interno y un rol de Wave (profesor u Hub). */
export async function requireAnyRolePage(next: string, roles: AppRole[]): Promise<Viewer> {
  const v = await getViewer();
  if (!v) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!roles.includes(v.role)) redirect("/sin-acceso");
  return v;
}

/** Waves en las que un profesor o líder del Hub trabaja (por correo, tabla wave_staff). */
export async function myStaffWaves(v: Viewer): Promise<string[]> {
  if (v.role !== "profesor" && v.role !== "hub") return [];
  const db = await supabaseUser();
  const { data } = await db.from("wave_staff").select("wave_id").eq("email", v.email.toLowerCase()).eq("role", v.role);
  return (data ?? []).map((r) => r.wave_id);
}
