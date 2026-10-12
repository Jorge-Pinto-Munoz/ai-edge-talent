import Link from "next/link";
import type { CandidateListItem } from "@/lib/admission/queries";
import { ADMISSION_LABEL, type AdmissionStatus } from "@/lib/domain/types";
import { Badge, admissionTone } from "@/components/ui";

const COLUMNS: { key: string; label: string; color: string; statuses: string[] }[] = [
  { key: "pre", label: "Por postular", color: "var(--fog)", statuses: ["NOMINATED", "INVITED", "IDENTIFIED", "APPLICATION_STARTED"] },
  { key: "sent", label: "Postularon", color: "var(--st-info)", statuses: ["APPLICATION_SUBMITTED"] },
  { key: "decide", label: "Por decidir", color: "var(--st-warn)", statuses: ["ASSESSMENT_EVALUATED", "HUMAN_REVIEW", "RESCUE_REQUIRED"] },
  { key: "selected", label: "Seleccionados", color: "var(--st-review)", statuses: ["SELECTED", "CONDITIONS_PENDING", "CONDITIONS_ACCEPTED"] },
  { key: "enrolled", label: "Inscritos", color: "var(--st-ok)", statuses: ["ENROLLED", "MINDSET_READY"] },
  { key: "out", label: "No continúan", color: "var(--st-bad)", statuses: ["NOT_SELECTED"] },
];

/**
 * Vista por columnas de la admisión: dónde está cada persona de un vistazo.
 * Las decisiones se registran en la vista de lista (con nota y trazabilidad) o en el detalle del candidato.
 */
export function CandidateBoard({ waveId, candidates, isAdmin }: { waveId: string; candidates: CandidateListItem[]; isAdmin: boolean }) {
  return (
    <div className="board" role="region" aria-label="Candidatos por etapa de admisión" tabIndex={0}>
      {COLUMNS.map((col) => {
        const items = candidates.filter((c) => col.statuses.includes(c.status)).sort((a, b) => (b.eval?.total ?? -1) - (a.eval?.total ?? -1));
        return (
          <section key={col.key} className="board-col" aria-label={`${col.label}: ${items.length}`}>
            <div className="board-col-head">
              <strong><span className="swatch" style={{ background: col.color }} />{col.label}</strong>
              <span className="n">{items.length}</span>
            </div>
            {items.length === 0 && <div className="board-empty">Nadie en esta etapa</div>}
            {items.map((c) => (
              <Link key={c.id} href={`/admin/admision/${waveId}/c/${c.id}`} className="board-card">
                <strong>{c.full_name}</strong>
                <small>{[c.client_name, c.role_title ?? c.specialty].filter(Boolean).join(" · ") || c.corporate_email}</small>
                <span className="meta">
                  <Badge tone={admissionTone(c.status)}>{ADMISSION_LABEL[c.status as AdmissionStatus]}</Badge>
                  {isAdmin && c.eval && <span className="score" title="Puntaje IA (solo admin)">{Math.round(c.eval.total)} · {c.eval.level}</span>}
                </span>
              </Link>
            ))}
          </section>
        );
      })}
    </div>
  );
}
