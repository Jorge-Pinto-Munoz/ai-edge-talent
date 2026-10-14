import Link from "next/link";
import { redirect } from "next/navigation";
import { requireStaffPage } from "@/lib/admission/auth";
import { aiConfigured } from "@/lib/ai/client";

export const metadata = { title: "Guía de accesos · Portal AET" };
export const dynamic = "force-dynamic";

/** Cómo obtiene su cuenta cada perfil. Refleja el comportamiento real del ingreso (lib/identity). */
const ROLES: { perfil: string; crea: string; pasos: string; llega: string }[] = [
  { perfil: "Administración (Líder de producto)", crea: "La cuenta principal ya existe y está protegida: no se puede degradar, pausar ni eliminar. Otras cuentas admin las creas tú.", pasos: "Ingresar → correo → código de 6 dígitos.", llega: "Portal de administración completo." },
  { perfil: "Delivery", crea: "Nadie: los correos de Delivery cargados para la Wave reciben el rol solos en su primer ingreso. Para uno nuevo: Crear usuario con rol Delivery y su Wave.", pasos: "Ingresar → correo → código.", llega: "Equipo: sus postulantes y profesionales." },
  { perfil: "AI Coach", crea: "Tú, en Usuarios y accesos → Crear usuario, rol AI Coach.", pasos: "Le llega una invitación; ingresa con su correo y el código. Hasta su primer ingreso la cuenta queda pendiente y sin permisos.", llega: "Panel de AI Coach." },
  { perfil: "Líder del Hub AI", crea: "Tú, en Crear usuario, rol Líder Hub AI. Luego súmalo a su Wave en Journey → AI Lab & Showcase (equipo del Hub, al final).", pasos: "Igual que AI Coach.", llega: "AI Lab & Showcase de sus Waves." },
  { perfil: "Business Partner", crea: "Tú lo creas, o la persona lo pide en Crear cuenta y tú apruebas en Usuarios y accesos → Solicitudes.", pasos: "Si pidió cuenta, recibe un correo al aprobarse y desde ahí ingresa.", llega: "Equipo." },
  { perfil: "Profesional que postula", crea: "Se crea sola al registrarse en la postulación.", pasos: "Registro → verifica su correo con el código → Assessment (se guarda solo) → enviar.", llega: "Su postulación y luego Mi journey." },
  { perfil: "Profesional que vuelve tiempo después", crea: "Ya existe desde que postuló. Si postuló antes de las cuentas y nunca entró, se crea en su primer ingreso.", pasos: "Ingresar o \"Continuar aquí\" → correo → código.", llega: "Donde quedó: sigue con sus respuestas o ve el estado. No puede enviar dos veces." },
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  { q: "¿Qué pasa si escribe un correo que el sistema no conoce?", a: "No recibe código ni se crea cuenta, y la pantalla responde lo mismo que a un correo conocido, para no revelar quién está registrado. Si es alguien del equipo, créale la cuenta." },
  { q: "¿Alguien puede darse un rol interno solo?", a: "No. Delivery, AI Coach, Hub AI y administración los asigna solo administración. Lo impiden la pantalla, el servidor y la base de datos: una cuenta interna creada por otra vía queda pendiente y sin permisos." },
  { q: "No le llega el código", a: "Que revise spam o la cuarentena del correo corporativo. El código vence en 10 minutos y sirve una vez; se puede pedir otro cada 45 segundos (máximo 5 cada 15 minutos). Desde su ficha en Usuarios y accesos puedes usar \"Reenviar acceso\"." },
  { q: "¿Cómo quito el acceso a alguien?", a: "En su ficha de Usuarios y accesos: Pausar (temporal), Revocar acceso o Dar de baja. \"Cerrar sesiones\" lo saca de todos sus dispositivos. Siempre debe quedar al menos una cuenta admin activa." },
  { q: "¿Cómo cambio el rol de una persona?", a: "En su ficha, elige el rol y \"Aplicar rol\". Sus sesiones abiertas se cierran para que el cambio rija de inmediato." },
  { q: "Un profesional quiere partir de cero", a: <>En <Link href="/admin/admision">Admisión</Link>, menú &quot;···&quot; de su fila → Eliminar. Se borran su postulación, correos y códigos, y puede postular de nuevo. No se puede con personas ya inscritas.</> },
  { q: "¿Qué pasó con el rol Profesor?", a: "Se eliminó. Las cuentas que lo tenían quedaron como Profesional; las clases las gestionan administración y Delivery en Journey (Clases y asistencia)." },
];

const CLAUDE_STEPS = [
  "En console.anthropic.com → Billing, revisa que haya medio de pago o créditos.",
  "En API Keys → Create Key, crea una clave sin vencimiento (o anota cuándo vence). Si aparece la ventana de “federación de identidades”, elige “Continuar con una clave de API”: el portal corre en Vercel.",
  "Cópiala en el momento: se muestra una sola vez. No la envíes por chat ni correo.",
  "En Vercel → Settings → Environment Variables: nombre ANTHROPIC_API_KEY, entorno Production, marcada como Sensitive. Luego Redeploy.",
  "Si la llave no pertenece a un workspace (error “not scoped to a workspace”): crea la llave dentro de un workspace en Console → Workspaces, o agrega ANTHROPIC_WORKSPACE_ID (empieza con wrkspc_) en Vercel y haz Redeploy.",
  "En Journey → Assessment → Criterios de evaluación, toca “Probar conexión”. Si falla, el mensaje dice la causa (clave inválida, sin créditos, límite o servicio saturado).",
  "Con la clave activa, cada postulación enviada se evalúa sola. Las anteriores: Admisión → seleccionar → “Evaluar con IA”.",
];

export default async function GuiaAccesos() {
  const viewer = await requireStaffPage("/admin/guia");
  if (viewer.role !== "admin") redirect("/sin-acceso");
  const ai = aiConfigured();

  return (
    <div className="adm">
      <header className="adm-head">
        <div>
          <div className="eyebrow">Preguntas frecuentes · Administración</div>
          <h1>Guía de accesos</h1>
          <p className="muted" style={{ maxWidth: 760 }}>
            Cómo obtiene su cuenta cada perfil. Todos ingresan igual: escriben su correo y un <strong>código de 6 dígitos</strong> que llega por correo. No hay contraseñas ni PIN.
            Las preguntas para profesionales y Business Partners están en <Link href="/ayuda">Ayuda</Link>.
          </p>
        </div>
      </header>

      <section className="adm-card">
        <div className="adm-card-head"><h2>Cada perfil</h2><span className="muted">Quién crea la cuenta y dónde llega</span></div>
        <div className="table-wrap" tabIndex={0}>
          <table>
            <thead><tr><th>Perfil</th><th>Quién crea la cuenta</th><th>Qué hace la persona</th><th>Dónde llega</th></tr></thead>
            <tbody>
              {ROLES.map((r) => (
                <tr key={r.perfil}>
                  <td><strong>{r.perfil}</strong></td>
                  <td>{r.crea}</td>
                  <td>{r.pasos}</td>
                  <td>{r.llega}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: 12, marginBottom: 0 }}>
          <small>Las cuentas se crean en <Link href="/admin/usuarios">Usuarios y accesos</Link>; el Delivery de cada Wave, en Equipo de la Wave.</small>
        </p>
      </section>

      <section className="adm-card">
        <div className="adm-card-head"><h2>Preguntas frecuentes</h2></div>
        <div className="guide-faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="adm-card">
        <div className="adm-card-head">
          <h2>Conectar el análisis con IA (Claude)</h2>
          <span className={ai ? "adm-tag ok" : "adm-tag"}>{ai ? "Clave cargada en el servidor" : "Sin clave en el servidor"}</span>
        </div>
        <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 6 }}>
          {CLAUDE_STEPS.map((s) => <li key={s}>{s}</li>)}
        </ol>
        <p className="muted" style={{ marginBottom: 0 }}>
          <small>Si la clave vence, la evaluación automática se detiene y las postulaciones quedan para revisión humana: crea una nueva antes y reemplázala en Vercel. <Link href="/admin/evaluacion">Ir a los criterios de evaluación</Link>.</small>
        </p>
      </section>
    </div>
  );
}
