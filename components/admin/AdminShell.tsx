"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { signOut } from "@/app/login/actions";
import { Icon, type IconName } from "@/components/site/Icon";
import { WavePicker } from "./WavePicker";

export interface ShellWave {
  id: string;
  name: string;
  status: string;
  /** Profesionales en la Wave (inscritos o en proceso). */
  people?: number;
}

export type ShellRole = "admin" | "delivery" | "profesor" | "hub";
const STAFF: ShellRole[] = ["admin", "delivery"];
const ADMIN: ShellRole[] = ["admin"];
const ROLE_LABEL: Record<ShellRole, string> = { admin: "Admin", delivery: "Delivery", profesor: "Profesor", hub: "Líder Hub AI" };

type Section = { key: string; label: string; icon: IconName; href: (w: string) => string; match: RegExp; roles: ShellRole[]; perWave?: boolean };

const SECTIONS: Section[] = [
  { key: "resumen", label: "Resumen", icon: "grid", href: (w) => `/admin?wave=${w}`, match: /^\/admin\/?$/, roles: STAFF, perWave: true },
  { key: "admision", label: "Admisión", icon: "users", href: (w) => `/admin/admision/${w}`, match: /^\/admin\/admision/, roles: STAFF, perWave: true },
  { key: "journey", label: "Journey", icon: "route", href: (w) => `/admin/journey/${w}`, match: /^\/admin\/journey/, roles: STAFF, perWave: true },
  { key: "profesor", label: "Clases", icon: "calendar", href: (w) => `/admin/profesor/${w}`, match: /^\/admin\/profesor/, roles: ["admin", "delivery", "profesor"], perWave: true },
  { key: "lab", label: "AI Lab & Showcase", icon: "flask", href: (w) => `/admin/lab/${w}`, match: /^\/admin\/lab/, roles: ["admin", "delivery", "hub"], perWave: true },
  { key: "pulsos", label: "Avance y experiencia", icon: "chat", href: (w) => `/admin/pulsos/${w}`, match: /^\/admin\/pulsos/, roles: ADMIN, perWave: true },
  { key: "contenido", label: "Contenido", icon: "book", href: (w) => `/admin/contenido/${w}`, match: /^\/admin\/contenido/, roles: ADMIN, perWave: true },
  { key: "evaluacion", label: "Cómo evaluamos", icon: "target", href: () => "/admin/evaluacion", match: /^\/admin\/evaluacion/, roles: ADMIN },
  { key: "talento", label: "Talento", icon: "star", href: () => "/admin/talento", match: /^\/admin\/talento/, roles: STAFF },
  { key: "vista", label: "Ver como", icon: "user", href: () => "/admin/vista", match: /^\/admin\/vista/, roles: ADMIN },
  { key: "soporte", label: "Soporte", icon: "help", href: () => "/admin/soporte", match: /^\/admin\/soporte/, roles: ADMIN },
  { key: "usuarios", label: "Usuarios y accesos", icon: "users", href: () => "/admin/usuarios", match: /^\/admin\/usuarios/, roles: ADMIN },
  { key: "asignaciones", label: "Equipo de la Wave", icon: "user", href: (w) => `/admin/asignaciones/${w}`, match: /^\/admin\/asignaciones/, roles: ADMIN, perWave: true },
  { key: "accesos", label: "Registro de ingresos", icon: "key", href: () => "/admin/accesos", match: /^\/admin\/accesos/, roles: ADMIN },
];

/** Wave activa: la de la URL (/admin/<sección>/<wave> o ?wave=), si no la primera de la lista. */
function currentWave(path: string, search: URLSearchParams, waves: ShellWave[]): string {
  const m = path.match(/^\/admin\/(admision|journey|contenido|profesor|lab|pulsos|asignaciones)\/([^/]+)/);
  const id = m?.[2] ?? search.get("wave");
  return waves.find((w) => w.id === id)?.id ?? waves[0]?.id ?? "wave-3";
}

/** Marco del portal de administración: barra lateral (computador) o barra superior deslizable (celular). */
export function AdminShell({ waves, role, email, children }: { waves: ShellWave[]; role: ShellRole; email: string; children: ReactNode }) {
  const path = usePathname();
  const search = useSearchParams();
  const router = useRouter();
  const wave = currentWave(path, search, waves);
  const sections = SECTIONS.filter((s) => s.roles.includes(role));
  const active = sections.find((s) => s.match.test(path));

  const switchWave = (id: string) => {
    const target = active?.perWave ? active.href(id) : sections[0].href(id);
    router.push(target);
  };

  return (
    <div className="admin-shell">
      <aside className="admin-side" aria-label="Portal de administración">
        <div className="admin-side-top">
          <div className="eyebrow" style={{ marginBottom: 6 }}>Portal AET</div>
          <WavePicker waves={waves} value={wave} onChange={switchWave} />
        </div>
        <nav className="admin-nav" aria-label="Secciones del portal">
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
              <small>{ROLE_LABEL[role]}</small>
            </span>
          </div>
          <button type="button" className="admin-logout" onClick={async () => { await signOut(); router.push("/ingresar"); }}>
            <Icon name="logout" size={18} /> Salir
          </button>
        </div>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
