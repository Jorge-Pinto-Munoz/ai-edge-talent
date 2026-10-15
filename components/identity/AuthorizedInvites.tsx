"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteAuthorized, type AdminResult } from "@/lib/identity/admin-actions";
import { ROLE_LABEL } from "@/lib/identity/roles";

export type AuthorizedRow = { email: string; name: string | null; role: string; waves: string[] };

/**
 * Personas con rol autorizado por Administración (p. ej. Delivery) que aún no tienen cuenta. Pueden ingresar en
 * cualquier momento con su correo y un código, sin depender de candidatos; aquí se les envía la invitación.
 */
export function AuthorizedInvites({ rows }: { rows: AuthorizedRow[] }) {
  const router = useRouter();
  const [res, setRes] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const invite = (emails: string[]) => start(async () => { const r = await inviteAuthorized(emails); setRes(r); if (r.ok) router.refresh(); });
  if (!rows.length) return null;
  return (
    <section className="card auth-inv" aria-labelledby="inv-t">
      <div className="spread" style={{ gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 id="inv-t" style={{ margin: 0 }}>Autorizados sin cuenta · {rows.length}</h2>
          <p className="muted" style={{ margin: "4px 0 0", maxWidth: 680 }}>Ya pueden ingresar con su correo y un código cuando quieran, aunque no tengan candidatos. Invítalos para que sepan que su acceso está listo: su cuenta queda <strong>pendiente de activación</strong> hasta su primer ingreso.</p>
        </div>
        <button type="button" className="btn" disabled={pending} onClick={() => invite(rows.map((r) => r.email))}>{pending ? "Enviando…" : `Crear cuentas e invitar (${rows.length})`}</button>
      </div>
      <ul className="auth-inv-list">
        {rows.map((r) => (
          <li key={r.email}>
            <span><strong>{r.name ?? r.email}</strong><small className="muted">{r.email} · {ROLE_LABEL[r.role] ?? r.role}{r.waves.length ? ` · ${r.waves.join(", ")}` : ""}</small></span>
            <span className="ds-status s-pending">Sin cuenta</span>
            <button type="button" className="btn ghost small" disabled={pending} onClick={() => invite([r.email])}>Invitar</button>
          </li>
        ))}
      </ul>
      {res && <p className={res.ok ? "muted" : "error"} role="status">{res.message}</p>}
    </section>
  );
}
