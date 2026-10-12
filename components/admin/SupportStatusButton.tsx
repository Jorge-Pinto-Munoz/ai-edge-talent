"use client";

import { useTransition } from "react";
import { setSupportStatus } from "@/lib/support/actions";

export function SupportStatusButton({ id, status }: { id: string; status: "OPEN" | "RESOLVED" }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" className="btn ghost small" disabled={pending} onClick={() => start(async () => { await setSupportStatus(id, status === "OPEN" ? "RESOLVED" : "OPEN"); })}>
      {status === "OPEN" ? "Marcar resuelta" : "Reabrir"}
    </button>
  );
}
