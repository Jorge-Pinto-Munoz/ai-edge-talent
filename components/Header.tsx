"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/store/StoreProvider";
import { setRole } from "@/lib/store/state";
import { ROLE_LABEL, type Role } from "@/lib/domain/types";
import { PUBLIC_STAGES } from "@/lib/data/site";
import { Icon } from "@/components/site/Icon";
import { StageIcon } from "@/components/site/StageIcon";
import { AUDIENCE, AUDIENCES, AUDIENCE_COOKIE, audienceOfPath, isAudience, isPortalPath, type Audience } from "@/lib/site/audience";

const MEGA_COPY: Record<Audience, { title: string; body: string }> = {
  profesional: { title: "De la postulación al Showcase", body: "Cinco etapas para integrar IA a tu rol y llevarla a un desafío real con tu cliente." },
  cliente: { title: "Tu rol en cada etapa", body: "Qué pasa en cada etapa, qué se espera de tu empresa y qué información recibes." },
  equipo: { title: "Cada etapa, paso a paso", body: "Qué hace Delivery en cada etapa y qué evidencia se registra." },
};

function readAudienceCookie(): Audience | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${AUDIENCE_COOKIE}=([^;]+)`));
  return m && isAudience(m[1]) ? m[1] : null;
}

/** Menú del modo demo (sin base de datos): cambia según el rol elegido en el selector. */
const DEMO_NAV: Record<Role, { href: string; label: string }[]> = {
  KIBER: [{ href: "/kiber", label: "Mi proceso" }, { href: "/kiber/programa", label: "Mi programa" }],
  CLIENT: [{ href: "/client/journey", label: "Client Journey" }, { href: "/client/nominate", label: "Nominar" }],
  DELIVERY: [{ href: "/delivery/waves", label: "Waves" }, { href: "/delivery/playbook", label: "Playbook" }, { href: "/responsabilidades", label: "RACI" }],
  PRODUCT_LEAD: [{ href: "/admin/waves", label: "Admin Waves" }, { href: "/delivery/waves", label: "Portfolio" }],
  WAVE_LEAD: [{ href: "/delivery/waves", label: "Portfolio" }, { href: "/admin/waves", label: "Waves" }],
  ADMIN: [{ href: "/admin/waves", label: "Admin Waves" }, { href: "/delivery/waves", label: "Portfolio" }],
};

export function Header() {
  const { state, run, reset } = useStore();
  const path = usePathname();
  const role = state.session.role;
  const live = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const [mega, setMega] = useState(false);
  const [sheet, setSheet] = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [aud, setAud] = useState<Audience>("profesional");

  // La vista se define por la ruta propia (/, /clientes, /equipo) y se recuerda para las páginas compartidas.
  useEffect(() => {
    const own = audienceOfPath(path);
    if (own) {
      setAud(own);
      document.cookie = `${AUDIENCE_COOKIE}=${own}; path=/; max-age=31536000; samesite=lax`;
    } else {
      setAud(readAudienceCookie() ?? "profesional");
    }
  }, [path]);

  // Cerrar menús al navegar.
  useEffect(() => {
    setMega(false);
    setSheet(false);
  }, [path]);

  // Escape cierra; el panel móvil bloquea el scroll del fondo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMega(false);
        setSheet(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    document.body.style.overflow = sheet ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sheet]);

  const openMega = () => {
    clearTimeout(closeTimer.current);
    setMega(true);
  };
  const closeMegaSoon = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMega(false), 140);
  };

  const extra = live ? [] : DEMO_NAV[role];
  const view = AUDIENCE[aud];
  const stageHref = (slug: string) => `/programa/${slug}${aud === "profesional" ? "" : `?para=${aud}`}`;
  const navLinks = [...view.nav, ...extra];
  const audBar = (
    <nav className="aud-bar-links" aria-label="Elige tu vista">
      {AUDIENCES.map((a) => (
        <Link key={a} href={AUDIENCE[a].home} aria-current={aud === a ? "true" : undefined}>{AUDIENCE[a].label}</Link>
      ))}
    </nav>
  );
  const isActive = (href: string) => path === href.split("#")[0];

  const roleSwitch = !live && (
    <div className="role-switch">
      <label htmlFor="role" style={{ margin: 0, fontWeight: 400 }}>Vista demo:</label>
      <select id="role" value={role} onChange={(e) => run((s) => setRole(s, e.target.value as Role))} style={{ width: "auto" }}>
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <option key={r} value={r}>{ROLE_LABEL[r]}</option>
        ))}
      </select>
      <button className="btn ghost small" onClick={() => confirm("¿Restablecer datos demo?") && reset()} title="Restablecer datos demo">↺</button>
    </div>
  );

  // Portales con sesión: solo marca y salida al sitio; cada portal trae su propia navegación.
  if (live && isPortalPath(path)) {
    return (
      <header className="sitenav portal">
        <div className="sitenav-inner">
          <Link href="/" className="brand" aria-label="AI Edge Talent · Kibernum, ir al sitio">
            <img src="/brand/kibernum-blanco.svg" alt="Kibernum" />
            <span className="program">AI Edge Talent</span>
          </Link>
          <span style={{ flex: 1 }} />
          <Link href="/programa" className="pill ghost">Ver el programa</Link>
        </div>
      </header>
    );
  }

  return (
    <>
    <div className="aud-bar">
      <div className="aud-bar-inner">
        {audBar}
        <span className="aud-bar-note" aria-hidden="true">AI Edge Talent · Kibernum</span>
      </div>
    </div>
    <header className="sitenav" onMouseLeave={closeMegaSoon}>
      <div className="sitenav-inner">
        <Link href={view.home} className="brand" aria-label="AI Edge Talent · Kibernum, inicio">
          <img src="/brand/kibernum-blanco.svg" alt="Kibernum" />
          <span className="program">AI Edge Talent</span>
        </Link>

        <nav className="sitenav-links" aria-label="Principal">
          <div ref={megaRef} onMouseEnter={openMega}>
            <button type="button" aria-expanded={mega} aria-controls="mega-programa" onClick={() => setMega((v) => !v)}>
              {aud === "profesional" ? "Programa" : "Etapas"} <Icon name="chevronDown" size={16} />
            </button>
          </div>
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} className={isActive(l.href) ? "active" : ""} onMouseEnter={closeMegaSoon}>{l.label}</Link>
          ))}
        </nav>

        <div className="sitenav-actions">
          {roleSwitch && <div className="hide-m">{roleSwitch}</div>}
          <Link href={view.cta.href} className="pill accent hide-m">{view.cta.label}</Link>
          {live && aud !== "equipo" && <Link href="/inicio" className="pill ghost hide-m">Mi espacio</Link>}
        </div>

        <button type="button" className="burger" aria-label="Abrir menú" aria-expanded={sheet} aria-controls="menu-movil" onClick={() => setSheet(true)}>
          <Icon name="menu" size={22} />
        </button>
      </div>

      <div id="mega-programa" className={`mega ${mega ? "open" : ""}`} onMouseEnter={openMega} onMouseLeave={closeMegaSoon} aria-hidden={!mega}>
        <div className="mega-inner">
          <div className="mega-intro">
            <div className="eyebrow" style={{ color: "var(--cyan)" }}>El programa</div>
            <h3>{MEGA_COPY[aud].title}</h3>
            <p>{MEGA_COPY[aud].body}</p>
            <Link href="/programa" className="more-link" style={{ color: "var(--cyan)" }} tabIndex={mega ? 0 : -1}>
              Ver el programa completo <Icon name="arrowRight" size={16} />
            </Link>
          </div>
          <div className="mega-stages">
            {PUBLIC_STAGES.map((s) => (
              <Link key={s.slug} href={stageHref(s.slug)} className="mega-stage" tabIndex={mega ? 0 : -1}>
                <span className="ico"><StageIcon slug={s.slug} fallback={s.icon} size={20} /></span>
                <strong>{s.n}. {s.name}</strong>
                <small>{s.tagline}</small>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>

      {/* Fuera del header: su backdrop-filter crearía un contenedor para el panel fijo. */}
      <div id="menu-movil" className={`sheet ${sheet ? "open" : ""}`} role="dialog" aria-modal="true" aria-label="Menú" aria-hidden={!sheet}>
        <div className="sheet-top">
          <Link href={view.home} className="brand" aria-label="Inicio" tabIndex={sheet ? 0 : -1}>
            <img src="/brand/kibernum-blanco.svg" alt="Kibernum" style={{ height: 22 }} />
          </Link>
          <button type="button" className="burger" style={{ display: "grid", marginLeft: 0 }} aria-label="Cerrar menú" onClick={() => setSheet(false)} tabIndex={sheet ? 0 : -1}>
            <Icon name="close" size={22} />
          </button>
        </div>
        <div className="sheet-aud">{audBar}</div>
        <nav aria-label="Menú móvil">
          <Link href="/programa" className="sheet-link" style={{ ["--i" as string]: 0 }} tabIndex={sheet ? 0 : -1}>
            {aud === "profesional" ? "Programa" : "Etapas"} <Icon name="arrowRight" />
          </Link>
          <div className="sheet-sub">
            {PUBLIC_STAGES.map((s) => (
              <Link key={s.slug} href={stageHref(s.slug)} tabIndex={sheet ? 0 : -1}>
                <span className="n">{s.n}</span> {s.name}
              </Link>
            ))}
          </div>
          {navLinks.map((l, i) => (
            <Link key={l.href} href={l.href} className="sheet-link" style={{ ["--i" as string]: i + 1 }} tabIndex={sheet ? 0 : -1}>
              {l.label} <Icon name="arrowRight" />
            </Link>
          ))}
          {roleSwitch}
        </nav>
        <div className="sheet-foot">
          <Link href={view.cta.href} className="pill accent" tabIndex={sheet ? 0 : -1}>{aud === "profesional" ? "Postular a Wave 3" : view.cta.label}</Link>
          {live && aud !== "equipo" && <Link href="/inicio" className="pill ghost" tabIndex={sheet ? 0 : -1}>Mi espacio</Link>}
        </div>
      </div>
    </>
  );
}
