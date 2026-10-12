"use client";

import { usePathname } from "next/navigation";
import { isPortalPath } from "@/lib/site/audience";

/** La aclaración de imágenes solo aplica al sitio público (los portales no usan fotos ilustrativas). */
export function FooterNote({ live }: { live: boolean }) {
  const path = usePathname();
  if (live && isPortalPath(path)) return <span>¿Necesitas ayuda? Escríbele a tu Delivery o al equipo AI Edge Talent.</span>;
  return <span>{live ? "Imágenes ilustrativas, no participantes reales." : "Demo funcional: datos locales en este navegador. Imágenes ilustrativas, no participantes reales."}</span>;
}
