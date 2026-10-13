import { Icon, type IconName } from "@/components/site/Icon";

/** Estados del sistema (Status Indicator): un solo vocabulario para toda la plataforma. */
export type StatusKind = "pending" | "progress" | "done" | "attention" | "blocked";
export const STATUS_META: Record<StatusKind, { label: string; icon: IconName }> = {
  pending: { label: "Pendiente", icon: "clock" },
  progress: { label: "En curso", icon: "play" },
  done: { label: "Completado", icon: "check" },
  attention: { label: "Requiere atención", icon: "alert" },
  blocked: { label: "Bloqueado", icon: "lock" },
};

export function StatusPill({ kind, label }: { kind: StatusKind; label?: string }) {
  const m = STATUS_META[kind];
  return (
    <span className={`ds-status s-${kind}`}>
      <Icon name={m.icon} size={14} /> {label ?? m.label}
    </span>
  );
}

/** KPI Card: cifra, etiqueta y contexto. Sin datos, se dice explícitamente. */
export function Kpi({ value, label, hint }: { value: string | number | null; label: string; hint?: string }) {
  return (
    <div className="ds-kpi">
      <span className="ds-kpi-label">{label}</span>
      <strong>{value ?? "—"}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}
