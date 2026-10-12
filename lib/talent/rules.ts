import Papa from "papaparse";

/** Clusters de especialidad (misma regla que la función SQL public.specialty_family). */
export const FAMILIES = ["Ingeniería", "Calidad", "Agilidad", "Datos", "Otro"] as const;
export type Family = (typeof FAMILIES)[number];

export function specialtyFamily(text: string | null | undefined): Family | null {
  if (!text || !text.trim()) return null;
  const t = text.toLowerCase();
  if (/(qa|calidad|test|quality)/.test(t)) return "Calidad";
  if (/(scrum|agil|ágil|agile|po\b|product owner|project|pm\b|gestión|gestion)/.test(t)) return "Agilidad";
  if (/(dato|data|bi\b|analytics|analista de datos|cient)/.test(t)) return "Datos";
  if (/(dev|desarroll|ingenier|engineer|backend|frontend|fullstack|full stack|software|arquitect|devops|cloud|mobile)/.test(t)) return "Ingeniería";
  return "Otro";
}

export type ServiceStatus = "IN_SERVICE" | "BENCH" | "LEFT";
export const SERVICE_LABEL: Record<ServiceStatus, string> = { IN_SERVICE: "En servicio", BENCH: "Banca de talento", LEFT: "Salió de Kibernum" };

/** Seguimiento post-habilitación: Mes 1 (percepción y adopción) y Mes 3 (impacto real). */
export function followUpDates(base: string): { MONTH_1: string; MONTH_3: string } {
  const d = new Date(`${base}T12:00:00Z`);
  const add = (days: number) => {
    const x = new Date(d);
    x.setUTCDate(x.getUTCDate() + days);
    return x.toISOString().slice(0, 10);
  };
  return { MONTH_1: add(30), MONTH_3: add(90) };
}

/** Retención entre quienes completaron el programa: % que sigue en Kibernum (en servicio o banca). */
export function retention(people: { completed: boolean; service: ServiceStatus }[]): { completed: number; retained: number; pct: number | null } {
  const done = people.filter((p) => p.completed);
  const retained = done.filter((p) => p.service !== "LEFT").length;
  return { completed: done.length, retained, pct: done.length ? Math.round((retained / done.length) * 100) : null };
}

/* ───────── Importación de participantes de Waves pasadas ───────── */
export interface HistoricalRow {
  full_name: string;
  corporate_email: string;
  wave_id: string;
  client_name: string | null;
  role_title: string | null;
  specialty: string | null;
  completed: boolean;
  service_status: ServiceStatus;
}

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
const H: Record<string, string[]> = {
  full_name: ["nombre", "nombre completo", "profesional"],
  corporate_email: ["correo", "email", "correo corporativo", "mail"],
  wave: ["wave", "ola", "grupo"],
  client_name: ["cliente"],
  role_title: ["rol", "cargo"],
  specialty: ["especialidad", "familia", "cluster"],
  result: ["resultado", "completo", "termino", "estado programa"],
  service: ["estado servicio", "servicio", "situacion", "estado"],
};

export function waveIdFrom(v: string): string | null {
  const m = norm(v).match(/(\d+)/);
  return m ? `wave-${m[1]}` : null;
}

export function parseHistoricalCsv(text: string): { rows: HistoricalRow[]; errors: string[] } {
  const p = Papa.parse<Record<string, string>>(text.trim(), { header: true, skipEmptyLines: true, delimiter: "" });
  const fields = p.meta.fields ?? [];
  const col = (k: string) => fields.find((f) => H[k].includes(norm(f)));
  const c = Object.fromEntries(Object.keys(H).map((k) => [k, col(k)])) as Record<string, string | undefined>;
  const errors: string[] = [];
  if (!c.full_name || !c.corporate_email || !c.wave) return { rows: [], errors: ["El archivo debe tener columnas Nombre, Correo y Wave."] };
  const rows: HistoricalRow[] = [];
  p.data.forEach((r, i) => {
    const line = i + 2;
    const get = (k: string) => (c[k] ? (r[c[k]!] ?? "").trim() : "");
    const email = get("corporate_email").toLowerCase();
    const wave = waveIdFrom(get("wave"));
    if (!get("full_name") || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return errors.push(`Línea ${line}: nombre o correo inválido.`);
    if (!wave) return errors.push(`Línea ${line}: no se reconoce la Wave "${get("wave")}".`);
    const res = norm(get("result"));
    const svc = norm(get("service"));
    rows.push({
      full_name: get("full_name"),
      corporate_email: email,
      wave_id: wave,
      client_name: get("client_name") || null,
      role_title: get("role_title") || null,
      specialty: get("specialty") || null,
      completed: /^(si|sí|completo|completó|completado|certificado|aprobado|termino|terminó)/.test(res),
      service_status: /(sali|retir|renunc|desvincul|left)/.test(svc) ? "LEFT" : /(banca|bench)/.test(svc) ? "BENCH" : "IN_SERVICE",
    });
  });
  return { rows, errors };
}

/** CSV del pool de talento (para compartir internamente: sin puntajes de admisión). */
export function talentCsv(rows: { name: string; email: string; family: string | null; client: string | null; service: ServiceStatus; highTalent: boolean; waves: string }[]): string {
  const esc = (v: string) => (/[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const head = ["Nombre", "Correo", "Cluster", "Cliente", "Estado de servicio", "High Talent", "Waves"];
  const lines = rows.map((r) => [r.name, r.email, r.family ?? "", r.client ?? "", SERVICE_LABEL[r.service], r.highTalent ? "Sí" : "No", r.waves].map(esc).join(","));
  return [head.join(","), ...lines].join("\n");
}
