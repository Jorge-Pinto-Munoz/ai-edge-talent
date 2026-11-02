import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { officeText } from "@/lib/journey/office-text";
import { suggestedVerdict } from "@/lib/journey/ai-verdict";

describe("revisión con IA de entregas", () => {
  it("extrae el texto de un PowerPoint en orden de diapositivas", async () => {
    const z = new JSZip();
    const slide = (t: string[]) => `<p:sld><p:cSld><p:spTree>${t.map((x) => `<a:p><a:r><a:t>${x}</a:t></a:r></a:p>`).join("")}</p:spTree></p:cSld></p:sld>`;
    z.file("ppt/slides/slide10.xml", slide(["Hito 10"]));
    z.file("ppt/slides/slide2.xml", slide(["Fricción &amp; causa", "Prueba"]));
    z.file("ppt/slides/slide1.xml", slide(["Mi actividad"]));
    const text = await officeText("canvas.pptx", await z.generateAsync({ type: "arraybuffer" }));
    expect(text).toBe("--- Diapositiva 1 ---\nMi actividad\n\n--- Diapositiva 2 ---\nFricción & causa\nPrueba\n\n--- Diapositiva 3 ---\nHito 10");
  });
  it("extrae el texto de un Word", async () => {
    const z = new JSZip();
    z.file("word/document.xml", `<w:document><w:body><w:p><w:r><w:t>Hola</w:t></w:r><w:r><w:t xml:space="preserve"> mundo</w:t></w:r></w:p></w:body></w:document>`);
    expect(await officeText("a.docx", await z.generateAsync({ type: "arraybuffer" }))).toBe("Hola mundo");
  });
  it("sugerencia: umbral + ningún criterio en «no»; ilegible → revisión humana", () => {
    const c = (m: "si" | "parcial" | "no") => ({ met: m });
    expect(suggestedVerdict({ readable: true, score: 80, threshold: 75, criteria: [c("si"), c("parcial")] })).toBe("APPROVED");
    expect(suggestedVerdict({ readable: true, score: 90, threshold: 75, criteria: [c("si"), c("no")] })).toBe("NOT_APPROVED");
    expect(suggestedVerdict({ readable: true, score: 70, threshold: 75, criteria: [c("si")] })).toBe("NOT_APPROVED");
    expect(suggestedVerdict({ readable: false, score: 0, threshold: 75, criteria: [] })).toBe("HUMAN_REVIEW");
  });
});
