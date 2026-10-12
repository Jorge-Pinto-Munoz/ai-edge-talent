import { createRequire } from "module";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require("/opt/node-tools/node_modules/playwright");
const B = "http://localhost:3100";
const session = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const token = process.argv[3];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
await ctx.addCookies([{ name: "sb-127-auth-token", value: "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"), domain: "localhost", path: "/" }]);
const p = await ctx.newPage();
const errors = []; p.on("pageerror", (e) => errors.push(e.message)); p.on("dialog", (d) => d.accept());
const shot = (n) => p.screenshot({ path: `live/${n}.png`, fullPage: true });

// sin sesión → login
const anon = await (await b.newContext()).newPage();
await anon.goto(B + "/admin/admision"); console.log("sin sesión redirige a:", new URL(anon.url()).pathname);

await p.goto(B + "/admin/admision");
await p.getByRole("heading", { name: "Admisión por Wave" }).waitFor({ timeout: 15000 });
await shot("05-admin-home");
await p.goto(B + "/admin/admision/wave-3/importar");
await p.fill("#csv", "Nombre;Correo;Cliente;Rol;Especialidad\nDiego Demo;diego@kibernum.test;Cliente Demo Alfa;Developer;Ingeniería\nValentina Demo;valentina@kibernum.test;Cliente Demo Beta;Scrum Master;Agilidad\nPaula repetida;paula.prueba@kibernum.test;Alfa;QA;Calidad");
await p.getByRole("button", { name: /Importar 3 candidato/ }).click();
await p.getByText(/candidato\(s\) importado/).waitFor({ timeout: 15000 });
console.log("import:", (await p.locator(".callout").last().innerText()).replace(/\n/g, " | "));
await p.goto(B + "/admin/admision/wave-3");
await p.getByRole("heading", { name: "Candidatos" }).waitFor();
await shot("06-candidatos");
// seleccionar los que IA propone avanzar → decidir
await p.getByRole("button", { name: "IA propone avanzar" }).click();
await p.getByText("1 seleccionado(s)").waitFor();
await p.getByRole("button", { name: "Registrar decisión" }).click();
await p.getByText(/Decisión registrada para 1/).waitFor({ timeout: 15000 });
await shot("07-decision");
// correo a seleccionados
await p.getByLabel("Seleccionar Paula Prueba Díaz").check();
await p.getByLabel("Plantilla").selectOption("SELECTED");
await p.getByRole("button", { name: "Enviar correo" }).click();
await p.locator(".callout").last().waitFor();
await p.waitForTimeout(1500);
console.log("correo:", (await p.locator(".callout").last().innerText()).replace(/\n/g, " | "));
// detalle
await p.getByRole("link", { name: "Paula Prueba Díaz" }).click();
await p.getByText("Propuesta de la IA").waitFor();
await shot("08-detalle");
// candidata acepta compromiso
const k = await (await b.newContext({ viewport: { width: 390, height: 860 } })).newPage();
await k.goto(B + "/postular/" + token);
await k.getByText(/fuiste seleccionado\/a para continuar/).waitFor();
await k.locator('input[type="checkbox"]').check();
await k.fill("#fullname", "Paula Prueba Díaz");
await k.getByRole("button", { name: "Aceptar compromiso e ingresar a Wave 3" }).click();
await k.getByText(/Ya eres parte de Wave 3/).waitFor({ timeout: 15000 });
await k.screenshot({ path: "live/09-inscrita.png" });
console.log("errors", errors);
await b.close();
