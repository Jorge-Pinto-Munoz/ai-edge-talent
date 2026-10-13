import type { Adoption } from "@/lib/aicert/adoption";
import { MIN_SAMPLE } from "@/lib/aicert/stats";
import { Kpi } from "@/components/ds/Status";

/** Talento que estamos desarrollando: solo cifras reales; si aún no alcanzan, un estado vacío honesto. */
export function AdoptionSection({ data }: { data: Adoption | null }) {
  if (!data) {
    return (
      <div className="adopt-empty">
        <strong>Estamos consolidando los datos del programa.</strong>
        <span>Publicamos cifras cuando hay al menos {MIN_SAMPLE} profesionales inscritos, para que sean representativas. Nunca mostramos datos individuales.</span>
      </div>
    );
  }
  const max = Math.max(...data.byWave.map((w) => w.enrolled), 1);
  const maxC = Math.max(...data.byCourse.map((c) => c.enrolled), 1);
  return (
    <div className="adopt">
      <div style={{ display: "grid", gap: 10 }}>
        <div className="adopt-kpis">
          <Kpi label="Profesionales inscritos" value={data.enrolled} hint="Aceptaron su compromiso" />
          <Kpi label="Certificados AI CERT" value={data.certified} hint="Aprobados y verificados" />
        </div>
        {data.bySpecialty.length > 0 && (
          <div className="adopt-bars">
            <h3>Por especialidad</h3>
            {data.bySpecialty.map((s) => (
              <div key={s.name} className="bar-row"><span>{s.name}</span><strong>{s.n}</strong><div className="bar" aria-hidden="true"><span className="alt" style={{ width: `${(s.n / data.enrolled) * 100}%` }} /></div></div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        <div className="adopt-bars">
          <h3>Evolución por Wave</h3>
          <div className="adopt-legend"><span><i />Inscritos</span><span><i className="alt" />Certificados</span></div>
          {data.byWave.map((w) => (
            <div key={w.name} className="bar-row" aria-label={`${w.name}: ${w.enrolled} inscritos, ${w.certified} certificados`}>
              <span>{w.name}</span><strong>{w.certified} / {w.enrolled}</strong>
              <div className="bar" aria-hidden="true"><span style={{ width: `${(w.enrolled / max) * 100}%` }} /></div>
              <div className="bar" aria-hidden="true"><span className="alt" style={{ width: `${(w.certified / max) * 100}%` }} /></div>
            </div>
          ))}
        </div>
        {data.byCourse.length > 0 ? (
          <div className="adopt-bars">
            <h3>Certificaciones más elegidas</h3>
            {data.byCourse.map((c) => (
              <div key={c.name} className="bar-row"><span>{c.name}</span><strong>{c.enrolled}</strong><div className="bar" aria-hidden="true"><span style={{ width: `${(c.enrolled / maxC) * 100}%` }} /></div></div>
            ))}
          </div>
        ) : (
          <div className="adopt-empty"><strong>Certificaciones más elegidas</strong><span>Se mostrará cuando el avance AI CERT de al menos {MIN_SAMPLE} profesionales registre su curso especialista.</span></div>
        )}
      </div>
    </div>
  );
}
