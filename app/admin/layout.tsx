import "./admin.css";
import { Suspense, type ReactNode } from "react";
import { getViewer, myStaffWaves } from "@/lib/admission/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { supabaseUser } from "@/lib/supabase/server";
import { AdminShell, type ShellRole } from "@/components/admin/AdminShell";

/** Con base de datos y un usuario admin, Delivery, Profesor o Líder Hub AI, todas las páginas de /admin comparten la navegación lateral. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) return children;
  const viewer = await getViewer();
  if (!viewer || !["admin", "delivery", "profesor", "hub"].includes(viewer.role)) return children;
  const db = await supabaseUser();
  const { data: all } = await db.from("waves").select("id, name, status").order("created_at", { ascending: false });
  // Profesor y Hub solo ven las Waves en que trabajan.
  const mine = viewer.role === "profesor" || viewer.role === "hub" ? await myStaffWaves(viewer) : null;
  const waves = mine ? (all ?? []).filter((w) => mine.includes(w.id)) : all;
  // Las Waves abiertas primero; las cerradas al final.
  const sorted = [...(waves ?? [])].sort((a, b) => Number(a.status === "CLOSED") - Number(b.status === "CLOSED"));
  return (
    <Suspense>
      <AdminShell waves={sorted} role={viewer.role as ShellRole} email={viewer.email}>
        {children}
      </AdminShell>
    </Suspense>
  );
}
