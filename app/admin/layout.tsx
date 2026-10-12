import "./admin.css";
import { Suspense, type ReactNode } from "react";
import { getViewer } from "@/lib/admission/auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { supabaseUser } from "@/lib/supabase/server";
import { AdminShell } from "@/components/admin/AdminShell";

/** Con base de datos y un usuario admin o Delivery, todas las páginas de /admin comparten la navegación lateral. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  if (!isSupabaseConfigured()) return children;
  const viewer = await getViewer();
  if (!viewer || (viewer.role !== "admin" && viewer.role !== "delivery")) return children;
  const db = await supabaseUser();
  const { data: waves } = await db.from("waves").select("id, name, status").order("created_at", { ascending: false });
  // Las Waves abiertas primero; las cerradas al final.
  const sorted = [...(waves ?? [])].sort((a, b) => Number(a.status === "CLOSED") - Number(b.status === "CLOSED"));
  return (
    <Suspense>
      <AdminShell waves={sorted} role={viewer.role} email={viewer.email}>
        {children}
      </AdminShell>
    </Suspense>
  );
}
