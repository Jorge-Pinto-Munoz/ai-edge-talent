import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { SERVICE_LABEL, type ServiceStatus } from "@/lib/talent/rules";
import { layerName, type Layer } from "@/lib/journey/rules";
import { ADMISSION_LABEL, type AdmissionStatus } from "@/lib/domain/types";
import { TalentEditor } from "@/components/talent/TalentEditor";
import { FollowUps } from "@/components/talent/FollowUps";
import { Badge, fmtDate } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TalentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireStaffPage(`/admin/talento/${id}`);
  const db = await supabaseUser();
  const { data: t } = await db.from("talent").select("*").eq("id", id).single();
  if (!t) notFound();
  const [{ data: cands }, { data: history }, { data: fus }, { data: waves }] = await Promise.all([
    db.from("candidates").select("id, wave_id, status, journey_layer, journey_layer_since, client_name, role_title").eq("talent_id", id),
    db.from("service_status_history").select("*").eq("talent_id", id).order("at", { ascending: false }),
    db.from("follow_ups").select("*").eq("talent_id", id).order("due_date"),
    db.from("waves").select("id, name"),
  ]);
  const candIds = (cands ?? []).map((c) => c.id);
  const { data: jev } = candIds.length ? await db.from("journey_events").select("candidate_id, to_layer, at, exception").in("candidate_id", candIds).order("at") : { data: [] };
  const waveName = (w: string) => waves?.find((x) => x.id === w)?.name ?? w;

  return (
    <div className="stack">
      <div className="eyebrow"><Link href="/admin/talento">← Pool de talento</Link></div>
      <div className="spread">
        <div>
          <h1 style={{ margin: 0 }}>{t.full_name} {t.high_talent && <Badge tone="brand">High Talent</Badge>}</h1>
          <p className="muted" style={{ margin: "4px 0 0" }}>{t.email} · {t.specialty_family ?? "Sin cluster"} · {t.current_client ?? "—"}</p>
        </div>
        <Badge tone={t.service_status === "IN_SERVICE" ? "ok" : t.service_status === "BENCH" ? "warn" : "bad"}>{SERVICE_LABEL[t.service_status as ServiceStatus]}</Badge>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h2 className="h-card" style={{ marginTop: 0 }}>Recorrido por Wave</h2>
          {(cands ?? []).map((c) => (
            <div key={c.id} style={{ marginBottom: 12 }}>
              <strong>{waveName(c.wave_id)}</strong> · <small>{c.journey_layer ? layerName(c.journey_layer as Layer) : ADMISSION_LABEL[c.status as AdmissionStatus]}</small>
              <ul style={{ margin: "4px 0 0" }}>
                {(jev ?? []).filter((e) => e.candidate_id === c.id).map((e, i) => (
                  <li key={i}><small>{fmtDate(e.at)} · {layerName(e.to_layer as Layer)}{e.exception ? " (excepción)" : ""}</small></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="card">
          <h2 className="h-card" style={{ marginTop: 0 }}>Historial de servicio</h2>
          <ul>
            {(history ?? []).map((h) => (
              <li key={h.id}><small>{h.effective_date ?? fmtDate(h.at)} · {h.from_status ? `${SERVICE_LABEL[h.from_status as ServiceStatus]} → ` : ""}{SERVICE_LABEL[h.to_status as ServiceStatus]}{h.note ? ` · ${h.note}` : ""}</small></li>
            ))}
            {(history ?? []).length === 0 && <li className="muted">Sin cambios registrados.</li>}
          </ul>
          {t.high_talent && <p><small><strong>High Talent:</strong> {t.high_talent_reason}{t.high_talent_at ? ` · ${fmtDate(t.high_talent_at)}` : ""}</small></p>}
        </div>
      </div>

      <TalentEditor talent={t} isAdmin={viewer.role === "admin"} />
      <FollowUps talentId={t.id} waves={(cands ?? []).map((c) => ({ id: c.wave_id, name: waveName(c.wave_id) }))} items={fus ?? []} />
    </div>
  );
}
