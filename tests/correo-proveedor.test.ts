import { describe, expect, it } from "vitest";
import { describeEmail, emailConfig, routeMessage, RESEND_TEST_FROM } from "@/lib/email/provider";

describe("emailConfig", () => {
  it("sin llave no envía", () => {
    expect(emailConfig({}).ok).toBe(false);
  });
  it("usa el remitente de prueba por defecto y exige el correo del dueño", () => {
    expect(emailConfig({ RESEND_API_KEY: "re_x" }).ok).toBe(false);
    const c = emailConfig({ RESEND_API_KEY: "re_x", RESEND_TEST_TO: "Yo@Ejemplo.com" });
    expect(c).toEqual({ ok: true, apiKey: "re_x", from: RESEND_TEST_FROM, testMode: true, testTo: "yo@ejemplo.com" });
  });
  it("con dominio propio no está en modo prueba", () => {
    const c = emailConfig({ RESEND_API_KEY: "re_x", RESEND_FROM: "AET <aet@midominio.cl>" });
    expect(c.ok && c.testMode).toBe(false);
  });
  it("el diagnóstico no expone la llave", () => {
    const d = describeEmail(emailConfig({ RESEND_API_KEY: "re_secreta", RESEND_TEST_TO: "persona@ejemplo.com" }));
    expect(d).not.toContain("re_secreta");
    expect(d).toContain("pe•••@ejemplo.com");
  });
});

describe("routeMessage", () => {
  it("en modo prueba redirige al dueño e indica el destinatario original", () => {
    const c = emailConfig({ RESEND_API_KEY: "re_x", RESEND_TEST_TO: "yo@ejemplo.com" });
    if (!c.ok) throw new Error();
    const m = routeMessage(c, ["profesional@cliente.cl"], "Hola", "texto", "<html><body style=\"x\"><p>hola</p></body></html>");
    expect(m.to).toEqual(["yo@ejemplo.com"]);
    expect(m.subject).toBe("[Prueba → profesional@cliente.cl] Hola");
    expect(m.text).toContain("iba dirigido a: profesional@cliente.cl");
    expect(m.html).toContain("<body style=\"x\"><div");
  });
  it("con dominio propio no cambia nada", () => {
    const c = emailConfig({ RESEND_API_KEY: "re_x", RESEND_FROM: "AET <aet@midominio.cl>" });
    if (!c.ok) throw new Error();
    expect(routeMessage(c, ["a@b.cl"], "S", "t").to).toEqual(["a@b.cl"]);
  });
});
