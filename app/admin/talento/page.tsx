import Link from "next/link";
import { requireStaffPage } from "@/lib/admission/auth";
import { talentPool } from "@/lib/talent/queries";
import { TalentPool } from "@/components/talent/TalentPool";

export const metadata = { title: "Talento · AI Edge Talent" };
export const dynamic = "force-dynamic";

export default async function TalentoPage() {
  const viewer = await requireStaffPage("/admin/talento");
  const rows = await talentPool();
  return (
    <div className="stack">
      <div className="dark-band spread">
        <div>
          <div className="eyebrow">Talento y alumni</div>
          <h1 style={{ color: "#fff", margin: 0 }}>Pool de talento AET</h1>
          <p className="muted" style={{ margin: "6px 0 0" }}>Todas las personas de todas las Waves: estado de servicio, clusters por especialidad, High Talent y seguimiento post-habilitación.</p>
        </div>
        <div className="row">
          <Link className="btn secondary" href="/admin/admision">Admisión</Link>
          {viewer.role === "admin" && <Link className="btn secondary" href="/admin/talento/importar">Cargar Waves pasadas</Link>}
        </div>
      </div>
      <TalentPool rows={rows} />
    </div>
  );
}
