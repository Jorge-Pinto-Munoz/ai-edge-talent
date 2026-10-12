import { fmtYmd } from "@/components/ui";
import type { JourneyView } from "@/components/journey/path/types";

/** Avance AI CERT por tramos: introductorio y especialista, cinco tramos cada uno. */
export function AiCertProgressView({ p, compact = false }: { p: JourneyView["aicert"]; compact?: boolean }) {
  if (!p) {
    return compact ? <span className="muted">Sin avance registrado</span> : (
      <div className="jr-project">
        <span className="jr-k">Tu avance en AI CERTs</span>
        <p className="muted" style={{ margin: 0 }}>Aún no hay avance registrado. El líder del programa lo actualiza desde la plataforma AI CERTs.</p>
      </div>
    );
  }
  const courses = [
    { key: "INTRO", name: p.introCourse ?? "Curso introductorio", tramo: p.course === "SPECIALIST" ? 5 : p.tramo, percent: p.course === "SPECIALIST" ? 100 : p.percent },
    { key: "SPECIALIST", name: p.specialistCourse ?? "Curso especialista", tramo: p.course === "SPECIALIST" ? p.tramo : 0, percent: p.course === "SPECIALIST" ? p.percent : 0 },
  ];
  const bars = (tramo: number, percent: number, label: string) => (
    <div className="tramo-bar" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((t) => {
        // Cada tramo es un 20 %: lleno si ya pasó, parcial si es el actual.
        const fill = Math.max(0, Math.min(100, (percent - (t - 1) * 20) * 5));
        return <span key={t}><i style={{ width: `${t < tramo ? 100 : fill}%` }} /></span>;
      })}
    </div>
  );
  if (compact) return <div className="tramo" style={{ minWidth: 140 }}>{bars(p.tramo, p.percent, p.label)}<small className="muted">{p.label}</small></div>;
  return (
    <div className="jr-project">
      <span className="jr-k">Tu avance en AI CERTs · {p.overall}% de la ruta</span>
      {courses.map((c) => (
        <div key={c.key} className="tramo">
          <div className="spread"><strong>{c.name}</strong><span className="muted"><small>{c.tramo ? `Tramo ${c.tramo} · ${c.percent}%` : "Por iniciar"}</small></span></div>
          {bars(c.tramo, c.percent, `${c.name}: ${c.percent}%`)}
        </div>
      ))}
      <small className="muted">Actualizado el {fmtYmd(p.updatedAt.slice(0, 10))}{p.examDate ? ` · Examen: ${fmtYmd(p.examDate)}` : ""}. Lo actualiza el líder del programa.</small>
    </div>
  );
}
