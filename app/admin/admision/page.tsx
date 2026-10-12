import Link from "next/link";
import { requireStaffPage } from "@/lib/admission/auth";
import { supabaseUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { Callout, fmtDeadline } from "@/components/ui";
import { WAVE_STATUS_LABEL, type WaveStatus } from "@/lib/domain/types";
import { SignOut } from "@/components/admission/SignOut";

export const metadata = { title: "Admisión · AI Edge Talent" };
export const dynamic = "force-dynamic";

export default async function AdmisionHome() {
  if (!isSupabaseConfigured()) return <Callout tone="warn" title="Base de datos no configurada">Ver README · Configuración de Supabase.</Callout>;
  const viewer = await requireStaffPage("/admin/admision");
  const db = await supabaseUser();
  const { data: waves } = await db.from("waves").select("id, name, status, application_deadline").order("created_at", { ascending: false });
  const { data: counts } = await db.from("candidates").select("wave_id, status");
  const byWave = (id: string) => (counts ?? []).filter((c) => c.wave_id === id);
  return (
    <div className="stack">
      <div className="dark-band spread">
        <div>
          <div className="eyebrow">Portal de administración</div>
          <h1 style={{ color: "#fff", margin: 0 }}>Admisión por Wave</h1>
          <p className="muted" style={{ margin: "6px 0 0" }}>{viewer.email} · {viewer.role === "admin" ? "Admin" : "Delivery"}</p>
        </div>
        <div className="row">
          {viewer.role === "admin" && <Link className="btn secondary" href="/admin/accesos">Accesos</Link>}
          <SignOut />
        </div>
      </div>
      <div className="grid grid-2">
        {(waves ?? []).map((w) => {
          const cs = byWave(w.id);
          const submitted = cs.filter((c) => !["NOMINATED", "INVITED", "IDENTIFIED", "APPLICATION_STARTED"].includes(c.status)).length;
          const enrolled = cs.filter((c) => ["ENROLLED", "MINDSET_READY"].includes(c.status)).length;
          return (
            <Link key={w.id} href={`/admin/admision/${w.id}`} className="card signal" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="spread">
                <h3 style={{ margin: 0 }}>{w.name}</h3>
                <span className="badge">{WAVE_STATUS_LABEL[w.status as WaveStatus]}</span>
              </div>
              <p className="muted" style={{ margin: "6px 0 12px" }}>{w.application_deadline ? `Deadline: ${fmtDeadline(w.application_deadline)}` : "Sin deadline"}</p>
              <div className="grid grid-3">
                <div><div className="kpi">{cs.length}</div><small className="muted">candidatos</small></div>
                <div><div className="kpi">{submitted}</div><small className="muted">postulaciones enviadas</small></div>
                <div><div className="kpi accent">{enrolled}</div><small className="muted">inscritos</small></div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
