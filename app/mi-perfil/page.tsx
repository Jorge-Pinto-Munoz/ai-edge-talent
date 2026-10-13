import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/admission/auth";
import { supabaseService } from "@/lib/supabase/server";
import { HOME_BY_ROLE } from "@/lib/identity/service";
import { COMMUNITY_CONSENT, STAGE_RULES } from "@/lib/data/consents";
import { ProfileForms } from "@/components/identity/ProfileForms";

export const metadata = { title: "Mi perfil · AI Edge Talent" };
export const dynamic = "force-dynamic";

export default async function MiPerfil() {
  const v = await getViewer();
  if (!v) redirect("/ingresar?next=/mi-perfil");
  const svc = supabaseService();
  const [{ data: cred }, { data: consents }] = await Promise.all([
    svc.from("user_credentials").select("pin_hash, pin_set_at").eq("user_id", v.id).maybeSingle(),
    svc.from("consents").select("kind, version, accepted_at, revoked_at").eq("email", v.email).order("accepted_at", { ascending: false }),
  ]);
  const community = (consents ?? []).find((c) => c.kind === "COMMUNITY" && !c.revoked_at) ?? null;
  const rules = (consents ?? []).find((c) => c.kind === "STAGE_RULES") ?? null;
  return (
    <div className="team" style={{ maxWidth: 760 }}>
      <div>
        <div className="eyebrow"><Link href={HOME_BY_ROLE[v.role] ?? "/inicio"}>← Volver a mi espacio</Link></div>
        <h1 style={{ margin: "6px 0" }}>Mi perfil</h1>
        <p className="muted" style={{ margin: 0 }}>{v.fullName ?? v.email} · {v.email}</p>
      </div>
      <ProfileForms community={community ? community.accepted_at : null} communityText={COMMUNITY_CONSENT.text} communityDetail={COMMUNITY_CONSENT.detail} isPro={v.role === "kiber"} />
      {v.role === "kiber" && (
        <section className="card">
          <h2 style={{ marginTop: 0 }}>{STAGE_RULES.title}</h2>
          {STAGE_RULES.paras.map((p) => <p key={p}>{p}</p>)}
          <p className="muted">{STAGE_RULES.who}</p>
          <p className="muted" style={{ marginBottom: 0 }}><small>{rules ? `Confirmaste estas reglas el ${new Date(rules.accepted_at).toLocaleDateString("es-CL")} (versión ${rules.version}).` : "Las confirmarás al iniciar AI First Mindset."}</small></p>
        </section>
      )}
    </div>
  );
}
