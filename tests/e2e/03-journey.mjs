import { createRequire } from "module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const B = "http://localhost:3100", S = "../stack";
const b = await chromium.launch();
const errors = [];
async function as(user, w = 1366) {
  const session = JSON.parse(fs.readFileSync(`${S}/session-${user}.json`, "utf8"));
  const ctx = await b.newContext({ viewport: { width: w, height: 900 } });
  await ctx.addCookies([{ name: "sb-127-auth-token", value: "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"), domain: "localhost", path: "/" }]);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`${user}: ${e.message}`)); p.on("dialog", (d) => d.accept());
  return p;
}
const log = (...a) => console.log(...a);
const admin = await as("admin"), kiber = await as("kiber", 430), mentor = await as("mentor"), client = await as("sponsor");

// /inicio dirige por rol
for (const [p, n] of [[admin, "admin"], [kiber, "kiber"], [mentor, "mentor"], [client, "cliente"]]) { await p.goto(B + "/inicio"); log(`inicio ${n} →`, new URL(p.url()).pathname); }

// 1. Admin: guía de etapa + cápsula con material y tarea
await admin.goto(B + "/admin/contenido/wave-3");
await admin.fill("#gv", "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
await admin.fill("#gh", "Rediseñas una actividad real integrando IA con criterio.");
await admin.getByRole("button", { name: "Guardar guía" }).click();
await admin.getByText("Guía de etapa guardada.").waitFor();
await admin.getByRole("button", { name: "Nueva cápsula" }).click();
await admin.fill("#ct", "Rediseña una actividad real");
await admin.fill("#cd", "Micro-cápsula de 8 minutos.");
await admin.fill("#cv", "https://vimeo.com/76979871");
await admin.locator('input[type="file"]').nth(2).setInputFiles("/tmp/claude-0/material.txt");
await admin.getByText("material.txt").waitFor({ timeout: 15000 });
await admin.fill("#ck", "Sube tu rediseño de una actividad real con IA.");
await admin.getByText("Obligatoria para avanzar de etapa").click();
await admin.getByText("Publicada (visible para los participantes)").click();
await admin.getByRole("button", { name: "Guardar cápsula" }).click();
await admin.getByText(/Rediseña una actividad real/).first().waitFor();
await admin.screenshot({ path: "live/p2-01-contenido.png", fullPage: true });
log("1 contenido ok");

// 2. Admin: iniciar AI Mindset
await admin.goto(B + "/admin/journey/wave-3?tab=participantes");
await admin.getByLabel("Seleccionar Paula Prueba Díaz").check();
await admin.getByRole("button", { name: "Avanzar" }).click();
await admin.getByText(/1 persona\(s\) avanzaron/).waitFor();
// gate: intentar Role Enablement sin tarea aprobada
await admin.getByLabel("Seleccionar Paula Prueba Díaz").check();
await admin.getByLabel("Etapa destino").selectOption("ROLE_ENABLEMENT");
await admin.getByRole("button", { name: "Avanzar" }).click();
await admin.getByText(/Faltan 1 tarea/).waitFor();
log("2 gate Mindset bloquea sin aprobación ok");

// 3. Kiber: portal, cápsula, material, tarea
await kiber.goto(B + "/mi-journey");
await kiber.getByText("Dónde estás · AI Mindset").waitFor();
await kiber.screenshot({ path: "live/p2-02-mi-journey.png", fullPage: true });
await kiber.getByRole("link", { name: /Rediseña una actividad real/ }).click();
await kiber.getByText("Material descargable").waitFor();
const [req1] = await Promise.all([kiber.context().waitForEvent("request", (r) => r.url().includes("/object/sign/content/")), kiber.getByRole("button", { name: "material.txt" }).click()]);
log("3 descarga material:", (await (await fetch(req1.url())).text()).includes("material de la cápsula") ? "ok" : "FALLÓ");
await kiber.getByLabel("Vi esta cápsula").check();
await kiber.fill("#ta", "Rediseñé la generación de casos de prueba con un agente y revisión humana.");
await kiber.locator('input[type="file"]').setInputFiles("/tmp/claude-0/tarea.pdf");
await kiber.getByText("tarea.pdf").waitFor({ timeout: 15000 });
await kiber.getByRole("button", { name: "Enviar entrega" }).click();
await kiber.getByText(/Entrega recibida/).waitFor();
await kiber.reload();
log("3 reenvío bloqueado:", await kiber.getByText("Tu entrega anterior está en revisión.").isVisible());
await kiber.screenshot({ path: "live/p2-03-capsula.png", fullPage: true });

// 4. Admin: revisar y aprobar
await admin.goto(B + "/admin/journey/wave-3?tab=entregas");
await admin.getByText("Paula Prueba Díaz · Rediseña una actividad real").waitFor();
const [req2] = await Promise.all([admin.context().waitForEvent("request", (r) => r.url().includes("/object/sign/submissions/")), admin.getByRole("button", { name: "tarea.pdf" }).click()]);
log("4 admin abre entrega:", (await fetch(req2.url())).status === 200 ? "ok" : "FALLÓ");
// sin permiso: el cliente no puede pedir la URL firmada de una entrega
const path2 = decodeURIComponent(new URL(req2.url()).pathname.split("/object/sign/submissions/")[1]);
await admin.locator('input[inputmode="numeric"]').first().fill("82");
await admin.locator("textarea").first().fill("Buen rediseño, cumple hard gates.");
await admin.getByRole("button", { name: "Aprobar" }).click();
await admin.getByText(/Revisión registrada/).waitFor();

// 5. Admin: avanzar a Role Enablement (gate ok)
await admin.goto(B + "/admin/journey/wave-3?tab=participantes");
await admin.getByLabel("Seleccionar Paula Prueba Díaz").check();
await admin.getByLabel("Etapa destino").selectOption("ROLE_ENABLEMENT");
await admin.getByRole("button", { name: "Avanzar" }).click();
await admin.getByText(/1 persona\(s\) avanzaron/).waitFor();
log("5 Role Enablement ok");

// 6. Grupo + mentor + integrante
await admin.goto(B + "/admin/journey/wave-3?tab=grupos");
await admin.fill('input[placeholder^="Nombre del grupo"]', "QA · Grupo 1");
await admin.getByRole("button", { name: "Crear grupo" }).click();
await admin.getByRole("heading", { name: "QA · Grupo 1" }).waitFor();
await admin.fill('input[placeholder="correo del mentor"]', "mentor@kibernum.test");
await admin.getByRole("button", { name: "Asignar" }).click();
await admin.getByText(/asignado\/a al grupo/).waitFor();
await admin.reload();
await admin.getByLabel(/Paula Prueba Díaz/).check();
await admin.getByRole("button", { name: "Guardar integrantes" }).click();
await admin.getByText("1 persona(s) en el grupo.").waitFor();
log("6 grupo ok");

// 7. Mentor: feedback semanal
await mentor.goto(B + "/mentor");
await mentor.getByRole("heading", { name: /QA · Grupo 1/ }).waitFor();
await mentor.getByLabel("Riesgo de Paula Prueba Díaz").selectOption("MEDIUM");
await mentor.getByLabel("Comentario sobre Paula Prueba Díaz").fill("Avanza, pero necesita más horas de estudio.");
await mentor.fill('textarea[id^="co-"]', "El profesor va bien; el grupo pide más ejercicios prácticos.");
await mentor.getByRole("button", { name: "Enviar feedback de la semana" }).click();
await mentor.getByText(/Feedback de la semana guardado/).waitFor();
await mentor.screenshot({ path: "live/p2-04-mentor.png", fullPage: true });
await admin.goto(B + "/admin/journey/wave-3?tab=feedback");
await admin.getByText("Avanza, pero necesita más horas de estudio.").waitFor();
await admin.screenshot({ path: "live/p2-05-feedback.png", fullPage: true });
log("7 feedback ok");

// 8. Kiber: certificación
await kiber.goto(B + "/mi-journey");
await kiber.getByText("Tu certificación").waitFor();
await kiber.fill("#cd", "2026-11-20");
await kiber.locator('input[type="file"]').setInputFiles("/tmp/claude-0/certificado.pdf");
await kiber.getByText("certificado.pdf").waitFor({ timeout: 15000 });
await kiber.getByRole("button", { name: "Registrar certificación" }).click();
await kiber.getByText(/Registro recibido/).waitFor();
// 9. Admin verifica y avanza a AI Lab
await admin.goto(B + "/admin/journey/wave-3?tab=certificaciones");
await admin.getByRole("button", { name: "Verificar" }).click();
await admin.getByText(/Certificación verificada/).waitFor();
await admin.goto(B + "/admin/journey/wave-3?tab=participantes");
await admin.getByLabel("Seleccionar Paula Prueba Díaz").check();
await admin.getByLabel("Etapa destino").selectOption("AI_LAB_SHOWCASE");
await admin.getByRole("button", { name: "Avanzar" }).click();
await admin.getByText(/1 persona\(s\) avanzaron/).waitFor();
log("9 AI Lab ok");

// 10. Cliente: vista general
await client.goto(B + "/cliente");
await client.getByText("En qué va el programa").waitFor();
await client.screenshot({ path: "live/p2-06-cliente.png", fullPage: true });
log("10 cliente ve:", (await client.locator("table").innerText()).replace(/\s+/g, " ").slice(0, 120));
// cliente no entra a admin ni mentor
await client.goto(B + "/admin/journey/wave-3"); log("cliente en admin →", new URL(client.url()).pathname);
log("errors", errors);
await b.close();
