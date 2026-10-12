import Papa from "papaparse";

/** Importación de base de candidatos por Wave (CSV exportado de Excel/Monday). */
export interface CandidateRow {
  full_name: string;
  corporate_email: string;
  client_name: string | null;
  role_title: string | null;
  team: string | null;
  specialty: string | null;
  delivery_owner: string | null;
}

/** Encabezados aceptados (se comparan sin tildes ni mayúsculas). */
const ALIASES: Record<keyof CandidateRow, string[]> = {
  full_name: ["nombre", "nombre completo", "full_name", "profesional", "name"],
  corporate_email: ["correo", "email", "correo corporativo", "mail", "corporate_email"],
  client_name: ["cliente", "client", "client_name"],
  role_title: ["rol", "cargo", "rol/cargo", "role", "role_title"],
  team: ["equipo", "unidad", "unidad/equipo", "team"],
  specialty: ["especialidad", "familia", "cluster", "specialty"],
  delivery_owner: ["delivery", "delivery owner", "delivery_owner", "responsable delivery"],
};

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

export interface ImportResult {
  rows: CandidateRow[];
  errors: { line: number; message: string }[];
  mapping: Partial<Record<keyof CandidateRow, string>>;
  duplicates: string[];
}

export function parseCandidatesCsv(text: string): ImportResult {
  const parsed = Papa.parse<Record<string, string>>(text.trim(), { header: true, skipEmptyLines: true, delimiter: "" });
  const headers = parsed.meta.fields ?? [];
  const mapping: ImportResult["mapping"] = {};
  for (const key of Object.keys(ALIASES) as (keyof CandidateRow)[]) {
    const h = headers.find((x) => ALIASES[key].includes(norm(x)));
    if (h) mapping[key] = h;
  }
  const errors: ImportResult["errors"] = [];
  if (!mapping.full_name || !mapping.corporate_email) {
    errors.push({ line: 1, message: "El archivo debe tener columnas de nombre y correo." });
    return { rows: [], errors, mapping, duplicates: [] };
  }
  const seen = new Set<string>();
  const duplicates: string[] = [];
  const rows: CandidateRow[] = [];
  parsed.data.forEach((r, i) => {
    const line = i + 2;
    const get = (k: keyof CandidateRow) => (mapping[k] ? (r[mapping[k]!] ?? "").trim() : "") || null;
    const name = get("full_name");
    const email = get("corporate_email")?.toLowerCase() ?? null;
    if (!name) return errors.push({ line, message: "Falta el nombre." });
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return errors.push({ line, message: `Correo inválido para ${name}.` });
    if (seen.has(email)) return duplicates.push(email);
    seen.add(email);
    rows.push({
      full_name: name,
      corporate_email: email,
      client_name: get("client_name"),
      role_title: get("role_title"),
      team: get("team"),
      specialty: get("specialty"),
      delivery_owner: get("delivery_owner"),
    });
  });
  return { rows, errors, mapping, duplicates };
}
