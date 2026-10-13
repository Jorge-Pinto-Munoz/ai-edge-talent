import "server-only";
import { supabaseService } from "@/lib/supabase/server";
import { stageStatus, type RequirementInput } from "@/lib/journey/closure";
import type { Layer } from "@/lib/journey/rules";
import type { ExpPerson } from "./experience";

const ACTIVE = ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"];

/**
 * Personas de una Wave con su estado de etapa, cierres y pulsos de cierre. Lee con la llave de servicio:
 * QUIEN LLAMA autoriza (admin ve toda la Wave; Delivery solo `onlyIds` = sus asignados, y sin respuestas si
 * la experiencia no está compartida: `withAnswers = false`).
 */
export async function loadWavePeople(waveId: string, opts: { onlyIds?: string[]; withAnswers?: boolean } = {}): Promise<ExpPerson[]> {
  const svc = supabaseService();
  let q = svc.from("candidates").select("id, full_name, client_name, user_id, corporate_email, journey_layer, journey_layer_since").eq("wave_id", waveId).in("status", ACTIVE).order("full_name");
  if (opts.onlyIds) {
    if (!opts.onlyIds.length) return [];
    q = q.in("id", opts.onlyIds);
  }
  const { data: people } = await q;
  const ids = (people ?? []).map((p) => p.id);
  if (!ids.length) return [];
  const userIds = (people ?? []).map((p) => p.user_id).filter(Boolean) as string[];
  const none = { data: [] as never[] };
  const [{ data: caps }, { data: subs }, { data: certs }, { data: members }, { data: pulses }, { data: closures }, { data: assigns }, { data: profiles }, { data: creds }] = await Promise.all([
    svc.from("capsules").select("id, layer, task_prompt, task_required, max_attempts").eq("wave_id", waveId).eq("published", true),
    svc.from("submissions").select("candidate_id, capsule_id, status, attempt").in("candidate_id", ids),
    svc.from("certifications").select("candidate_id, result, status").in("candidate_id", ids),
    svc.from("lab_project_members").select("candidate_id, lab_projects(status)").in("candidate_id", ids),
    svc.from("pulse_responses").select("candidate_id, pulse, created_at, answers").in("candidate_id", ids),
    svc.from("stage_closures").select("candidate_id, layer, requirements_met_at, requirements_by_exception, closed_at").in("candidate_id", ids),
    svc.from("delivery_assignments").select("candidate_id, delivery_email").in("candidate_id", ids),
    userIds.length ? svc.from("profiles").select("id, status").in("id", userIds) : none,
    userIds.length ? svc.from("user_credentials").select("user_id, last_login_at").in("user_id", userIds) : none,
  ]);
  const { data: progress } = await svc.from("capsule_progress").select("candidate_id, capsule_id").in("candidate_id", ids);
  // Último ingreso: el de la credencial personal o, si entró por enlace mágico, el de Supabase Auth.
  const signed = new Set((creds ?? []).filter((c: { last_login_at: string | null }) => c.last_login_at).map((c: { user_id: string }) => c.user_id));
  if (userIds.some((u) => !signed.has(u))) {
    const { data } = await svc.auth.admin.listUsers({ perPage: 1000 });
    for (const u of data?.users ?? []) if (u.last_sign_in_at) signed.add(u.id);
  }
  const now = Date.now();

  return (people ?? []).map((p) => {
    const layer = p.journey_layer as Layer | null;
    const mine = <T extends { candidate_id: string }>(xs: T[] | null) => (xs ?? []).filter((x) => x.candidate_id === p.id);
    const cl = mine(closures);
    const cur = cl.find((c) => c.layer === layer);
    const input: RequirementInput = {
      capsules: (caps ?? []) as RequirementInput["capsules"],
      submissions: mine(subs),
      certifications: mine(certs),
      labStatus: (mine(members)[0]?.lab_projects as unknown as { status: string } | null)?.status ?? null,
      byException: Boolean(cur?.requirements_by_exception),
    };
    const started =
      mine(progress).length > 0 || mine(subs).length > 0 || (layer === "ROLE_ENABLEMENT" && mine(certs).length > 0) || (layer === "AI_LAB_SHOWCASE" && mine(members).length > 0);
    const myPulses = mine(pulses);
    const status = stageStatus({
      ...input,
      current: layer,
      layer: layer && layer !== "ASSESSMENT" ? layer : "AI_MINDSET",
      answered: myPulses.map((x) => x.pulse),
      started,
      closedAt: cur?.closed_at ?? null,
      pulseWaitDays: cur?.requirements_met_at ? (now - new Date(cur.requirements_met_at).getTime()) / 86_400_000 : null,
    });
    const prof = (profiles ?? []).find((x: { id: string }) => x.id === p.user_id) as { status: string } | undefined;
    return {
      id: p.id,
      name: p.full_name,
      client: p.client_name,
      delivery: mine(assigns)[0]?.delivery_email ?? null,
      layer,
      layerSince: p.journey_layer_since,
      status,
      accountActive: prof?.status === "ACTIVE",
      signedIn: Boolean(p.user_id && signed.has(p.user_id)),
      closures: cl.map((c) => ({ layer: c.layer as Layer, requirements_met_at: c.requirements_met_at, closed_at: c.closed_at })),
      pulses: opts.withAnswers === false ? myPulses.map((x) => ({ pulse: x.pulse, created_at: x.created_at, answers: {} })) : myPulses.map((x) => ({ pulse: x.pulse, created_at: x.created_at, answers: (x.answers ?? {}) as Record<string, unknown> })),
    };
  });
}
