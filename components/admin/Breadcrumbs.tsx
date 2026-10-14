import Link from "next/link";

/** Migas de pan del portal: dónde estás y cómo volver al nivel anterior. El último nivel es la página actual. */
export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="crumbs" aria-label="Estás en">
      <ol>
        {items.map((it, i) => (
          <li key={`${it.label}-${i}`}>
            {it.href && i < items.length - 1 ? <Link href={it.href}>{it.label}</Link> : <span aria-current={i === items.length - 1 ? "page" : undefined}>{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
