// Registro en el sitio publicado hasta la verificación del correo, con datos ficticios. Lo ejecuta .github/workflows/prueba-postulacion.yml.
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
  await p.locator("#phone").fill("9 1234 5678");
  await p.locator("#client_name").fill("Cliente Demo");
  await p.locator("#role_title").fill("QA Analyst");
  await p.locator("#team").fill("Equipo de prueba");
  await p.locator("#delivery").selectOption({ label: DELIVERY });
  await p.getByRole("button", { name: "Continuar" }).click();
  await p.getByRole("heading", { name: "Verifica tu correo" }).waitFor();
  say(`Registro OK con ${EMAIL}, Delivery ${DELIVERY}: el sitio pide el código de 6 dígitos enviado al correo`);
  // El código solo llega al correo (nadie más puede leerlo): la prueba automática termina aquí.
} catch (e) {
  console.log(`::error title=Postulación::${e instanceof Error ? e.message : e}`);
  await p.screenshot({ path: "falla.png", fullPage: true });
  process.exitCode = 1;
}
await b.close();
