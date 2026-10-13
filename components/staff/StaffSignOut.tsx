"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { staffSignOut } from "@/lib/staff/actions";
import { Icon } from "@/components/site/Icon";

export function StaffSignOut() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn ghost small" disabled={pending} onClick={() => start(async () => { await staffSignOut(); router.replace("/"); router.refresh(); })}>
      <Icon name="logout" size={16} /> {pending ? "Saliendo…" : "Salir"}
    </button>
  );
}
