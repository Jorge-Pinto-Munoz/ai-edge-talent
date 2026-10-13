"use server";

import { revalidatePath } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { getViewer, SESSION_EXPIRED } from "@/lib/admission/auth";
import { COMMUNITY_CONSENT, STAGE_RULES } from "@/lib/data/consents";
import { audit } from "./service";

export type ProfileResult = { ok: boolean; message: string };

/** Da o retira la autorización para el grupo de comunidad. Nunca condiciona el avance. */
export async function setCommunityConsent(accept: boolean): Promise<ProfileResult> {
  const v = await getViewer();
  if (!v) return { ok: false, message: SESSION_EXPIRED };
  const svc = supabaseService();
  const { data: active } = await svc.from("consents").select("id").eq("email", v.email).eq("kind", "COMMUNITY").is("revoked_at", null);
  if (accept && !(active ?? []).length) {
    const { data: cand } = await svc.from("candidates").select("id").eq("user_id", v.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    await svc.from("consents").insert({ kind: "COMMUNITY", version: COMMUNITY_CONSENT.version, text_snapshot: `${COMMUNITY_CONSENT.text} ${COMMUNITY_CONSENT.detail}`, email: v.email, user_id: v.id, candidate_id: cand?.id ?? null });
  }
  if (!accept && (active ?? []).length) await svc.from("consents").update({ revoked_at: new Date().toISOString() }).in("id", active!.map((a) => a.id));
  await audit(accept ? "consent.community.accepted" : "consent.community.revoked", { actor: v.id, actorEmail: v.email, targetUser: v.id, targetEmail: v.email }, svc);
  revalidatePath("/mi-perfil");
  return { ok: true, message: accept ? "Gracias: te contactaremos para sumarte al grupo." : "Retiramos tu autorización. Ya no te contactaremos para el grupo." };
}

/** Confirma que entiende el cierre de etapas (se pide una vez al iniciar AI First Mindset). */
export async function acceptStageRules(): Promise<ProfileResult> {
  const v = await getViewer();
  if (!v) return { ok: false, message: SESSION_EXPIRED };
  const svc = supabaseService();
  const { data: has } = await svc.from("consents").select("id").eq("email", v.email).eq("kind", "STAGE_RULES").eq("version", STAGE_RULES.version).maybeSingle();
  if (!has) {
    const { data: cand } = await svc.from("candidates").select("id").eq("user_id", v.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    await svc.from("consents").insert({ kind: "STAGE_RULES", version: STAGE_RULES.version, text_snapshot: [STAGE_RULES.title, ...STAGE_RULES.paras, STAGE_RULES.confirm].join(" "), email: v.email, user_id: v.id, candidate_id: cand?.id ?? null });
    await audit("consent.stage_rules.accepted", { actor: v.id, actorEmail: v.email, targetUser: v.id, targetEmail: v.email, details: { version: STAGE_RULES.version } }, svc);
  }
  revalidatePath("/mi-journey");
  return { ok: true, message: "Listo." };
}
