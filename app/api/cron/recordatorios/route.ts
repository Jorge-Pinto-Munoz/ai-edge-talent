import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runReminders } from "@/lib/reminders/run";
import { aiConfigured } from "@/lib/ai/client";
import { pendingAiReviewIds, runAiReviews } from "@/lib/journey/ai-review";
import { supabaseService } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Lo llama Vercel Cron una vez al día (vercel.json) con `Authorization: Bearer $CRON_SECRET`. */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 503 });
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const reminders = await runReminders();
    // Respaldo: entregas por revisar que quedaron sin propuesta de IA (p. ej. si la revisión en segundo plano se cortó).
    let aiReviews = 0;
    if (aiConfigured()) {
      const { data: waves } = await supabaseService().from("waves").select("id").neq("status", "CLOSED");
      const ids: string[] = [];
      for (const w of waves ?? []) ids.push(...(await pendingAiReviewIds(w.id)));
      aiReviews = (await runAiReviews(ids.slice(0, 6), 3)).ok;
    }
    return NextResponse.json({ ok: true, ...reminders, aiReviews });
  } catch (e) {
    console.error("[cron recordatorios]", e instanceof Error ? e.message : e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
