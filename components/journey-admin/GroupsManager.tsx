"use client";

import { useState, useTransition } from "react";
import { addGroupMentor, createGroup, removeGroupMentor, setGroupMembers } from "@/lib/journey/actions";
import { Callout } from "@/components/ui";

interface Group { id: string; name: string; group_members: { candidate_id: string }[]; group_mentors: { mentor_id: string; profiles: { email: string; full_name: string | null } }[] }

export function GroupsManager({ waveId, groups, people, isAdmin }: { waveId: string; groups: Group[]; people: { id: string; name: string; specialty: string | null }[]; isAdmin: boolean }) {
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const assigned = new Set(groups.flatMap((g) => g.group_members.map((m) => m.candidate_id)));
  return (
    <div className="stack">
      <p className="muted">Cada grupo tiene uno o más AI Coaches que entregan feedback semanal desde Role Enablement (certificación y acompañamiento).</p>
      {isAdmin && (
        <form className="row" onSubmit={(e) => { e.preventDefault(); start(async () => { setMsg(await createGroup(waveId, name)); setName(""); }); }}>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del grupo (p.ej. QA · Grupo 1)" style={{ maxWidth: 320 }} />
          <button className="btn small" disabled={pending}>Crear grupo</button>
        </form>
      )}
      {msg && <Callout tone={msg.ok ? "ok" : "warn"} title={msg.message} />}
      {people.length > 0 && <p className="muted"><small>{people.length - assigned.size} persona(s) inscrita(s) sin grupo.</small></p>}
      {groups.map((g) => <GroupCard key={g.id} waveId={waveId} g={g} people={people} isAdmin={isAdmin} onMsg={setMsg} />)}
    </div>
  );
}

function GroupCard({ waveId, g, people, isAdmin, onMsg }: { waveId: string; g: Group; people: { id: string; name: string; specialty: string | null }[]; isAdmin: boolean; onMsg: (m: { ok: boolean; message: string }) => void }) {
  const [members, setMembers] = useState<string[]>(g.group_members.map((m) => m.candidate_id));
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>{g.name}</h3>
      <div className="grid grid-2">
        <div>
          <div className="eyebrow">AI Coaches</div>
          <ul>
            {g.group_mentors.map((m) => (
              <li key={m.mentor_id}>
                {m.profiles.full_name ?? m.profiles.email} <small className="muted">{m.profiles.email}</small>
                {isAdmin && <button className="btn ghost small" style={{ marginLeft: 8 }} disabled={pending} onClick={() => start(async () => onMsg(await removeGroupMentor(waveId, g.id, m.mentor_id)))}>Quitar</button>}
              </li>
            ))}
            {g.group_mentors.length === 0 && <li className="muted">Sin AI Coach asignado</li>}
          </ul>
          {isAdmin && (
            <form className="row" onSubmit={(e) => { e.preventDefault(); start(async () => { onMsg(await addGroupMentor(waveId, g.id, email)); setEmail(""); }); }}>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo del AI Coach" style={{ maxWidth: 260 }} />
              <button className="btn small" disabled={pending}>Asignar</button>
            </form>
          )}
        </div>
        <div>
          <div className="eyebrow">Personas del grupo ({members.length})</div>
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {people.map((p) => (
              <label key={p.id} className="check" style={{ padding: "6px 10px", marginBottom: 4 }}>
                <input type="checkbox" disabled={!isAdmin} checked={members.includes(p.id)} onChange={(e) => setMembers((m) => (e.target.checked ? [...m, p.id] : m.filter((x) => x !== p.id)))} />
                <span>{p.name} {p.specialty && <small className="muted">· {p.specialty}</small>}</span>
              </label>
            ))}
          </div>
          {isAdmin && <button className="btn small" style={{ marginTop: 8 }} disabled={pending} onClick={() => start(async () => onMsg(await setGroupMembers(waveId, g.id, members)))}>Guardar integrantes</button>}
        </div>
      </div>
    </div>
  );
}
