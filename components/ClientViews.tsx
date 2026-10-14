"use client";

import Link from "next/link";
import { useState } from "react";
import { useStore } from "@/lib/store/StoreProvider";
import { confirmClientOnboarding, createNomination } from "@/lib/store/state";
import { CLIENT_ONBOARDING_QA, CLIENT_PHASES } from "@/lib/data/program";
import { CLIENT_VISIBLE_LABEL, toClientVisible } from "@/lib/domain/admission";
import { nominationsOpen } from "@/lib/domain/wave";
import { FaqList } from "./journey";
import { Badge, Callout, fmtDate } from "./ui";

function useClientScope() {
  const { state } = useStore();
  const wave = state.waves.find((w) => w.isReferenceWave) ?? state.waves[0];
  const [clientId, setClientId] = useState(wave.clients[0]?.id ?? "");
  const client = wave.clients.find((c) => c.id === clientId);
  const picker = (
    <div className="row">
      <label htmlFor="cli" style={{ margin: 0 }}>Cliente (demo):</label>
      <select id="cli" value={clientId} onChange={(e) => setClientId(e.target.value)} style={{ width: "auto" }}>
        {wave.clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <Badge>{wave.name}</Badge>
    </div>
  );
  return { wave, client, picker };
}

function RoleNotice({ allowed }: { allowed: string[] }) {
  const { state } = useStore();
  if (allowed.includes(state.session.role)) return null;
  return <Callout tone="warn" title="Vista de solo lectura">Cambia la “Vista demo” a Cliente para operar esta pantalla.</Callout>;
}

export function ClientJourney() {
  const { state } = useStore();
  const { wave, client, picker } = useClientScope();
  if (!client) return <Callout title="Sin clientes en la Wave de referencia" />;
  const myApps = state.applications.filter((a) => a.waveId === wave.id && a.client === client.name);
  const appliedNominationIds = new Set(myApps.map((a) => a.nominationId).filter(Boolean));
  const myNoms = state.nominations.filter((n) => n.waveId === wave.id && n.clientId === client.id && !appliedNominationIds.has(n.id) && n.status !== "DISCARDED");
  const confirmed = state.clientOnboarding[`${wave.id}:${client.id}`];

  return (
    <div className="stack">
      <div className="dark-band">
        <div className="eyebrow">AI Edge Talent · Cliente</div>
        <h1 style={{ color: "#fff" }}>Client Journey</h1>
        <p className="muted" style={{ maxWidth: 720, margin: 0 }}>Tu recorrido como cliente, desde conocer AET hasta la adopción piloto. Comienza antes de que exista un profesional seleccionado.</p>
      </div>
      {picker}
      {!confirmed && (
        <Callout title="Completa tu onboarding de cliente">
          <Link href="/client/onboarding">Ir al onboarding</Link>
        </Callout>
      )}

      <h2>Mis profesionales</h2>
      <p className="muted">Aquí ves el estado de postulación y el avance de cada profesional.</p>
      <div className="table-wrap" tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th>Profesional</th>
              <th>Rol</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {myNoms.map((n) => (
              <tr key={n.id}>
                <td>{n.nomineeName}</td>
                <td>{n.role}</td>
                <td>
                  <Badge>{n.status === "INVITED" ? CLIENT_VISIBLE_LABEL.INVITADO : CLIENT_VISIBLE_LABEL.NOMINADO}</Badge>
                </td>
              </tr>
            ))}
            {myApps.map((a) => {
              const v = toClientVisible(a.applicationStatus);
              return (
                <tr key={a.id}>
                  <td>{a.participantName}</td>
                  <td>{a.role}</td>
                  <td>
                    <Badge tone={v === "AVANZA" || v === "INSCRITO" ? "ok" : v === "RESCATE" ? "warn" : undefined}>{CLIENT_VISIBLE_LABEL[v]}</Badge>
                  </td>
                </tr>
              );
            })}
            {myNoms.length + myApps.length === 0 && (
              <tr>
                <td colSpan={3} className="muted">
                  Aún no hay profesionales. <Link href="/client/nominate">Nominar</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2>Fases</h2>
      {CLIENT_PHASES.map((p) => (
        <div key={p.n} className="card" style={p.n === client.clientPhase ? { borderColor: "var(--brand)", boxShadow: "0 0 0 2px var(--brand-soft)" } : undefined}>
          <div className="spread">
            <h3 style={{ margin: 0 }}>
              Fase {p.n} · {p.name}
            </h3>
            {p.n === client.clientPhase && <Badge tone="brand">Estamos aquí</Badge>}
            {p.n < client.clientPhase && <Badge tone="ok">Completada</Badge>}
          </div>
          {p.notice && (
            <div style={{ marginTop: 8 }}>
              <Callout tone="warn" title={p.notice} />
            </div>
          )}
          <div className="grid grid-3" style={{ marginTop: 10 }}>
            <Field t="Qué ocurre" v={p.whatHappens} />
            <Field t="Qué puedes esperar" v={p.canExpect} />
            <Field t="Qué necesitamos de ti" v={p.weNeed} />
            <Field t="Qué recibirás" v={p.willReceive} />
            <Field t="Cuándo te volveremos a contactar" v={p.nextContact} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Field({ t, v }: { t: string; v: string }) {
  return (
    <div>
      <div className="eyebrow">{t}</div>
      <p style={{ margin: 0 }} className={v.includes("PENDIENTE") ? "pending-def" : undefined}>{v}</p>
    </div>
  );
}

export function ClientOnboarding() {
  const { state, run } = useStore();
  const { wave, client, picker } = useClientScope();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!client) return null;
  const key = `${wave.id}:${client.id}`;
  const confirmed = state.clientOnboarding[key];
  return (
    <div className="stack narrow">
      <h1>Onboarding del cliente</h1>
      {picker}
      <RoleNotice allowed={["CLIENT"]} />
      <div className="card">
        <FaqList items={CLIENT_ONBOARDING_QA} />
      </div>
      {confirmed ? (
        <Callout tone="ok" title="Confirmación registrada">
          {client.name} confirmó las condiciones operativas el {fmtDate(confirmed)}.
        </Callout>
      ) : (
        <div className="card">
          <label className="check">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <span>Entiendo las condiciones operativas de participación de mis profesionales</span>
          </label>
          <p className="muted">
            <small>Esto NO constituye contrato; es una confirmación operacional.</small>
          </p>
          {error && <p className="error">{error}</p>}
          <button className="btn" disabled={!checked} onClick={() => setError(run((s) => confirmClientOnboarding(s, wave.id, client.id)))}>
            Confirmar
          </button>
        </div>
      )}
    </div>
  );
}

export function ClientNominate() {
  const { state, run } = useStore();
  const { wave, client, picker } = useClientScope();
  const empty = { nomineeName: "", nomineeEmail: "", role: "", team: "", reason: "", applicationOpportunity: "", estimatedAvailability: "" };
  const [f, setF] = useState(empty);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  if (!client) return null;
  const gate = nominationsOpen(wave, state.readiness[wave.id] ?? { items: {} }, new Date().toISOString());
  const mine = state.nominations.filter((n) => n.waveId === wave.id && n.clientId === client.id);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="stack narrow">
      <h1>Nominar profesionales</h1>
      {picker}
      <Callout tone="warn" title="Nominar no significa seleccionar.">
        Delivery revisa cada caso. Si corresponde, la persona recibe una invitación personal y decide si postula. Tú no completas el Assessment por ella.
      </Callout>
      <RoleNotice allowed={["CLIENT", "DELIVERY"]} />
      {!gate.open ? (
        <Callout tone="bad" title="Nominaciones no disponibles">{gate.reason}</Callout>
      ) : (
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            const err = run((s) => createNomination(s, { ...f, team: f.team || undefined, waveId: wave.id, clientId: client.id }));
            if (err) return setMsg({ ok: false, text: err });
            setF(empty);
            setMsg({ ok: true, text: "Nominación registrada. Delivery revisará el caso." });
          }}
        >
          <div className="grid grid-2">
            <div className="field"><label htmlFor="nn">Nombre *</label><input id="nn" type="text" required value={f.nomineeName} onChange={set("nomineeName")} /></div>
            <div className="field"><label htmlFor="ne">Correo electrónico *</label><input id="ne" type="email" required value={f.nomineeEmail} onChange={set("nomineeEmail")} /></div>
            <div className="field"><label htmlFor="nr">Rol *</label><input id="nr" type="text" required value={f.role} onChange={set("role")} /></div>
            <div className="field"><label htmlFor="nt">Unidad / equipo</label><input id="nt" type="text" value={f.team} onChange={set("team")} /></div>
          </div>
          <div className="field"><label htmlFor="nm">Motivo de nominación *</label><textarea id="nm" required value={f.reason} onChange={set("reason")} /></div>
          <div className="field"><label htmlFor="no">Oportunidad de aplicación *</label><textarea id="no" required value={f.applicationOpportunity} onChange={set("applicationOpportunity")} /></div>
          <div className="field">
            <label htmlFor="na">Disponibilidad estimada *</label>
            <input id="na" type="text" required value={f.estimatedAvailability} onChange={set("estimatedAvailability")} placeholder="p.ej. 2–3 h/semana según etapa" />
          </div>
          {msg && <p className={msg.ok ? "" : "error"} role="status">{msg.text}</p>}
          <button className="btn" type="submit">Proponer candidato/a</button>
        </form>
      )}
      <h2>Mis nominaciones</h2>
      <div className="table-wrap" tabIndex={0}>
        <table>
          <thead><tr><th>Nombre</th><th>Rol</th><th>Estado</th></tr></thead>
          <tbody>
            {mine.map((n) => (
              <tr key={n.id}>
                <td>{n.nomineeName}</td>
                <td>{n.role}</td>
                <td><Badge tone={n.status === "INVITED" ? "ok" : undefined}>{{ NOMINATED: "Nominado/a", UNDER_REVIEW: "En revisión Delivery", INVITED: "Invitado/a a postular", DISCARDED: "No continúa" }[n.status]}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
