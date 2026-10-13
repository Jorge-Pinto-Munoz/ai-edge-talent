/**
 * Plantillas de correo de identidad, journey y operación. Texto + HTML simple con la marca.
 * Cada plantilla devuelve asunto, texto y HTML; el envío y su registro los hace lib/identity/service.ts.
 */
export type IdentityTemplate =
  | "ACTIVATION" | "ACCOUNT_INVITE" | "DELIVERY_INVITE" | "PIN_RESET" | "ADMIN_STEP" | "ACCESS_UPDATED"
  | "PULSE_REMINDER" | "DELIVERY_PULSE_ALERT" | "ACCESS_REQUEST_ADMIN" | "ACCESS_REQUEST_APPROVED" | "ACCESS_REQUEST_REJECTED" | "APPLICATION_RECEIVED" | "DELIVERY_APPLICATION_SUBMITTED";

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
  DELIVERY_PULSE_ALERT: "Alerta a Delivery",
  ACCESS_REQUEST_ADMIN: "Solicitud de acceso especial",
  ACCESS_REQUEST_APPROVED: "Solicitud aprobada",
  ACCESS_REQUEST_REJECTED: "Solicitud no aprobada",
};

export interface Rendered { subject: string; text: string; html: string }
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function layout(title: string, paras: string[], opts: { code?: string; cta?: { label: string; href: string }; foot?: string }): string {
  return `<!doctype html><html lang="es"><body style="margin:0;background:#f3f6f8;font-family:Arial,Helvetica,sans-serif;color:#141b23">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:#080b10;padding:20px 28px;color:#3dc9d4;font-weight:bold;letter-spacing:2px;font-size:12px">KIBERNUM · AI EDGE TALENT</td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.25">${esc(title)}</h1>
${paras.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55">${esc(p)}</p>`).join("")}
${opts.code ? `<p style="margin:20px 0;text-align:center"><span style="display:inline-block;padding:14px 22px;border-radius:14px;background:#e3f5f7;font-size:30px;font-weight:bold;letter-spacing:10px">${esc(opts.code)}</span></p>` : ""}
${opts.cta ? `<p style="margin:22px 0;text-align:center"><a href="${esc(opts.cta.href)}" style="display:inline-block;padding:14px 26px;border-radius:999px;background:#3dc9d4;color:#080b10;font-weight:bold;text-decoration:none">${esc(opts.cta.label)}</a></p>` : ""}
${opts.foot ? `<p style="margin:18px 0 0;font-size:12px;color:#4b5763">${esc(opts.foot)}</p>` : ""}
</td></tr></table></td></tr></table></body></html>`;
}

export function renderIdentity(t: IdentityTemplate, c: { name?: string; code?: string; link?: string; minutes?: number; stage?: string; extra?: string; when?: string }): Rendered {
  const hi = c.name ? `Hola ${c.name.split(" ")[0]}:` : "Hola:";
  switch (t) {
    case "ACTIVATION": {
      const p = [
        "¡Felicitaciones!",
        "Has completado exitosamente la etapa de Assessment y estás habilitado para continuar tu experiencia AI Edge Talent.",
        "Desde ahora podrás acceder a tu espacio personal, conocer las próximas actividades y acompañar tu evolución a través de cada etapa.",
        "Para activar tu portal, utiliza el siguiente código temporal:",
      ];
      const after = [`Por seguridad, este código tiene una vigencia limitada (${Math.round((c.minutes ?? 2880) / 60)} horas).`, "Al ingresar por primera vez, podrás configurar tu propio código personal.", "¡Bienvenido a la siguiente etapa!"];
      return {
        subject: "AI Edge Talent | Tu siguiente etapa comienza aquí",
        text: [...p, "", c.code ?? "", "", ...after, "", `Activar mi portal: ${c.link}`].join("\n"),
        html: layout("Tu siguiente etapa comienza aquí", p, { code: c.code, cta: { label: "ACTIVAR MI PORTAL", href: c.link ?? "" }, foot: after.join(" ") }),
      };
    }
    case "ACCOUNT_INVITE": {
      const p = [hi, "Te creamos una cuenta en AI Edge Talent. Activa tu acceso con este código temporal y crea tu código personal:"];
      return { subject: "AI Edge Talent | Activa tu cuenta", text: [...p, "", c.code ?? "", "", `Activar: ${c.link}`].join("\n"), html: layout("Activa tu cuenta", p, { code: c.code, cta: { label: "ACTIVAR MI CUENTA", href: c.link ?? "" }, foot: `El código vence en ${Math.round((c.minutes ?? 2880) / 60)} horas.` }) };
    }
    case "DELIVERY_INVITE": {
      const p = [hi, "Te habilitamos como Delivery en AI Edge Talent: desde tu portal podrás acompañar a tus profesionales, ver sus etapas, pendientes y alertas, y consultar el Playbook.", "Activa tu acceso con este código temporal:"];
      return { subject: "AI Edge Talent | Activa tu acceso de Delivery", text: [...p, "", c.code ?? "", "", `Activar: ${c.link}`, "Al ingresar crearás tu código personal."].join("\n"), html: layout("Activa tu acceso de Delivery", p, { code: c.code, cta: { label: "ACTIVAR MI ACCESO", href: c.link ?? "" }, foot: `El código vence en ${Math.round((c.minutes ?? 2880) / 60)} horas. Al ingresar crearás tu código personal.` }) };
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
      const p = [hi, "Tu acceso a AI Edge Talent quedó habilitado para tu siguiente etapa. Ingresa con tu correo y tu código personal."];
      return { subject: "AI Edge Talent | Tu siguiente etapa comienza aquí", text: [...p, "", `Ingresar: ${c.link}`].join("\n"), html: layout("Tu siguiente etapa comienza aquí", p, { cta: { label: "INGRESAR A MI PORTAL", href: c.link ?? "" } }) };
    }
    case "APPLICATION_RECEIVED": {
      // Con código: primera vez (credenciales). Sin código: ya tiene su código personal.
      const p = [
        hi,
        `¡Gracias por postular a ${c.stage ?? "AI Edge Talent"}! Recibimos tu postulación.`,
        "Desde tu portal puedes seguir el estado de tu postulación: después del cierre te contamos el resultado y el próximo paso.",
        c.code ? `Ingresa con tu correo (${c.extra ?? ""}) y este código temporal:` : "Ingresa con tu correo y tu código personal de 4 dígitos.",
      ];
      const foot = c.code ? `El código vence en ${Math.round((c.minutes ?? 2880) / 60)} horas. Al ingresar por primera vez crearás tu propio código de 4 dígitos, uno que recuerdes.` : undefined;
      return {
        subject: "AI Edge Talent | Recibimos tu postulación",
        text: [...p, ...(c.code ? ["", c.code] : []), "", `Ingresar a mi portal: ${c.link}`, ...(foot ? ["", foot] : [])].join("\n"),
        html: layout("Recibimos tu postulación", p, { code: c.code, cta: { label: "INGRESAR A MI PORTAL", href: c.link ?? "" }, foot }),
      };
    }
    case "DELIVERY_APPLICATION_SUBMITTED": {
      // extra = nombre del profesional; when = fecha y hora de envío (hora de Chile).
      const p = [
        hi,
        `Tu profesional ${c.extra} respondió el Assessment de ${c.stage ?? "AI Edge Talent"} el ${c.when}.`,
        "Ya puedes acceder a tu vista de equipo para ver el progreso de tus profesionales: quién se registró, quién está respondiendo, quién envió y en qué etapa va cada uno.",
        c.code ? "Tu acceso ya está habilitado. Ingresa con tu correo y este código temporal:" : "Ingresa con tu correo y tu código personal de 4 dígitos.",
      ];
      const foot = c.code ? `El código vence en ${Math.round((c.minutes ?? 2880) / 60)} horas. Al ingresar por primera vez crearás tu propio código de 4 dígitos.` : undefined;
      return {
        subject: `AI Edge Talent | ${c.extra} respondió el Assessment`,
        text: [...p, ...(c.code ? ["", c.code] : []), "", `Ver el progreso de mi equipo: ${c.link}`, ...(foot ? ["", foot] : [])].join("\n"),
        html: layout(`${c.extra} respondió el Assessment`, p, { code: c.code, cta: { label: "VER EL PROGRESO DE MI EQUIPO", href: c.link ?? "" }, foot }),
      };
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
      const p = [hi, "Aprobamos tu solicitud de acceso especial. Activa tu portal con este código temporal:"];
      return { subject: "AI Edge Talent | Tu acceso fue aprobado", text: [...p, "", c.code ?? "", "", `Activar: ${c.link}`].join("\n"), html: layout("Tu acceso fue aprobado", p, { code: c.code, cta: { label: "ACTIVAR MI PORTAL", href: c.link ?? "" }, foot: "Al ingresar crearás tu código personal." }) };
    }
    case "ACCESS_REQUEST_REJECTED": {
      const p = [hi, "Revisamos tu solicitud de acceso especial y por ahora no podemos habilitar tu acceso.", c.extra ? `Motivo: ${c.extra}` : "", "Si tienes dudas, responde este correo o escríbenos desde la sección Ayuda."].filter(Boolean);
      return { subject: "AI Edge Talent | Sobre tu solicitud de acceso", text: p.join("\n"), html: layout("Sobre tu solicitud de acceso", p, {}) };
    }
  }
}
