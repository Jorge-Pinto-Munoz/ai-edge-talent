import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseService } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { CATALOG } from "@/lib/data/aicert-catalog";
import { MIN_SAMPLE } from "./stats";

export interface Adoption {
  enrolled: number;
  certified: number;
  byWave: { name: string; enrolled: number; certified: number }[];
  /** Solo cursos registrados por el líder del programa (avance AI CERT). Vacío si aún no hay suficientes. */
  byCourse: { name: string; enrolled: number; certified: number }[];
  bySpecialty: { name: string; n: number }[];
  courseSample: number;
}

/** Misma agrupación que public.specialty_family (banca de talento). */
export function specialtyFamily(p: string | null): string | null {
  if (!p || !p.trim()) return null;
  const x = p.toLowerCase();
  if (/(qa|calidad|test|quality)/.test(x)) return "Calidad";
  if (/(scrum|agil|ágil|agile|po\b|product owner|project|pm\b|gestión|gestion)/.test(x)) return "Agilidad";
  if (/(dato|data|bi\b|analytics|analista de datos|cient)/.test(x)) return "Datos";
  if (/(dev|desarroll|ingenier|engineer|backend|frontend|fullstack|full stack|software|arquitect|devops|cloud|mobile)/.test(x)) return "Ingeniería";
  return "Otro";
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[™+]/g, " ").replace(/\s+/g, " ").trim();
/** Nombre oficial del catálogo que corresponde a lo que registró el admin (o el texto tal cual si no calza). */
function courseName(raw: string): string {
  const r = norm(raw);
  const hit = CATALOG.find((c) => {
    const n = norm(c.name).replace(/^ai /, "");
    return r.includes(n) || n.includes(r.replace(/^ai /, ""));
  });
  return hit?.name ?? raw.trim();
}

/**
 * Talento que estamos desarrollando: agregados reales del programa (sin datos personales).
 * Inscritos = personas que aceptaron su compromiso; certificados = AI CERT aprobada y verificada.
 */
export const programAdoption = unstable_cache(
  async (): Promise<Adoption | null> => {
    if (!isSupabaseConfigured()) return null;
    const db = supabaseService();
    const [{ data: waves }, { data: people }, { data: certs }, { data: prog }] = await Promise.all([
      db.from("waves").select("id, name, created_at").order("created_at"),
      db.from("candidates").select("id, wave_id, specialty").in("status", ["CONDITIONS_ACCEPTED", "ENROLLED", "MINDSET_READY"]),
      db.from("certifications").select("candidate_id").eq("status", "VERIFIED").eq("result", "PASSED"),
      db.from("aicert_progress").select("candidate_id, specialist_course"),
    ]);
    const ppl = people ?? [];
    if (ppl.length < MIN_SAMPLE) return null;
    const ids = new Set(ppl.map((p) => p.id));
    const certified = new Set((certs ?? []).map((c) => c.candidate_id).filter((id) => ids.has(id)));

    const byWave = (waves ?? [])
      .map((w) => {
        const mine = ppl.filter((p) => p.wave_id === w.id);
        return { name: w.name.replace("AI Edge Talent · ", ""), enrolled: mine.length, certified: mine.filter((p) => certified.has(p.id)).length };
      })
      .filter((w) => w.enrolled > 0);

    const courses = new Map<string, { enrolled: number; certified: number }>();
    const withCourse = (prog ?? []).filter((p) => p.specialist_course && ids.has(p.candidate_id));
    for (const p of withCourse) {
      const k = courseName(p.specialist_course!);
      const e = courses.get(k) ?? { enrolled: 0, certified: 0 };
      e.enrolled++;
      if (certified.has(p.candidate_id)) e.certified++;
      courses.set(k, e);
    }
    const byCourse = withCourse.length >= MIN_SAMPLE ? [...courses.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.enrolled - a.enrolled) : [];

    const spec = new Map<string, number>();
    for (const p of ppl) {
      const f = specialtyFamily(p.specialty);
      if (f) spec.set(f, (spec.get(f) ?? 0) + 1);
    }
    const bySpecialty = [...spec.entries()].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n).slice(0, 6);

    return { enrolled: ppl.length, certified: certified.size, byWave, byCourse, bySpecialty, courseSample: withCourse.length };
  },
  ["aicert-adoption"],
  { revalidate: 600, tags: ["aicert-rate"] },
);
