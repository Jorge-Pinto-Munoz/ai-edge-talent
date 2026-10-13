"use server";

import { headers } from "next/headers";
import { supabaseService } from "@/lib/supabase/server";
import { ipHash } from "@/lib/identity/service";
import { aiConfigured } from "@/lib/ai/client";
import { answerHelpQuestion } from "@/lib/ai/help";
import type { HelpAudience } from "@/lib/data/help";

export type AskResult = { kind: "ai"; answer: string } | { kind: "team"; message: string };

const PER_HOUR = 8; // por red
const PER_DAY = 400; // total, para acotar el costo

/** Pregunta libre en Ayuda que no calzó con una respuesta preparada. Responde el asistente o deriva al equipo. */
export async function askHelp(rawQuestion: string, audience: HelpAudience, page: string): Promise<AskResult> {
  const question = rawQuestion.trim().slice(0, 600);
  const aud: HelpAudience = audience === "cliente" ? "cliente" : "profesional";
  const toTeam = (message = "No tengo una respuesta preparada para eso. Déjanos tus datos y el equipo te responde por correo.") => ({ kind: "team" as const, message });
  if (question.length < 6) return toTeam("Cuéntame un poco más de tu pregunta.");
  const svc = supabaseService();
  const h = await headers();
  const ip = ipHash(h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip"));
  const log = (outcome: "ai" | "team" | "off") => svc.from("help_questions").insert({ question, audience: aud, outcome, ip_hash: ip, page: page.slice(0, 200) });

  if (!aiConfigured()) {
    await log("off");
    return toTeam();
  }
  const hour = new Date(Date.now() - 3600_000).toISOString();
  const day = new Date(Date.now() - 86_400_000).toISOString();
  const [{ count: mine }, { count: all }] = await Promise.all([
    ip ? svc.from("help_questions").select("id", { count: "exact", head: true }).eq("ip_hash", ip).gte("created_at", hour) : Promise.resolve({ count: 0 }),
    svc.from("help_questions").select("id", { count: "exact", head: true }).eq("outcome", "ai").gte("created_at", day),
  ]);
  if ((mine ?? 0) >= PER_HOUR || (all ?? 0) >= PER_DAY) {
    await log("off");
    return toTeam("Recibimos muchas preguntas en poco tiempo. Déjanos tus datos y te respondemos por correo.");
  }
  try {
    const r = await answerHelpQuestion(question, aud);
    await log(r.answerable ? "ai" : "team");
    return r.answerable ? { kind: "ai", answer: r.answer } : toTeam(`${r.answer} Déjanos tus datos y te respondemos por correo.`);
  } catch (e) {
    console.error("[ayuda] asistente", e instanceof Error ? e.message : e);
    await log("off");
    return toTeam();
  }
}
