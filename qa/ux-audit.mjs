/**
 * Auditoría UX/UI automática: recorre las pantallas por rol y tamaño de pantalla y detecta
 *  - desborde horizontal (algo más ancho que la pantalla),
 *  - íconos montados sobre texto (p. ej. una estrella encima de un título),
 *  - errores de consola o de carga, páginas sin un único <h1>,
 *  - problemas de accesibilidad WCAG 2.2 AA con axe (contraste, etiquetas, tamaño de toque, etc.).
 * Toma una captura de cada pantalla. Termina con código 1 si encuentra problemas (sirve en CI).
 *
 * Uso:   node qa/ux-audit.mjs                       (sitio en http://localhost:3000, solo páginas públicas)
 *        BASE_URL=https://… node qa/ux-audit.mjs
 * Roles: AUDIT_SESSION_<ROL>=ruta/a/sesion.json (sesión de Supabase: access_token, refresh_token…)
 *        y AUDIT_COOKIE=sb-<ref>-auth-token (nombre de la cookie de sesión de tu proyecto).
 * Opciones: WIDTHS="[320,390,1366]"  ZOOM=120 (texto agrandado, como el ajuste de iPhone)  DARK=1
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const WIDTHS = JSON.parse(process.env.WIDTHS ?? "[320,390,1366]");
const ZOOM = Number(process.env.ZOOM ?? 0);
const OUT = path.resolve(process.env.OUT ?? "qa/report");
const PAGES = JSON.parse(fs.readFileSync(new URL("./pages.json", import.meta.url), "utf8"));
fs.mkdirSync(path.join(OUT, "shots"), { recursive: true });

const sessionCookie = (role) => {
  const file = process.env[`AUDIT_SESSION_${role.toUpperCase()}`];
  if (!file) return null;
  const s = JSON.parse(fs.readFileSync(file, "utf8"));
  return { name: process.env.AUDIT_COOKIE ?? "sb-auth-token", value: "base64-" + Buffer.from(JSON.stringify(s)).toString("base64url"), url: BASE };
};

/** Se ejecuta dentro de la página. */
function inspect() {
  const vw = window.innerWidth;
  const sw = document.documentElement.scrollWidth;
  const wide = [];
  if (sw > vw + 1)
    for (const n of document.querySelectorAll("body *")) {
      const r = n.getBoundingClientRect();
      if (r.width && r.right > vw + 1 && getComputedStyle(n).position !== "fixed" && !n.closest(".table-wrap,.board,.lab-board,.carousel-track,[data-scroll]"))
        wide.push(`${n.tagName.toLowerCase()}.${[...n.classList].join(".")}`);
    }
  const box = (n) => {
    const r = n.getBoundingClientRect();
    const cs = getComputedStyle(n);
    return r.width > 2 && r.height > 2 && cs.visibility !== "hidden" && cs.opacity !== "0" && !n.closest(".sheet:not(.open), .mega:not(.open)") ? r : null;
  };
  const icons = [...document.querySelectorAll("svg, .stage-icon")].filter((n) => !n.closest("button, .btn, .pill, .badge, select, label")).map((n) => [n, box(n)]).filter(([, r]) => r);
  const texts = [...document.querySelectorAll("h1,h2,h3,h4,p,strong,small,li")].map((n) => [n, box(n)]).filter(([, r]) => r);
  const overlaps = [];
  for (const [i, ri] of icons)
    for (const [t] of texts) {
      if (t.contains(i) || i.contains(t)) continue;
      const range = document.createRange();
      range.selectNodeContents(t);
      for (const rr of range.getClientRects()) {
        const ox = Math.min(ri.right, rr.right) - Math.max(ri.left, rr.left);
        const oy = Math.min(ri.bottom, rr.bottom) - Math.max(ri.top, rr.top);
        if (ox > 3 && oy > 3) { overlaps.push(`ícono sobre "${t.textContent.trim().slice(0, 40)}"`); break; }
      }
    }
  return { vw, sw, wide: [...new Set(wide)].slice(0, 5), overlaps: [...new Set(overlaps)].slice(0, 5), h1: document.querySelectorAll("h1").length };
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const results = [];
for (const [role, paths] of Object.entries(PAGES)) {
  const cookie = role === "anon" ? null : sessionCookie(role);
  if (role !== "anon" && !cookie) { console.log(`· ${role}: sin AUDIT_SESSION_${role.toUpperCase()}, se omite`); continue; }
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 860 }, colorScheme: process.env.DARK ? "dark" : "light" });
    if (cookie) await ctx.addCookies([cookie]);
    for (const p of paths) {
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
      page.on("console", (m) => m.type() === "error" && !/404/.test(m.text()) && errors.push(m.text().slice(0, 160)));
      let status = 0;
      try { status = (await page.goto(BASE + p, { waitUntil: "networkidle", timeout: 45000 }))?.status() ?? 0; } catch (e) { errors.push("No cargó: " + e.message.slice(0, 80)); }
      if (ZOOM) await page.addStyleTag({ content: `html{font-size:${ZOOM}% !important}` });
      // Las secciones aparecen al hacer scroll: se muestran todas para revisarlas.
      await page.evaluate(() => document.querySelectorAll(".will-reveal").forEach((n) => n.classList.add("is-in")));
      await page.waitForTimeout(800);
      const geo = await page.evaluate(inspect);
      await page.addScriptTag({ content: AXE });
      const axe = await page.evaluate(async () =>
        (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] }, resultTypes: ["violations"] })).violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, where: v.nodes.slice(0, 2).map((n) => n.target.join(" ")) })),
      );
      const final = page.url().replace(BASE, "");
      const shot = `${role}-${width}-${p.replace(/[^a-z0-9]+/gi, "_").slice(0, 50) || "home"}.png`;
      await page.screenshot({ path: path.join(OUT, "shots", shot), fullPage: true });
      const issues = [
        ...(status >= 500 ? [`HTTP ${status}`] : []),
        ...(role !== "anon" && final.startsWith("/login") ? ["La sesión no fue aceptada (cayó en /login)"] : []),
        ...errors.map((e) => `Error: ${e}`),
        ...(geo.sw > geo.vw + 1 ? [`Desborde horizontal: ${geo.sw}px en pantalla de ${geo.vw}px (${geo.wide.join(", ")})`] : []),
        ...geo.overlaps.map((o) => `Superposición: ${o}`),
        ...(geo.h1 !== 1 ? [`La página tiene ${geo.h1} <h1> (debe tener 1)`] : []),
        ...axe.map((v) => `Accesibilidad [${v.impact}] ${v.help} → ${v.where.join(" · ")}`),
      ];
      results.push({ role, width, path: p, final, status, issues, shot });
      console.log(`${issues.length ? "✗" : "✓"} ${role} ${width}px ${p}${issues.length ? `\n    ${issues.join("\n    ")}` : ""}`);
      await page.close();
    }
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, "report.json"), JSON.stringify(results, null, 2));
const bad = results.filter((r) => r.issues.length);
console.log(`\n${results.length} pantallas revisadas · ${bad.length} con problemas · capturas en ${path.relative(process.cwd(), OUT)}/shots`);
process.exit(bad.length ? 1 : 0);
