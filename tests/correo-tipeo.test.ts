import { describe, expect, it } from "vitest";
import { suggestEmail } from "@/lib/identity/email-typo";

describe("suggestEmail", () => {
  it("corrige dominios casi iguales", () => {
    expect(suggestEmail("jorge.pintom@kibenrum.com")).toBe("jorge.pintom@kibernum.com");
    expect(suggestEmail("ana@kibernun.com")).toBe("ana@kibernum.com");
    expect(suggestEmail("ana@gmial.com")).toBe("ana@gmail.com");
  });
  it("no toca correos correctos ni dominios distintos", () => {
    expect(suggestEmail("jorge.pintom@kibernum.com")).toBeNull();
    expect(suggestEmail("ana@cliente-demo.cl")).toBeNull();
    expect(suggestEmail("incompleto@")).toBeNull();
  });
});
