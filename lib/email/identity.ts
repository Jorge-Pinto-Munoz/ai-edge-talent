/**
 * Plantillas de correo de identidad, journey y operación. Texto + HTML simple con la marca.
 * Cada plantilla devuelve asunto, texto y HTML; el envío y su registro los hace lib/identity/service.ts.
 */
export type IdentityTemplate =
  | "ACTIVATION" | "ACCOUNT_INVITE" | "DELIVERY_INVITE" | "PIN_RESET" | "ADMIN_STEP" | "ACCESS_UPDATED"
  | "PULSE_REMINDER" | "DELIVERY_PULSE_ALERT" | "ACCESS_REQUEST_ADMIN" | "ACCESS_REQUEST_APPROVED" | "ACCESS_REQUEST_REJECTED" | "APPLICATION_RECEIVED" | "DELIVERY_APPLICATION_SUBMITTED" | "LOGIN_CODE" | "CANDIDATE_ACCESS"
  | "SELECTED_WELCOME" | "RESCUE_INVITE" | "RESCUE_SUBMITTED_ADMIN" | "STAGE_OPEN";

export const TEMPLATE_NAME: Record<IdentityTemplate, string> = {
  ACTIVATION: "Activación del portal",
  ACCOUNT_INVITE: "Invitación a la plataforma",
  DELIVERY_INVITE: "Invitación Delivery",
  PIN_RESET: "Restablecer código",
  ADMIN_STEP: "Verificación de administración",
  ACCESS_UPDATED: "Acceso habilitado",
  PULSE_REMINDER: "Recordatorio de pulso",
  APPLICATION_RECEIVED: "Postulación recibida",
  DELIVERY_APPLICATION_SUBMITTED: "Aviso a Delivery: postulación enviada",
  LOGIN_CODE: "Código de ingreso",
  CANDIDATE_ACCESS: "Acceso a la postulación",
  DELIVERY_PULSE_ALERT: "Alerta a Delivery",
  ACCESS_REQUEST_ADMIN: "Solicitud de acceso especial",
  ACCESS_REQUEST_APPROVED: "Solicitud aprobada",
  ACCESS_REQUEST_REJECTED: "Solicitud no aprobada",
  SELECTED_WELCOME: "Bienvenida: seleccionado/a",
  RESCUE_INVITE: "Invitación al rescate",
  RESCUE_SUBMITTED_ADMIN: "Aviso: video de rescate recibido",
  STAGE_OPEN: "Primer reto disponible",
};

export interface Rendered { subject: string; text: string; html: string }
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function layout(title: string, paras: string[], opts: { code?: string; cta?: { label: string; href: string }; foot?: string }): string {
  // Banner de marca en HTML (sin imágenes: se ve aunque el cliente de correo las bloquee). Ancho 640 y responsive.
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light">
<style>@media (max-width:620px){.wrap{padding:0!important}.card{border-radius:0!important}.pad{padding:24px 20px!important}.hero{padding:32px 20px 28px!important}.hero h1{font-size:24px!important}.btn{display:block!important}}</style></head>
<body style="margin:0;background:#eef2f5;font-family:Arial,Helvetica,sans-serif;color:#141b23;-webkit-text-size-adjust:100%">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="wrap" align="center" style="padding:32px 16px">
<table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden">
<tr><td class="hero" style="background:#080b10;background-image:linear-gradient(135deg,#080b10 0%,#10303a 60%,#1e6e78 100%);padding:40px 40px 34px">
<p style="margin:0 0 18px;color:#3dc9d4;font-weight:bold;letter-spacing:3px;font-size:12px">KIBERNUM · AI EDGE TALENT</p>
<h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.2">${esc(title)}</h1>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px"><tr><td style="width:56px;height:4px;background:#3dc9d4;border-radius:4px;font-size:0;line-height:0">&nbsp;</td><td style="width:8px"></td><td style="width:20px;height:4px;background:#c765c0;border-radius:4px;font-size:0;line-height:0">&nbsp;</td></tr></table>
</td></tr>
<tr><td class="pad" style="padding:36px 40px 40px">
${paras.map((p) => (p.startsWith("# ") ? `<h2 style="margin:28px 0 10px;font-size:18px;color:#080b10">${esc(p.slice(2))}</h2>` : `<p style="margin:0 0 16px;font-size:16px;line-height:1.6">${esc(p)}</p>`)).join("")}
${opts.code ? `<p style="margin:24px 0;text-align:center"><span style="display:inline-block;padding:16px 24px;border-radius:14px;background:#e3f5f7;font-size:32px;font-weight:bold;letter-spacing:10px">${esc(opts.code)}</span></p>` : ""}
${opts.cta ? `<p style="margin:28px 0 8px;text-align:center"><a class="btn" href="${esc(opts.cta.href)}" style="display:inline-block;padding:16px 32px;border-radius:999px;background:#3dc9d4;color:#080b10;font-weight:bold;font-size:15px;text-decoration:none">${esc(opts.cta.label)}</a></p>` : ""}
${opts.foot ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:#4b5763">${esc(opts.foot)}</p>` : ""}
</td></tr>
<tr><td style="padding:20px 40px;background:#f6f8fa;border-top:1px solid #e3e8ec;font-size:12px;color:#4b5763">Kibernum · AI Edge Talent. Recibes este correo por tu participación en el programa.</td></tr>
</table></td></tr></table></body></html>`;
}

/** Texto plano: los subtítulos ("# …") pierden la marca. */
const plain = (p: string[]) => p.map((x) => (x.startsWith("# ") ? x.slice(2).toUpperCase() : x));

export function renderIdentity(t: IdentityTemplate, c: { name?: string; code?: string; link?: string; minutes?: number; stage?: string; extra?: string; when?: string; wave?: string; questions?: string[] }): Rendered {
  const hi = c.name ? `Hola ${c.name.split(" ")[0]}:` : "Hola:";
  switch (t) {
    case "SELECTED_WELCOME": {
      // `when`: fecha real de apertura del primer reto (si está programada). Sin fecha, no se promete un plazo.
      const p = [
        `Hola, ${c.name?.split(" ")[0] ?? ""}:`.replace(" :", ":"),
        "¡Tenemos buenas noticias!",
        "Después de revisar tu postulación y los resultados de tu Assessment, has sido seleccionado para participar en AI Edge Talent, el programa de Kibernum que busca habilitar profesionales para trabajar con inteligencia artificial y llevar sus capacidades a un nuevo nivel.",
        "# ¿Qué viene ahora?",
        "Ya puedes ingresar a la plataforma y conocer tu recorrido, las etapas del programa y los próximos pasos. Al entrar, confirma tu compromiso de participación: con eso quedas inscrito.",
        "Tu primera etapa será AI First Mindset, donde comenzarás a explorar cómo incorporar la inteligencia artificial a tu manera de pensar, resolver problemas y trabajar.",
        c.when ? `El primer reto estará disponible el ${c.when}, de acuerdo con la apertura programada para tu Wave.` : "Te avisaremos por correo apenas el primer reto esté disponible, según la apertura programada para tu Wave.",
        "Mientras tanto, te invitamos a ingresar y familiarizarte con el entorno. Ingresas con tu correo y un código de 6 dígitos que te enviamos en el momento: no necesitas contraseña.",
        ...(c.wave ? [`Tu Wave: ${c.wave}`] : []),
        "Te acompañaremos durante este recorrido.",
        "¡Bienvenido a AI Edge Talent!",
      ];
      return { subject: "¡Estás dentro! Tu camino en AI Edge Talent comienza aquí", text: [...plain(p), "", `Ingresa aquí: ${c.link}`, "", "Equipo AI Edge Talent", "Kibernum"].join("\n"), html: layout("¡Estás dentro!", p, { cta: { label: "INGRESAR A LA PLATAFORMA", href: c.link ?? "" }, foot: "Equipo AI Edge Talent · Kibernum" }) };
    }
    case "RESCUE_INVITE": {
      // `extra`: explicación individual revisada por Administración (desde la rúbrica). `when`: vencimiento real.
      const q = c.questions ?? [];
      const p = [
        `Hola, ${c.name?.split(" ")[0] ?? ""}:`.replace(" :", ":"),
        "Gracias por participar en el proceso de selección de AI Edge Talent.",
        "Revisamos tu Assessment y, en esta primera evaluación, tu resultado todavía no alcanza los criterios requeridos para avanzar directamente a la siguiente etapa.",
        ...(c.extra ? [c.extra] : []),
        "Sabemos que una evaluación puede mostrar solo una parte de las capacidades de una persona. Por eso queremos darte una oportunidad adicional para compartir tu motivación, tu manera de pensar y cómo enfrentarías los desafíos del programa.",
        "# Tu oportunidad de rescate",
        "Te invitamos a grabar un video de máximo 3 minutos respondiendo estas preguntas:",
        ...q.map((x, i) => `${i + 1}. ${x}`),
        `Tienes 24 horas para enviarlo, contadas desde la activación de esta oportunidad${c.when ? ` (hasta el ${c.when})` : ""}.`,
        "Puedes hacerlo directamente desde la plataforma: allí podrás grabarte con la cámara de tu computador o teléfono, subir un video o compartir un enlace.",
        "El video será revisado por el equipo del programa junto con los resultados de tu Assessment. Esta instancia complementa tu evaluación y nos permitirá tomar una decisión final.",
        "Gracias por el tiempo y el interés que has puesto en este proceso.",
      ];
      return { subject: "AI Edge Talent | Una nueva oportunidad para continuar tu postulación", text: [...plain(p), "", `Grabar o enviar mi video: ${c.link}`, "", "Equipo AI Edge Talent", "Kibernum"].join("\n"), html: layout("Una nueva oportunidad para continuar tu postulación", p, { cta: { label: "GRABAR O ENVIAR MI VIDEO", href: c.link ?? "" }, foot: "Equipo AI Edge Talent · Kibernum" }) };
    }
    case "RESCUE_SUBMITTED_ADMIN": {
      const p = [hi, `${c.extra ?? "Un candidato"} envió su video de rescate${c.wave ? ` (${c.wave})` : ""}. Está pendiente de tu revisión en Admisión.`];
      return { subject: `AI Edge Talent | Video de rescate recibido: ${c.extra ?? ""}`.trim(), text: [...p, "", `Revisar: ${c.link}`].join("\n"), html: layout("Video de rescate recibido", p, { cta: { label: "REVISAR RESCATE", href: c.link ?? "" } }) };
    }
    case "STAGE_OPEN": {
      const p = [hi, `Tu primer reto de ${c.stage ?? "AI First Mindset"} ya está disponible.`, "Ingresa a tu portal y toca «Comenzar primer reto». Ingresas con tu correo y un código de 6 dígitos de un solo uso."];
      return { subject: `AI Edge Talent | Tu primer reto de ${c.stage ?? "AI First Mindset"} está disponible`, text: [...p, "", `Ir a mi journey: ${c.link}`].join("\n"), html: layout("Tu primer reto está disponible", p, { cta: { label: "COMENZAR PRIMER RETO", href: c.link ?? "" } }) };
    }
    case "ACTIVATION": {
      const p = [
        "¡Felicitaciones!",
        "Has completado exitosamente la etapa de Assessment y estás habilitado para continuar tu experiencia AI Edge Talent.",
        "Desde ahora podrás acceder a tu espacio personal, conocer las próximas actividades y acompañar tu evolución a través de cada etapa.",
        "Ingresa con tu correo: te enviaremos un código de 6 dígitos de un solo uso. No necesitas recordar contraseñas.",
      ];
      return { subject: "AI Edge Talent | Tu siguiente etapa comienza aquí", text: [...p, "", `Ingresar a mi portal: ${c.link}`].join("\n"), html: layout("Tu siguiente etapa comienza aquí", p, { cta: { label: "INGRESAR A MI PORTAL", href: c.link ?? "" } }) };
    }
    case "ACCOUNT_INVITE": {
      const p = [hi, `Te creamos una cuenta en AI Edge Talent${c.stage ? ` como ${c.stage}` : ""}.`, "Ingresa con tu correo: te enviaremos un código de 6 dígitos de un solo uso. No necesitas recordar contraseñas."];
      return { subject: "AI Edge Talent | Tu cuenta está lista", text: [...p, "", `Ingresar: ${c.link}`].join("\n"), html: layout("Tu cuenta está lista", p, { cta: { label: "INGRESAR", href: c.link ?? "" } }) };
    }
    case "DELIVERY_INVITE": {
      const p = [hi, "Te habilitamos como Delivery en AI Edge Talent: desde tu portal podrás acompañar a tus profesionales, ver sus etapas, pendientes y alertas, y consultar el Playbook.", "Ingresa con tu correo: te enviaremos un código de 6 dígitos de un solo uso. No necesitas recordar contraseñas."];
      return { subject: "AI Edge Talent | Tu acceso de Delivery está listo", text: [...p, "", `Ingresar: ${c.link}`].join("\n"), html: layout("Tu acceso de Delivery está listo", p, { cta: { label: "INGRESAR A MI PORTAL", href: c.link ?? "" } }) };
    }
    case "PIN_RESET": {
      const p = [hi, "Recibimos una solicitud para restablecer tu código personal de AI Edge Talent. Usa este código temporal para crear uno nuevo:"];
      return { subject: "AI Edge Talent | Restablece tu código personal", text: [...p, "", c.code ?? "", "", `Crear mi nuevo código: ${c.link}`, `Vence en ${c.minutes} minutos. Si no lo pediste, ignora este correo: tu código actual sigue funcionando.`].join("\n"), html: layout("Restablece tu código personal", p, { code: c.code, cta: { label: "CREAR MI NUEVO CÓDIGO", href: c.link ?? "" }, foot: `Vence en ${c.minutes} minutos. Si no lo pediste, ignora este correo.` }) };
    }
    case "ADMIN_STEP": {
      const p = [hi, "Para completar tu ingreso de administración, ingresa este código de verificación:"];
      return { subject: `AI Edge Talent | Código de verificación ${c.code}`, text: [...p, "", c.code ?? "", "", `Vence en ${c.minutes} minutos. Si no fuiste tú, cambia tu código personal.`].join("\n"), html: layout("Verificación de administración", p, { code: c.code, foot: `Vence en ${c.minutes} minutos. Si no fuiste tú, cambia tu código personal de inmediato.` }) };
    }
    case "ACCESS_UPDATED": {
      const p = [hi, "Tu acceso a AI Edge Talent quedó habilitado para tu siguiente etapa.", "Ingresa con tu correo: te enviaremos un código de 6 dígitos de un solo uso. No necesitas recordar contraseñas."];
      return { subject: "AI Edge Talent | Tu siguiente etapa comienza aquí", text: [...p, "", `Ingresar: ${c.link}`].join("\n"), html: layout("Tu siguiente etapa comienza aquí", p, { cta: { label: "INGRESAR A MI PORTAL", href: c.link ?? "" } }) };
    }
    case "APPLICATION_RECEIVED": {
      const p = [
        hi,
        `¡Gracias por postular a ${c.stage ?? "AI Edge Talent"}! Recibimos tu postulación.`,
        "Desde tu portal puedes seguir el estado de tu postulación: después del cierre te contamos el resultado y el próximo paso.",
        "Ingresa con tu correo: te enviaremos un código de 6 dígitos de un solo uso. No necesitas recordar contraseñas.",
      ];
      return { subject: "AI Edge Talent | Recibimos tu postulación", text: [...p, "", `Ingresar a mi portal: ${c.link}`].join("\n"), html: layout("Recibimos tu postulación", p, { cta: { label: "INGRESAR A MI PORTAL", href: c.link ?? "" } }) };
    }
    case "DELIVERY_APPLICATION_SUBMITTED": {
      // extra = nombre del profesional; when = fecha y hora de envío (hora de Chile).
      const p = [
        hi,
        `Tu profesional ${c.extra} respondió el Assessment de ${c.stage ?? "AI Edge Talent"} el ${c.when}.`,
        "Ya puedes acceder a tu vista de equipo para ver el progreso de tus profesionales: quién se registró, quién está respondiendo, quién envió y en qué etapa va cada uno.",
        "Ingresa con tu correo: te enviaremos un código de 6 dígitos de un solo uso. No necesitas recordar contraseñas.",
      ];
      return {
        subject: `AI Edge Talent | ${c.extra} respondió el Assessment`,
        text: [...p, "", `Ver el progreso de mi equipo: ${c.link}`].join("\n"),
        html: layout(`${c.extra} respondió el Assessment`, p, { cta: { label: "VER EL PROGRESO DE MI EQUIPO", href: c.link ?? "" } }),
      };
    }
    case "CANDIDATE_ACCESS": {
      const p = [hi, `Para continuar o revisar tu postulación a ${c.stage ?? "AI Edge Talent"}, ingresa a tu portal con tu correo: te enviaremos un código de 6 dígitos de un solo uso.`, "Si ya habías empezado, retomas en la primera pregunta pendiente: tus respuestas están guardadas."];
      return { subject: "AI Edge Talent | Continúa tu postulación", text: [...p, "", `Ingresar: ${c.link}`].join("\n"), html: layout("Continúa tu postulación", p, { cta: { label: "CONTINUAR MI POSTULACIÓN", href: c.link ?? "" } }) };
    }
    case "LOGIN_CODE": {
      // stage = contexto opcional (p. ej. "continuar tu postulación").
      const p = [hi, `Tu código para ${c.stage ?? "ingresar a AI Edge Talent"} es:`];
      const foot = `Vence en ${c.minutes ?? 10} minutos y sirve una sola vez. Si no lo pediste, ignora este correo: nadie puede entrar sin él.`;
      return { subject: "AI Edge Talent | Tu código de acceso", text: [...p, "", c.code ?? "", "", foot].join("\n"), html: layout("Tu código de acceso", p, { code: c.code, foot }) };
    }
    case "PULSE_REMINDER": {
      const p = [hi, `Completaste los requisitos de ${c.stage}. Para cerrar la etapa y continuar tu journey, solo falta tu pulso de experiencia: toma uno o dos minutos.`];
      return { subject: `AI Edge Talent | Cierra ${c.stage} y continúa`, text: [...p, "", `Responder mi pulso: ${c.link}`].join("\n"), html: layout(`Cierra ${c.stage} y continúa`, p, { cta: { label: "COMPARTIR MI EXPERIENCIA", href: c.link ?? "" } }) };
    }
    case "DELIVERY_PULSE_ALERT": {
      const p = [hi, `${c.extra} completó los requisitos de ${c.stage}, pero aún no responde su pulso de cierre. Sin el pulso no puede avanzar a la siguiente etapa.`, "Te sugerimos hacerle seguimiento. Recuerda: el pulso lo responde solo el profesional."];
      return { subject: `AI Edge Talent | Pulso pendiente: ${c.extra}`, text: [...p, "", `Ver en tu portal: ${c.link}`].join("\n"), html: layout("Pulso pendiente de un profesional", p, { cta: { label: "VER EN MI PORTAL", href: c.link ?? "" } }) };
    }
    case "ACCESS_REQUEST_ADMIN": {
      const p = ["Llegó una solicitud de acceso especial a AI Edge Talent.", c.extra ?? ""];
      return { subject: "AI Edge Talent | Nueva solicitud de acceso especial", text: [...p, "", `Revisar: ${c.link}`].join("\n"), html: layout("Nueva solicitud de acceso especial", p, { cta: { label: "REVISAR SOLICITUD", href: c.link ?? "" } }) };
    }
    case "ACCESS_REQUEST_APPROVED": {
      const p = [hi, "Aprobamos tu solicitud de acceso a AI Edge Talent.", "Ingresa con tu correo: te enviaremos un código de 6 dígitos de un solo uso. No necesitas recordar contraseñas."];
      return { subject: "AI Edge Talent | Tu acceso fue aprobado", text: [...p, "", `Ingresar: ${c.link}`].join("\n"), html: layout("Tu acceso fue aprobado", p, { cta: { label: "INGRESAR", href: c.link ?? "" } }) };
    }
    case "ACCESS_REQUEST_REJECTED": {
      const p = [hi, "Revisamos tu solicitud de acceso especial y por ahora no podemos habilitar tu acceso.", c.extra ? `Motivo: ${c.extra}` : "", "Si tienes dudas, responde este correo o escríbenos desde la sección Ayuda."].filter(Boolean);
      return { subject: "AI Edge Talent | Sobre tu solicitud de acceso", text: p.join("\n"), html: layout("Sobre tu solicitud de acceso", p, {}) };
    }
  }
}
