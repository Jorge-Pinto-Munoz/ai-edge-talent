import { describe, expect, it } from "vitest";
import { describeProvider, emailProvider } from "@/lib/email/provider";

describe("emailProvider", () => {
  it("usa Gmail por SMTP con solo usuario y contraseña de aplicación", () => {
    const p = emailProvider({ SMTP_USER: "aet.avisos@gmail.com", SMTP_PASS: "abcd efgh ijkl mnop" });
    expect(p).toEqual({ kind: "smtp", host: "smtp.gmail.com", port: 465, user: "aet.avisos@gmail.com", pass: "abcdefghijklmnop", from: "AI Edge Talent <aet.avisos@gmail.com>" });
  });
  it("prefiere SMTP sobre Resend y permite nombre visible", () => {
    const p = emailProvider({ SMTP_USER: "a@gmail.com", SMTP_PASS: "x", EMAIL_FROM_NAME: "AET Kibernum", RESEND_API_KEY: "re_x", RESEND_FROM: "b@c.com" });
    expect(p.kind === "smtp" && p.from).toBe("AET Kibernum <a@gmail.com>");
  });
  it("cae a Resend y luego a ninguno", () => {
    expect(emailProvider({ RESEND_API_KEY: "re_x", RESEND_FROM: "b@c.com" }).kind).toBe("resend");
    expect(emailProvider({}).kind).toBe("none");
  });
  it("el diagnóstico no expone la contraseña", () => {
    expect(describeProvider(emailProvider({ SMTP_USER: "a@gmail.com", SMTP_PASS: "secreto123" }))).not.toContain("secreto123");
  });
});
