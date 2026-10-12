import { createRequire } from "module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const B = "http://localhost:3100", S = "../stack";
const b = await chromium.launch();
const errors = [];
async function as(user, w = 1366) {
  const session = JSON.parse(fs.readFileSync(`${S}/session-${user}.json`, "utf8"));
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, acceptDownloads: true });
  await ctx.addCookies([{ name: "sb-127-auth-token", value: "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"), domain: "localhost", path: "/" }]);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => errors.push(`${user}: ${e.message}`)); p.on("dialog", (d) => d.accept());
  return p;
}
const log = (...a) => console.log(...a);
const admin = await as("admin"), delivery = await as("delivery");

// 1. Importar históricos
await admin.goto(B + "/admin/talento/importar");
await admin.fill("#ht", "Nombre;Correo;Wave;Cliente;Rol;Especialidad;Resultado;Estado servicio\nCamila Histórica;camila@kibernum.test;Wave 1;Cliente Demo Alfa;Scrum Master;Agilidad;Completó;En servicio\nMarco Salida;marco@kibernum.test;Wave 2;Cliente Demo Beta;Analista de datos;Data;Completó;Salió\nPaula Prueba Díaz;KIBER@kibernum.test;Wave 2;Cliente Demo Alfa;QA Lead;Calidad;Completó;En servicio");
await admin.getByRole("cell", { name: "Marco Salida" }).waitFor();
await admin.getByRole("button", { name: /Cargar/ }).click();
await admin.getByText(/3 participante\(s\) histórico\(s\) cargado\(s\)/).waitFor();
log("1 importación ok");

// 2. Pool: KPIs, clusters, filtros
await admin.goto(B + "/admin/talento");
await admin.getByText("personas en el pool").waitFor();
const kpis = await admin.locator(".card").allInnerTexts();
log("kpis:", kpis.slice(0, 6).map((t) => t.replace(/\s+/g, " ")).join(" | "));
await admin.screenshot({ path: "live/p3-01-pool.png", fullPage: true });
const rowsAll = await admin.locator("tbody tr").count();
await admin.getByRole("button", { name: /Datos/ }).first().click();
const rowsData = await admin.locator("tbody tr").allInnerTexts();
log("todas:", rowsAll, "cluster Datos:", rowsData.map((r) => r.split("\n")[0]));
await admin.getByRole("button", { name: /Datos/ }).first().click();
await admin.getByLabel("Estado de servicio").selectOption("LEFT");
log("salieron:", (await admin.locator("tbody tr").allInnerTexts()).map((r) => r.split("\n")[0]));
await admin.getByLabel("Estado de servicio").selectOption("");
await admin.getByLabel("Wave").selectOption("wave-2");
log("wave-2:", (await admin.locator("tbody tr").allInnerTexts()).map((r) => r.split("\n")[0]));
await admin.getByLabel("Wave").selectOption("");
const [dl] = await Promise.all([admin.waitForEvent("download"), admin.getByRole("button", { name: /Descargar CSV/ }).click()]);
const csv = fs.readFileSync(await dl.path(), "utf8");
log("csv:", dl.suggestedFilename(), csv.split("\n")[0].slice(0, 120), "filas", csv.trim().split("\n").length - 1);
log("csv contiene puntaje?", /score|puntaje/i.test(csv));

// 3. Ficha de Paula (2 Waves): High Talent, estado, seguimiento
await admin.getByRole("link", { name: "Paula Prueba Díaz" }).click();
await admin.getByText("Estado de servicio").first().waitFor();
log("waves de Paula:", (await admin.locator("body").innerText()).match(/Wave [123]/g)?.join(","));
await admin.fill("#ht", "Lideró el rediseño de pruebas con IA en el Showcase.");
await admin.getByRole("button", { name: "Marcar High Talent" }).click();
await admin.getByText("Marcado/a como High Talent.").waitFor();
await admin.getByLabel("Estado").selectOption("LEFT");
await admin.getByRole("button", { name: "Guardar estado" }).click();
await admin.getByText("Indica el motivo de salida.").waitFor();
await admin.fill("#since", "2026-10-01");
await admin.fill("#reason", "Cambio de empresa");
await admin.getByRole("button", { name: "Guardar estado" }).click();
await admin.getByText(/Estado de servicio actualizado/).waitFor();
await admin.getByLabel("Wave").selectOption("wave-2");
await admin.getByLabel("Fecha base").fill("2026-06-30");
await admin.getByRole("button", { name: "Programar Mes 1 y Mes 3" }).click();
await admin.getByText(/Mes 1 \(2026-07-30\) y Mes 3 \(2026-09-28\)/).waitFor();
await admin.waitForTimeout(800);
await admin.getByRole("button", { name: "Registrar seguimiento" }).first().click();
await admin.getByText("Seguimiento registrado.").waitFor();
await admin.screenshot({ path: "live/p3-02-ficha.png", fullPage: true });
log("3 ficha ok");

// 4. Delivery: puede cambiar estado pero no High Talent
const paulaUrl = admin.url();
await delivery.goto(paulaUrl);
await delivery.getByText("Solo un admin marca High Talent.").waitFor();
await delivery.getByLabel("Estado").selectOption("IN_SERVICE");
await delivery.fill("#reason", "Reingresa");
await delivery.getByRole("button", { name: "Guardar estado" }).click();
await delivery.getByText(/Estado de servicio actualizado/).waitFor();
await delivery.goto(B + "/admin/talento/importar");
log("delivery en importar →", new URL(delivery.url()).pathname);
log("4 delivery ok");

// 5. Pool vuelve a mostrar cambios + vista móvil
await admin.goto(B + "/admin/talento");
await admin.getByText("Solo High Talent").click();
log("high talent:", (await admin.locator("tbody tr").allInnerTexts()).map((r) => r.split("\n")[0]));
const m = await as("admin", 390); await m.goto(B + "/admin/talento");
const sw = await m.evaluate(() => document.documentElement.scrollWidth);
log("móvil scrollWidth", sw);
await m.screenshot({ path: "live/p3-03-movil.png", fullPage: true });
log("errores de página:", errors);
await b.close();
