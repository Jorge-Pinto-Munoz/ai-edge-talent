"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store/StoreProvider";
import { setRole } from "@/lib/store/state";
import { ROLE_LABEL, type Role } from "@/lib/domain/types";

const NAV: Record<Role, { href: string; label: string }[]> = {
  KIBER: [
    { href: "/kiber", label: "Mi proceso" },
    { href: "/kiber/programa", label: "Mi programa" },
    { href: "/wave-3/postular", label: "Postular Wave 3" },
    { href: "/ayuda", label: "Ayuda" },
  ],
  CLIENT: [
    { href: "/client/journey", label: "Client Journey" },
    { href: "/client/onboarding", label: "Onboarding" },
    { href: "/client/nominate", label: "Nominar" },
    { href: "/ayuda?rol=CLIENT", label: "Ayuda" },
  ],
  DELIVERY: [
    { href: "/delivery/waves", label: "Waves" },
    { href: "/delivery/playbook", label: "Playbook" },
    { href: "/delivery/onboarding", label: "Mi readiness" },
    { href: "/responsabilidades", label: "RACI" },
    { href: "/ayuda?rol=DELIVERY", label: "Ayuda" },
  ],
  PRODUCT_LEAD: [
    { href: "/admin/waves", label: "Admin Waves" },
    { href: "/delivery/waves", label: "Portfolio" },
    { href: "/responsabilidades", label: "RACI" },
    { href: "/delivery/playbook", label: "Playbook" },
  ],
  WAVE_LEAD: [
    { href: "/delivery/waves", label: "Portfolio" },
    { href: "/admin/waves", label: "Waves" },
    { href: "/responsabilidades", label: "RACI" },
  ],
  ADMIN: [
    { href: "/admin/waves", label: "Admin Waves" },
    { href: "/delivery/waves", label: "Portfolio" },
    { href: "/responsabilidades", label: "RACI" },
  ],
};

export function Header() {
  const { state, run, reset } = useStore();
  const path = usePathname();
  const role = state.session.role;
  // Con base de datos real, el menú no depende del selector demo: cada persona entra a su espacio según su rol.
  const live = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const links = live
    ? [{ href: "/programa", label: "Programa" }, { href: "/wave-3/postular", label: "Postular" }, { href: "/ayuda", label: "Ayuda" }]
    : [{ href: "/programa", label: "Programa" }, ...NAV[role]];

  return (
    <header className="header">
      <div className="header-inner">
        <Link href="/" className="brand" aria-label="AI Edge Talent · Kibernum — inicio">
          <img src="/brand/kibernum-blanco.svg" alt="Kibernum" />
          <span className="program">AI Edge Talent</span>
        </Link>
        <nav className="nav" aria-label="Principal">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={path === l.href.split("?")[0] ? "active" : ""}>
              {l.label}
            </Link>
          ))}
        </nav>
        {live && (
          <Link href="/inicio" className="btn small" style={{ padding: "6px 12px" }}>
            Mi espacio
          </Link>
        )}
        {!live && <div className="role-switch">
          <label htmlFor="role" style={{ margin: 0, fontWeight: 400 }}>
            Vista demo:
          </label>
          <select id="role" value={role} onChange={(e) => run((s) => setRole(s, e.target.value as Role))} style={{ width: "auto" }}>
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <button className="btn ghost small" onClick={() => confirm("¿Restablecer datos demo?") && reset()} title="Restablecer datos demo">
            ↺
          </button>
        </div>}
      </div>
    </header>
  );
}
