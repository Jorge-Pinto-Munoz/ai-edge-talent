import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

const ok = { id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5", content: [{ type: "text", text: "OK" }], stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 } };

async function callWith(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v as string);
  const seen: Headers[] = [];
  vi.stubGlobal("fetch", vi.fn(async (_url: unknown, init: RequestInit) => { seen.push(new Headers(init.headers)); return new Response(JSON.stringify(ok), { status: 200, headers: { "content-type": "application/json" } }); }));
  const { anthropic } = await import("@/lib/ai/client");
  await anthropic().messages.create({ model: "claude-opus-5-5", max_tokens: 8, messages: [{ role: "user", content: "hola" }] });
  return seen[0];
}

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("cliente de Claude", () => {
  it("con ANTHROPIC_WORKSPACE_ID envía el encabezado del workspace", async () => {
    const h = await callWith({ ANTHROPIC_API_KEY: " sk-ant-prueba ", ANTHROPIC_WORKSPACE_ID: "wrkspc_prueba" });
    expect(h.get("anthropic-workspace-id")).toBe("wrkspc_prueba");
    expect(h.get("x-api-key")).toBe("sk-ant-prueba");
  });
  it("sin workspace no envía el encabezado", async () => {
    const h = await callWith({ ANTHROPIC_API_KEY: "sk-ant-prueba", ANTHROPIC_WORKSPACE_ID: "" });
    expect(h.get("anthropic-workspace-id")).toBeNull();
  });
  it("explica en español el error de llave sin workspace y otros comunes", async () => {
    const { aiErrorMessage } = await import("@/lib/ai/client");
    const ws = Object.assign(new Error('400 {"type":"error","error":{"type":"invalid_request_error","message":"This API key is not scoped to a workspace, so this request must include the anthropic-workspace-id header"}}'), { status: 400 });
    expect(aiErrorMessage(ws)).toMatch(/workspace.*ANTHROPIC_WORKSPACE_ID/);
    expect(aiErrorMessage(Object.assign(new Error("401 invalid x-api-key"), { status: 401 }))).toMatch(/no es válida/);
    expect(aiErrorMessage(Object.assign(new Error("400 Your credit balance is too low"), { status: 400 }))).toMatch(/saldo/);
    expect(aiErrorMessage({ message: "fallo de base" })).toBe("fallo de base");
  });
});
