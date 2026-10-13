"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  changeRole, closeSessions, createUser, forcePinChange, resendInvite, resetPin, setAccountStatus, setDeliveryWaves, unlockAccount, updateUser, userHistory, type AdminResult,
} from "@/lib/identity/admin-actions";
import { Icon } from "@/components/site/Icon";
import { Sheet } from "@/components/site/Sheet";

export interface UserRow {
  id: string; name: string; email: string; role: string; status: string; phone: string | null;
  waves: { id: string; name: string }[]; client: string | null;
  pin: "PENDING" | "SET" | "RENEW" | "LOCKED"; pinLabel: string; pinSetAt: string | null; lockedUntil: string | null;
  tempCode: { purpose: string; expiresAt: string } | null; lastAccess: string | null; createdAt: string;
}
type Wave = { id: string; name: string; status: string };

export const ROLE_LABEL: Record<string, string> = { kiber: "Profesional", delivery: "Delivery", admin: "Admin", client: "Cliente", mentor: "AI Coach", profesor: "Profesor", hub: "Líder Hub AI" };
const STATUS_LABEL: Record<string, string> = { ACTIVE: "Activo", PENDING: "Pendiente", PAUSED: "Pausado", REVOKED: "Revocado", DELETED: "Dado de baja" };
const STATUS_KIND: Record<string, string> = { ACTIVE: "done", PENDING: "pending", PAUSED: "attention", REVOKED: "blocked", DELETED: "blocked" };
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("es-CL", { timeZone: "America/Santiago", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");

export function UserStatusBadge({ status }: { status: string }) {
  return <span className={`ds-status s-${STATUS_KIND[status] ?? "pending"}`}>{STATUS_LABEL[status] ?? status}</span>;
}

/** Tabla de usuarios con búsqueda y filtros, ficha con acciones y alta de cuentas. */
export function UsersConsole({ rows, waves, myId }: { rows: UserRow[]; waves: Wave[]; myId: string }) {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [wave, setWave] = useState("");
  const [client, setClient] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);
  const clients = [...new Set(rows.map((r) => r.client).filter(Boolean))] as string[];

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return rows.filter((r) => (!t || r.name.toLowerCase().includes(t) || r.email.includes(t)) && (!role || r.role === role) && (!wave || r.waves.some((w) => w.id === wave)) && (!client || r.client === client) && (!status || r.status === status));
  }, [rows, q, role, wave, client, status]);

  return (
    <div className="stack">
      <div className="uc-bar">
        <label className="help-search uc-search"><Icon name="search" size={18} /><span className="sr-only">Buscar por nombre o correo</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o correo" /></label>
        <select aria-label="Perfil" value={role} onChange={(e) => setRole(e.target.value)}><option value="">Todos los perfiles</option>{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select aria-label="Wave" value={wave} onChange={(e) => setWave(e.target.value)}><option value="">Todas las Waves</option>{waves.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select>
        <select aria-label="Cliente" value={client} onChange={(e) => setClient(e.target.value)}><option value="">Todos los clientes</option>{clients.map((c) => <option key={c}>{c}</option>)}</select>
        <select aria-label="Estado" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos los estados</option>{Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <button type="button" className="btn" onClick={() => setCreating(true)}><Icon name="plus" size={18} /> Crear usuario</button>
      </div>
      <p className="muted" style={{ margin: 0 }} aria-live="polite">{list.length} de {rows.length} cuentas</p>
      <div className="table-wrap" tabIndex={0}>
        <table className="rtable uc-table">
          <thead><tr><th>Usuario</th><th>Perfil</th><th>Wave</th><th>Cliente</th><th>Estado</th><th>Código</th><th>Último acceso</th><th><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td className="rt-title"><strong>{r.name || "Sin nombre"}</strong><br /><small className="muted">{r.email}</small></td>
                <td data-label="Perfil">{ROLE_LABEL[r.role] ?? r.role}</td>
                <td data-label="Wave">{r.waves.map((w) => w.name).join(", ") || "—"}</td>
                <td data-label="Cliente">{r.client ?? "—"}</td>
                <td data-label="Estado"><UserStatusBadge status={r.status} /></td>
                <td data-label="Código"><span className={`uc-pin p-${r.pin.toLowerCase()}`}>{r.pinLabel}</span>{r.tempCode && <><br /><small className="muted">Código temporal vigente</small></>}</td>
                <td data-label="Último acceso">{fmt(r.lastAccess)}</td>
                <td><button type="button" className="btn small ghost" onClick={() => setOpen(r)} aria-haspopup="dialog">Gestionar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Sheet open={open !== null} onClose={() => setOpen(null)} eyebrow={open ? ROLE_LABEL[open.role] : undefined} title={open?.name || open?.email || ""}>
        {open && <UserDrawer key={open.id} u={open} waves={waves} isMe={open.id === myId} onClose={() => setOpen(null)} />}
      </Sheet>
      <Sheet open={creating} onClose={() => setCreating(false)} eyebrow="Usuarios y accesos" title="Crear usuario">
        {creating && <CreateUser waves={waves} onDone={() => setCreating(false)} />}
      </Sheet>
    </div>
  );
}

function useAction() {
  const router = useRouter();
  const [res, setRes] = useState<AdminResult | null>(null);
  const [pending, start] = useTransition();
  const run = (f: () => Promise<AdminResult>) => start(async () => { const r = await f(); setRes(r); if (r.ok) router.refresh(); });
  const out = res && (
    <div className={res.ok ? "uc-ok" : "error"} role={res.ok ? "status" : "alert"}>
      {res.message}
      {res.devCode && <><br /><small>Desarrollo: código temporal <strong>{res.devCode}</strong> (en producción llega por correo).</small></>}
    </div>
  );
  return { run, pending, out };
}

function UserDrawer({ u, waves, isMe, onClose }: { u: UserRow; waves: Wave[]; isMe: boolean; onClose: () => void }) {
  const { run, pending, out } = useAction();
  const [name, setName] = useState(u.name);
  const [phone, setPhone] = useState(u.phone?.replace("+569", "") ?? "");
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const [newRole, setNewRole] = useState(u.role);
  const [dWaves, setDWaves] = useState<string[]>(u.waves.map((w) => w.id));
  const [hist, setHist] = useState<Awaited<ReturnType<typeof userHistory>> | null>(null);
  const [histPending, startHist] = useTransition();
  const blocked = u.status === "PAUSED" || u.status === "REVOKED" || u.status === "DELETED";

  return (
    <div className="ud">
      <div className="ud-head">
        <UserStatusBadge status={u.status} />
        <span className={`uc-pin p-${u.pin.toLowerCase()}`}>Código: {u.pinLabel}</span>
        <small className="muted">{u.email}{u.lastAccess ? ` · último acceso ${fmt(u.lastAccess)}` : " · nunca ha ingresado"}</small>
      </div>
      {out}

      <section className="ud-sec">
        <h3>Datos</h3>
        <div className="field"><label htmlFor="ud-n">Nombre completo</label><input id="ud-n" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="field"><label htmlFor="ud-p">Teléfono</label><div className="phone-cl"><span aria-hidden="true">+56 9</span><input id="ud-p" inputMode="numeric" maxLength={9} value={phone} onChange={(e) => setPhone(e.target.value)} /></div></div>
        <button type="button" className="btn small secondary" disabled={pending} onClick={() => run(() => updateUser(u.id, { fullName: name, phone }))}>Guardar datos</button>
      </section>

      <section className="ud-sec">
        <h3>Código de acceso</h3>
        <dl className="ud-dl">
          <div><dt>Código personal</dt><dd>{u.pinLabel}{u.pinSetAt ? ` · actualizado ${fmt(u.pinSetAt)}` : ""}</dd></div>
          <div><dt>Código temporal</dt><dd>{u.tempCode ? `${u.tempCode.purpose === "RESET" ? "Restablecimiento" : "Activación"} vigente hasta ${fmt(u.tempCode.expiresAt)}` : "Ninguno vigente"}</dd></div>
          {u.lockedUntil && <div><dt>Bloqueo de seguridad</dt><dd>Hasta {fmt(u.lockedUntil)} (intentos fallidos)</dd></div>}
        </dl>
        <p className="muted ud-note">Nunca verás el código personal: solo puedes invalidarlo y enviar uno temporal.</p>
        <div className="ud-actions">
          <button type="button" className="btn small" disabled={pending || blocked} onClick={() => run(() => resendInvite(u.id))}>{u.pin === "PENDING" ? "Reenviar invitación" : "Enviar código temporal"}</button>
          <button type="button" className="btn small ghost" disabled={pending || blocked} onClick={() => confirmAndRun("¿Invalidar su código personal y enviarle uno temporal?", () => run(() => resetPin(u.id)))}>Restablecer código</button>
          <button type="button" className="btn small ghost" disabled={pending || blocked || u.pin === "PENDING"} onClick={() => run(() => forcePinChange(u.id))}>Forzar cambio en el próximo ingreso</button>
          {u.lockedUntil && <button type="button" className="btn small ghost" disabled={pending} onClick={() => run(() => unlockAccount(u.id))}>Quitar bloqueo</button>}
          <button type="button" className="btn small ghost" disabled={pending} onClick={() => confirmAndRun("¿Cerrar sus sesiones en todos los dispositivos?", () => run(() => closeSessions(u.id)))}>Cerrar sesiones</button>
        </div>
      </section>

      {u.role === "delivery" && (
        <section className="ud-sec">
          <h3>Waves de este Delivery</h3>
          <div className="ud-checks">{waves.map((w) => (
            <label key={w.id}><input type="checkbox" checked={dWaves.includes(w.id)} onChange={(e) => setDWaves((x) => (e.target.checked ? [...x, w.id] : x.filter((y) => y !== w.id)))} /> {w.name}</label>
          ))}</div>
          <button type="button" className="btn small secondary" disabled={pending} onClick={() => run(() => setDeliveryWaves(u.id, dWaves))}>Guardar Waves</button>
          <p className="muted ud-note">La asignación de profesionales se hace en cada Wave, en “Equipo y asignaciones”.</p>
        </section>
      )}

      {!isMe && (
        <section className="ud-sec">
          <h3>Estado de la cuenta</h3>
          <div className="field"><label htmlFor="ud-r">Motivo (queda en el historial)</label><input id="ud-r" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: pausa solicitada por el cliente" /></div>
          <div className="ud-actions">
            {u.status !== "ACTIVE" && <button type="button" className="btn small" disabled={pending} onClick={() => run(() => setAccountStatus(u.id, "ACTIVE", reason || "Reactivación"))}>{u.status === "PENDING" ? "Activar" : "Reactivar"}</button>}
            {u.status === "ACTIVE" || u.status === "PENDING" ? <button type="button" className="btn small ghost" disabled={pending} onClick={() => run(() => setAccountStatus(u.id, "PAUSED", reason))}>Pausar</button> : null}
          </div>
          <details className="ud-danger">
            <summary>Revocar, eliminar o cambiar rol</summary>
            <div className="field"><label htmlFor="ud-c">Escribe {u.email} para confirmar</label><input id="ud-c" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" /></div>
            <div className="ud-actions">
              <button type="button" className="btn small danger" disabled={pending || u.status === "REVOKED"} onClick={() => run(() => setAccountStatus(u.id, "REVOKED", reason, confirm))}>Revocar acceso</button>
              <button type="button" className="btn small danger" disabled={pending || u.status === "DELETED"} onClick={() => run(() => setAccountStatus(u.id, "DELETED", reason, confirm))}>Dar de baja</button>
            </div>
            <div className="field" style={{ marginTop: 12 }}><label htmlFor="ud-role">Cambiar rol</label>
              <select id="ud-role" value={newRole} onChange={(e) => setNewRole(e.target.value)}>{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
            </div>
            <button type="button" className="btn small secondary" disabled={pending || newRole === u.role} onClick={() => run(() => changeRole(u.id, newRole as never, confirm))}>Aplicar rol</button>
            <p className="muted ud-note">Dar de baja conserva el historial según la política de retención; la persona deja de poder ingresar.</p>
          </details>
        </section>
      )}

      <section className="ud-sec">
        <h3>Historial</h3>
        {!hist ? (
          <button type="button" className="btn small ghost" disabled={histPending} onClick={() => startHist(async () => setHist(await userHistory(u.id)))}>{histPending ? "Cargando…" : "Ver historial"}</button>
        ) : (
          <>
            {hist.events.length === 0 ? <p className="muted">Sin eventos registrados.</p> : (
              <ol className="ud-hist">{hist.events.map((e, i) => <li key={i}><strong>{e.action}</strong> <small className="muted">· {fmt(e.at)}{e.actor_email ? ` · ${e.actor_email}` : ""}</small></li>)}</ol>
            )}
            {hist.emails.length > 0 && (<>
              <h4>Correos</h4>
              <ol className="ud-hist">{hist.emails.map((m, i) => <li key={i}>{m.subject} <small className={m.status === "failed" ? "error" : "muted"}>· {m.status === "sent" ? "enviado al proveedor" : m.status === "failed" ? `falló: ${m.error ?? ""}` : "en cola"} · {fmt(m.created_at)}</small></li>)}</ol>
            </>)}
          </>
        )}
      </section>
      <button type="button" className="btn ghost small" onClick={onClose}>Cerrar</button>
    </div>
  );
}

function confirmAndRun(text: string, f: () => void) {
  if (window.confirm(text)) f();
}

function CreateUser({ waves, onDone }: { waves: Wave[]; onDone: () => void }) {
  const { run, pending, out } = useAction();
  const [f, setF] = useState({ kind: "kiber" as "kiber" | "delivery", fullName: "", email: "", phone: "", clientName: "", roleTitle: "" });
  const [ws, setWs] = useState<string[]>([]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const open = waves.filter((w) => w.status !== "CLOSED");
  return (
    <form className="ud" onSubmit={(e) => { e.preventDefault(); run(() => createUser({ ...f, waveIds: ws })); }}>
      <div className="ds-seg uc-kind" role="radiogroup" aria-label="Perfil">
        {(["kiber", "delivery"] as const).map((k) => <button key={k} type="button" role="radio" aria-checked={f.kind === k} className={f.kind === k ? "on" : ""} onClick={() => { setF((x) => ({ ...x, kind: k })); setWs([]); }}>{k === "kiber" ? "Profesional" : "Delivery"}</button>)}
      </div>
      <div className="field"><label htmlFor="cu-n">Nombre completo</label><input id="cu-n" required value={f.fullName} onChange={set("fullName")} /></div>
      <div className="field"><label htmlFor="cu-e">Correo electrónico</label><input id="cu-e" type="email" required value={f.email} onChange={set("email")} />
        <small className="muted">{f.kind === "delivery" ? "Correo corporativo de Kibernum: crear la cuenta es la autorización explícita de Administración." : "Cualquier dominio válido."}</small></div>
      <div className="field"><label htmlFor="cu-p">Teléfono</label><div className="phone-cl"><span aria-hidden="true">+56 9</span><input id="cu-p" inputMode="numeric" maxLength={9} value={f.phone} onChange={set("phone")} /></div></div>
      {f.kind === "kiber" ? (
        <>
          <div className="field"><label htmlFor="cu-w">Wave</label><select id="cu-w" value={ws[0] ?? ""} onChange={(e) => setWs(e.target.value ? [e.target.value] : [])}><option value="">Sin Wave por ahora</option>{open.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
          <div className="field"><label htmlFor="cu-c">Cliente</label><input id="cu-c" value={f.clientName} onChange={set("clientName")} /></div>
          <div className="field"><label htmlFor="cu-r">Rol / cargo</label><input id="cu-r" value={f.roleTitle} onChange={set("roleTitle")} /></div>
          <p className="muted ud-note">Crear la cuenta no aprueba evaluaciones ni salta etapas: en la Wave queda invitado/a a postular, o se vincula a su postulación si ya existe.</p>
        </>
      ) : (
        <fieldset className="ud-checks"><legend>Waves que acompaña</legend>{open.map((w) => <label key={w.id}><input type="checkbox" checked={ws.includes(w.id)} onChange={(e) => setWs((x) => (e.target.checked ? [...x, w.id] : x.filter((y) => y !== w.id)))} /> {w.name}</label>)}</fieldset>
      )}
      {out}
      <div className="ud-actions">
        <button className="btn" disabled={pending}>{pending ? "Creando…" : "Crear y enviar acceso"}</button>
        <button type="button" className="btn ghost" onClick={onDone}>Cerrar</button>
      </div>
    </form>
  );
}
