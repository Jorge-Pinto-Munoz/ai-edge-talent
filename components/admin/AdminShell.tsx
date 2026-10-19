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

type Section = { key: string; label: string; icon: IconName; href: (w: string) => string; match: RegExp; roles: ShellRole[]; perWave?: boolean; group: "wave" | "admin" };

/**
 * Nivel 1 de la navegación. Lo propio de una etapa (clases, AI Lab, criterios de evaluación) vive dentro de
 * Journey → etapa; aquí solo quedan las secciones transversales de la Wave y, aparte, la administración.
 */
const SECTIONS: Section[] = [
  { key: "resumen", label: "Resumen", icon: "grid", href: (w) => `/admin?wave=${w}`, match: /^\/admin\/?$/, roles: STAFF, perWave: true, group: "wave" },
  { key: "admision", label: "Admisión", icon: "users", href: (w) => `/admin/admision/${w}`, match: /^\/admin\/admision/, roles: STAFF, perWave: true, group: "wave" },
  { key: "journey", label: "Journey", icon: "route", href: (w) => `/admin/journey/${w}`, match: /^\/admin\/(journey|profesor|evaluacion)|^\/admin\/lab/, roles: STAFF, perWave: true, group: "wave" },
  // El Líder Hub AI trabaja solo en el AI Lab & Showcase de sus Waves.
  { key: "lab", label: "AI Lab & Showcase", icon: "flask", href: (w) => `/admin/lab/${w}`, match: /^\/admin\/lab/, roles: ["hub"], perWave: true, group: "wave" },
  { key: "pulsos", label: "Avance y experiencia", icon: "chat", href: (w) => `/admin/pulsos/${w}`, match: /^\/admin\/pulsos/, roles: ADMIN, perWave: true, group: "wave" },
  { key: "contenido", label: "Contenido", icon: "book", href: (w) => `/admin/contenido/${w}`, match: /^\/admin\/contenido/, roles: ADMIN, perWave: true, group: "wave" },
  { key: "talento", label: "Talento", icon: "star", href: () => "/admin/talento", match: /^\/admin\/talento/, roles: STAFF, group: "wave" },
  { key: "asignaciones", label: "Equipo de la Wave", icon: "user", href: (w) => `/admin/asignaciones/${w}`, match: /^\/admin\/asignaciones/, roles: ADMIN, perWave: true, group: "admin" },
  { key: "usuarios", label: "Usuarios y accesos", icon: "key", href: () => "/admin/usuarios", match: /^\/admin\/usuarios/, roles: ADMIN, group: "admin" },
  { key: "comunicaciones", label: "Comunicaciones", icon: "send", href: () => "/admin/comunicaciones", match: /^\/admin\/comunicaciones/, roles: ADMIN, group: "admin" },
  { key: "accesos", label: "Registro de ingresos", icon: "list", href: () => "/admin/accesos", match: /^\/admin\/accesos/, roles: ADMIN, group: "admin" },
  { key: "guia", label: "Guía de accesos", icon: "book", href: () => "/admin/guia", match: /^\/admin\/guia/, roles: ADMIN, group: "admin" },
  { key: "soporte", label: "Soporte", icon: "help", href: () => "/admin/soporte", match: /^\/admin\/soporte/, roles: ADMIN, group: "admin" },
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
  // "Ver como" (incluido el AI Lab visto como un Líder Hub AI) no marca ninguna sección de la Wave.
  const viewing = path.startsWith("/admin/vista") || Boolean(search.get("como"));
  const active = viewing ? undefined : sections.find((s) => s.match.test(path));

  // Cambiar de Wave conserva la sección y, si aplica, la etapa (/admin/journey/<wave>/<etapa>).
  const switchWave = (id: string) => {
    const m = path.match(/^\/admin\/(admision|journey|contenido|lab|pulsos|asignaciones)\/[^/]+(\/[^/?]+)?/);
    const target = m ? `/admin/${m[1]}/${id}${m[1] === "journey" && m[2] ? m[2] : ""}` : active?.perWave ? active.href(id) : sections[0].href(id);
    router.push(target);
  };
  const link = (s: Section) => (
    <Link key={s.key} href={s.href(wave)} className={active?.key === s.key ? "on" : ""} aria-current={active?.key === s.key ? "page" : undefined}>
      <Icon name={s.icon} size={20} />
      <span>{s.label}</span>
    </Link>
  );
  const adminLinks = sections.filter((s) => s.group === "admin");

  return (
    <div className="admin-shell">
      <aside className="admin-side" aria-label="Portal de administración">
        <div className="admin-side-top">
          <div className="eyebrow" style={{ marginBottom: 6 }}>Portal AET</div>
          <WavePicker waves={waves} value={wave} onChange={switchWave} />
        </div>
        <nav className="admin-nav" aria-label="Secciones del portal">
          <div className="admin-nav-group" role="group" aria-label="Wave">
            {sections.filter((s) => s.group === "wave").map(link)}
          </div>
          {adminLinks.length > 0 && (
            <div className="admin-nav-group secondary" role="group" aria-labelledby="nav-adm">
              <span className="admin-nav-label" id="nav-adm">Administración</span>
              {adminLinks.map(link)}
            </div>
          )}
        </nav>
        <div className="admin-side-foot">
          <div className="who">
            <span className="avatar" aria-hidden="true">{email.slice(0, 1).toUpperCase()}</span>
            <span>
              <strong>{email}</strong>
              <small>{ROLE_LABEL[role]}</small>
            </span>
          </div>
          {role === "admin" && (
            <Link href="/admin/vista" className={`admin-viewas${viewing ? " on" : ""}`} aria-current={viewing ? "page" : undefined}>
              <Icon name="user" size={18} /> Ver como otro rol
            </Link>
          )}
          <button type="button" className="admin-logout" onClick={async () => { await signOut(); router.push("/ingresar"); }}>
            <Icon name="logout" size={18} /> Salir
          </button>
        </div>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
