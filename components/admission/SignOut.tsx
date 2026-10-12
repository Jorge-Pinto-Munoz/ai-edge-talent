"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/app/login/actions";

export function SignOut() {
  const router = useRouter();
  return (
    <button className="btn ghost small" style={{ color: "#fff" }} onClick={async () => { await signOut(); router.push("/login"); }}>
      Salir
    </button>
  );
}
