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
  /** Certificación AI CERT: true aprobada, false no aprobada, null sin dato. */
  certified: boolean | null;
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
  certified: ["certificacion", "certificado", "ai cert", "aicert", "certificacion ai cert", "ai certs", "certifico"],
};

/** Dominio reservado (RFC 2606): nunca recibe correo. Marca a quien se cargó sin correo para completarlo después. */
export const NO_EMAIL_DOMAIN = "sin-correo.invalid";
export const hasRealEmail = (e: string | null | undefined) => Boolean(e) && !e!.toLowerCase().endsWith(`@${NO_EMAIL_DOMAIN}`);
/** Cómo se muestra un correo que puede ser un marcador. */
export const shownEmail = (e: string | null | undefined) => (hasRealEmail(e) ? e! : "Sin correo registrado");
const slug = (s: string) => norm(s).replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "").slice(0, 40);

export function waveIdFrom(v: string): string | null {
  const m = norm(v).match(/(\d+)/);
  return m ? `wave-${m[1]}` : null;
}

export function parseHistoricalCsv(text: string): { rows: HistoricalRow[]; errors: string[] } {
  const p = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, "").trim(), { header: true, skipEmptyLines: true, delimiter: "" });
  const fields = p.meta.fields ?? [];
  const col = (k: string) => fields.find((f) => H[k].includes(norm(f)));
  const c = Object.fromEntries(Object.keys(H).map((k) => [k, col(k)])) as Record<string, string | undefined>;
  const errors: string[] = [];
  if (!c.full_name || !c.wave) return { rows: [], errors: ["El archivo debe tener columnas Nombre y Wave (el Correo es recomendable)."] };
  const rows: HistoricalRow[] = [];
  p.data.forEach((r, i) => {
    const line = i + 2;
    const get = (k: string) => (c[k] ? (r[c[k]!] ?? "").trim() : "");
    const raw = get("corporate_email").toLowerCase();
    const wave = waveIdFrom(get("wave"));
    if (!get("full_name")) return errors.push(`Línea ${line}: falta el nombre.`);
    if (raw && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(raw)) return errors.push(`Línea ${line}: correo inválido.`);
    if (!wave) return errors.push(`Línea ${line}: no se reconoce la Wave "${get("wave")}".`);
    // Sin correo: queda registrada (cuenta para las cifras del programa) y el correo se completa después.
    const email = raw || `${slug(get("full_name"))}.${wave}@${NO_EMAIL_DOMAIN}`;
    const res = norm(get("result"));
    const svc = norm(get("service"));
    const cert = norm(get("certified"));
    rows.push({
      full_name: get("full_name"),
      corporate_email: email,
      wave_id: wave,
      client_name: get("client_name") || null,
      role_title: get("role_title") || null,
      specialty: get("specialty") || null,
      completed: /^(si|sí|completo|completó|completado|certificado|aprobado|termino|terminó)/.test(res),
      certified: /^(si|aprob|certific|yes|ok)/.test(cert) ? true : /^(no|reprob|pendiente no)/.test(cert) ? false : null,
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
