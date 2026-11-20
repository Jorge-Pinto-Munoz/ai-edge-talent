"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Migas de pan del portal: dónde estás y cómo volver al nivel anterior. El último nivel es la página actual. */
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  const path = usePathname();
  return (
    <nav className="crumbs" aria-label="Estás en">
      <ol>
        {items.map((it, i) => (
          <li key={`${it.label}-${i}`}>
            {it.href && i < items.length - 1 ? (it.href.split("?")[0] === path ? <a href={it.href}>{it.label}</a> : <Link href={it.href}>{it.label}</Link>) : <span aria-current={i === items.length - 1 ? "page" : undefined}>{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
