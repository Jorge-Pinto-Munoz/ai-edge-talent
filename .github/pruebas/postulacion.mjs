// Postulación completa en el sitio publicado, con datos ficticios. Lo ejecuta .github/workflows/prueba-postulacion.yml.
import { chromium } from "playwright";
const { SITE, EMAIL, NOMBRE, DELIVERY } = process.env;
const say = (m) => console.log(`::notice title=Postulación::${m}`);
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
p.setDefaultTimeout(45000);
p.on("dialog", (d) => d.accept());
try {
  await p.goto(`${SITE}/postular/registro?wave=wave-3`);
  await p.locator("#full_name").fill(NOMBRE);
  await p.locator("#corporate_email").fill(EMAIL);
  await p.locator("#phone").fill("12345678");
  await p.locator("#client_name").fill("Cliente Demo");
  await p.locator("#role_title").fill("QA Analyst");
  await p.locator("#team").fill("Equipo de prueba");
  await p.locator("#delivery").selectOption({ label: DELIVERY });
  await p.getByRole("button", { name: "Continuar a la postulación" }).click();
  const ok = await p.waitForURL(/\/postular\/[a-f0-9]{36}/, { timeout: 30000 }).then(() => true, () => false);
  if (!ok) throw new Error(`No pasó al formulario: ${(await p.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 300)}`);
  say(`Registro OK con ${EMAIL}, Delivery ${DELIVERY}`);
  for (const c of await p.locator("input[type=checkbox]").all()) await c.check();
  await p.locator("button.btn:not([disabled])").last().click();
  await p.locator(".assess-bar").waitFor();
  const n = await p.locator(".card textarea").count();
  for (let i = 0; i < n; i++) await p.locator(".card textarea").nth(i).fill(`Respuesta de prueba ${i + 1}: uso IA a diario para preparar casos de prueba, revisar código y documentar con criterio propio.`);
  await p.locator("input[type=radio]").last().check();
  await p.locator(".assess-save.s-saved").waitFor();
  say(`Assessment completo (${n + 1} preguntas) y guardado`);
  await p.getByRole("button", { name: "Enviar mi postulación" }).click();
  await p.getByText("Recibimos tu postulación").waitFor();
  say("Postulación enviada: el sitio confirmó «Recibimos tu postulación»");
} catch (e) {
  console.log(`::error title=Postulación::${e instanceof Error ? e.message : e}`);
  await p.screenshot({ path: "falla.png", fullPage: true });
  process.exitCode = 1;
}
await b.close();
