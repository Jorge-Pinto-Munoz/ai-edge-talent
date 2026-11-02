import { DELIVERY_STATE, deliveryState, type DeliveryState } from "@/lib/journey/delivery-status";

type Person = { id: string; full_name: string };
type Sub = { id: string; candidate_id: string; capsule_id: string; attempt: number; status: string; score: number | null };

/** Estado de entrega de toda la Wave en la etapa: verde aprobado, amarillo no cumple, azul por revisar, rojo sin entregar. */
export function WaveDeliveryBoard({ people, subs, required }: { people: Person[]; subs: Sub[]; required: string[] }) {
  const rows = people.map((p) => {
    const mine = subs.filter((s) => s.candidate_id === p.id);
    const last = [...mine].sort((a, b) => b.attempt - a.attempt)[0];
    return { p, state: deliveryState(mine, required), last };
  });
  const order: DeliveryState[] = ["missing", "not_approved", "pending", "approved"];
  rows.sort((a, b) => order.indexOf(a.state) - order.indexOf(b.state) || a.p.full_name.localeCompare(b.p.full_name, "es"));
  const count = (k: DeliveryState) => rows.filter((r) => r.state === k).length;
  return (
    <section className="card wdb" aria-labelledby="wdb-t">
      <div className="spread">
        <h2 id="wdb-t" className="h-card" style={{ margin: 0 }}>Estado de la Wave</h2>
        <small className="muted">{people.length} persona(s)</small>
      </div>
      <ul className="wdb-sum">
        {(["approved", "not_approved", "pending", "missing"] as DeliveryState[]).map((k) => (
          <li key={k} className={`t-${DELIVERY_STATE[k].tone}`}><strong>{count(k)}</strong> {DELIVERY_STATE[k].label}</li>
        ))}
      </ul>
      <ul className="wdb-list">
        {rows.map(({ p, state, last }) => (
          <li key={p.id} className={`t-${DELIVERY_STATE[state].tone}`}>
            <span className="wdb-dot" aria-hidden="true" />
            {last ? <a href={`#sub-${last.id}`}>{p.full_name}</a> : <span>{p.full_name}</span>}
            <small>{DELIVERY_STATE[state].label}{last?.score != null ? ` · ${Math.round(Number(last.score))}/100` : ""}</small>
          </li>
        ))}
        {people.length === 0 && <li className="muted">Aún no hay personas inscritas en esta Wave.</li>}
      </ul>
    </section>
  );
}
