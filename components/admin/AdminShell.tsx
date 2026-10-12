"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { signOut } from "@/app/login/actions";
import { Icon, type IconName } from "@/components/site/Icon";

export interface ShellWave {
  id: string;
  name: string;
  status: string;
}

type Section = { key: string; label: string; icon: IconName; href: (w: string) => string; match: RegExp; adminOnly?: boolean; perWave?: boolean };

const SECTIONS: Section[] = [
  { key: "resumen", label: "Resumen", icon: "grid", href: (w) => `/admin?wave=${w}`, match: /^\/admin\/?$/, perWave: true },
  { key: "admision", label: "Admisión", icon: "users", href: (w) => `/admin/admision/${w}`, match: /^\/admin\/admision/, perWave: true },
  { key: "journey", label: "Journey", icon: "route", href: (w) => `/admin/journey/${w}`, match: /^\/admin\/journey/, perWave: true },
  { key: "contenido", label: "Contenido", icon: "book", href: (w) => `/admin/contenido/${w}`, match: /^\/admin\/contenido/, adminOnly: true, perWave: true },
  { key: "evaluacion", label: "Cómo evaluamos", icon: "target", href: () => "/admin/evaluacion", match: /^\/admin\/evaluacion/, adminOnly: true },
  { key: "talento", label: "Talento", icon: "star", href: () => "/admin/talento", match: /^\/admin\/talento/ },
  { key: "accesos", label: "Accesos", icon: "key", href: () => "/admin/accesos", match: /^\/admin\/accesos/, adminOnly: true },
];

/** Wave activa: la de la URL (/admin/<sección>/<wave> o ?wave=), si no la primera de la lista. */
function currentWave(path: string, search: URLSearchParams, waves: ShellWave[]): string {
  const m = path.match(/^\/admin\/(admision|journey|contenido)\/([^/]+)/);
  const id = m?.[2] ?? search.get("wave");
  return waves.find((w) => w.id === id)?.id ?? waves[0]?.id ?? "wave-3";
}

/** Marco del portal de administración: barra lateral (computador) o barra superior deslizable (celular). */
export function AdminShell({ waves, role, email, children }: { waves: ShellWave[]; role: "admin" | "delivery"; email: string; children: ReactNode }) {
  const path = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const wave = currentWave(path, search, waves);
  const sections = SECTIONS.filter((s) => role === "admin" || !s.adminOnly);
  const active = sections.find((s) => s.match.test(path));

  const switchWave = (id: string) => {
    const target = active?.perWave ? active.href(id) : `/admin?wave=${id}`;
    router.push(target);
  };

  return (
    <div className="admin-shell">
      <aside className="admin-side" aria-label="Portal de administración">
        <div className="admin-side-top">
          <div className="eyebrow" style={{ marginBottom: 6 }}>Portal AET</div>
          <label htmlFor="wave-switch" className="sr-only">Wave</label>
          <div className="wave-switch">
            <Icon name="layers" size={18} />
            <select id="wave-switch" value={wave} onChange={(e) => switchWave(e.target.value)}>
              {waves.map((w) => <option key={w.id} value={w.id}>{w.name.replace("AI Edge Talent · ", "")}</option>)}
            </select>
            <Icon name="chevronDown" size={16} />
          </div>
        </div>
        <nav className="admin-nav">
          {sections.map((s) => (
            <Link key={s.key} href={s.href(wave)} className={active?.key === s.key ? "on" : ""} aria-current={active?.key === s.key ? "page" : undefined}>
              <Icon name={s.icon} size={20} />
              <span>{s.label}</span>
            </Link>
          ))}
        </nav>
        <div className="admin-side-foot">
          <div className="who">
            <span className="avatar" aria-hidden="true">{email.slice(0, 1).toUpperCase()}</span>
            <span>
              <strong>{email}</strong>
              <small>{role === "admin" ? "Admin" : "Delivery"}</small>
            </span>
          </div>
          <button type="button" className="admin-logout" onClick={async () => { await signOut(); router.push("/login"); }}>
            <Icon name="logout" size={18} /> Salir
          </button>
        </div>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
