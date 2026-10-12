"use client";

import { Icon } from "@/components/site/Icon";

export function PrintButton({ label = "Descargar PDF" }: { label?: string }) {
  return <button type="button" className="btn secondary small no-print" onClick={() => window.print()}><Icon name="download" size={16} /> {label}</button>;
}
