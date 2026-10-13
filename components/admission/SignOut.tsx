"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/app/login/actions";

/** Cerrar sesión. `onDark` para usarlo sobre bandas oscuras (texto blanco). */
export function SignOut({ onDark = true, label = "Salir" }: { onDark?: boolean; label?: string }) {
  const router = useRouter();
  return (
    <button type="button" className={onDark ? "btn ghost small" : "btn ghost"} style={onDark ? { color: "#fff" } : undefined} onClick={async () => { await signOut(); router.push("/ingresar"); }}>
      {label}
    </button>
  );
}
