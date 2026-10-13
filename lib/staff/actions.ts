"use server";

import { supabaseService, supabaseUser } from "@/lib/supabase/server";

/** Salir del área de equipo: cierra la sesión de auditoría y la de Supabase. */
export async function staffSignOut(): Promise<void> {
  const db = await supabaseUser();
  const { data: { user } } = await db.auth.getUser();
  if (user) await supabaseService().from("access_sessions").update({ ended_at: new Date().toISOString() }).eq("user_id", user.id).is("ended_at", null);
  await db.auth.signOut();
}
