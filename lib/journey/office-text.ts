import JSZip from "jszip";

const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const runs = (xml: string, tag: string) => [...xml.matchAll(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "g"))].map((m) => decode(m[1]));
const paragraphs = (xml: string, p: string, t: string) => [...xml.matchAll(new RegExp(`<${p}[ >][\\s\\S]*?</${p}>`, "g"))].map((m) => runs(m[0], t).join("")).filter((x) => x.trim());
const byNumber = (a: string, b: string) => Number(a.match(/(\d+)\.xml$/)?.[1] ?? 0) - Number(b.match(/(\d+)\.xml$/)?.[1] ?? 0);

/** Texto de un PowerPoint, Word o Excel (Office abierto). */
export async function officeText(name: string, bytes: ArrayBuffer): Promise<string | null> {
  const ext = name.toLowerCase().split(".").pop();
  const zip = await JSZip.loadAsync(bytes);
  if (ext === "pptx") {
    const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f)).sort(byNumber);
    const out: string[] = [];
    for (const [i, f] of slides.entries()) out.push(`--- Diapositiva ${i + 1} ---\n${paragraphs(await zip.file(f)!.async("string"), "a:p", "a:t").join("\n")}`);
    return out.join("\n\n");
  }
  if (ext === "docx") {
    const doc = zip.file("word/document.xml");
    return doc ? paragraphs(await doc.async("string"), "w:p", "w:t").join("\n") : null;
  }
  if (ext === "xlsx") {
    const shared = zip.file("xl/sharedStrings.xml");
    const strings = shared ? runs(await shared.async("string"), "t") : [];
    const inline: string[] = [];
    for (const f of Object.keys(zip.files).filter((x) => /^xl\/worksheets\/sheet\d+\.xml$/.test(x)).sort(byNumber)) inline.push(...runs(await zip.file(f)!.async("string"), "t"));
    return [...strings, ...inline].join("\n");
  }
  return null;
}
