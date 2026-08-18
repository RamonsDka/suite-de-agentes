import { describe, expect, it, vi } from "vitest";
import { buildDenyAllToolMap, createCoordinatorSession, createCoordinatorSessionFromClient } from "../src/tui/ai/coordinator-session.ts";

const coordinator = { provider: "openai", model: "gpt-5", effort: "high" };

describe("Coordinator SDK session adapter", () => {
  it("builds an explicit deny map for the complete built-in and dynamic MCP inventory", () => {
    expect(buildDenyAllToolMap(["read", "write", "bash", "mcp.github.search", "mcp.browser.navigate"])).toEqual({
      read: false,
      write: false,
      bash: false,
      "mcp.github.search": false,
      "mcp.browser.navigate": false,
    });
  });

  it("rejects absent, empty, duplicate, and malformed inventories instead of treating a bare map as tool-less", () => {
    expect(() => buildDenyAllToolMap([])).toThrow(/complete tool inventory/i);
    expect(() => buildDenyAllToolMap(["read", "read"])).toThrow(/complete tool inventory/i);
    expect(() => buildDenyAllToolMap(["read", ""])).toThrow(/complete tool inventory/i);
    expect(() => buildDenyAllToolMap(["read", " mcp.github.search"])).toThrow(/complete tool inventory/i);
  });

  it("preserves unusual dynamic MCP identifiers without using an inherited object map", () => {
    const denyMap = buildDenyAllToolMap(["mcp.server.__proto__"]);

    expect(Object.getPrototypeOf(denyMap)).toBeNull();
    expect(denyMap["mcp.server.__proto__"]).toBe(false);
  });

  it("uses the supplied base URL and denies every reported tool before it prompts", async () => {
    const createClient = vi.fn(() => ({
      tool: { ids: vi.fn(async () => ({ data: ["read", "mcp.github.search"] })) },
      session: {
        create: vi.fn(async () => ({ data: { id: "coordinator-session" } })),
        prompt: vi.fn(async (input: { body: { tools: Record<string, boolean> } }) => ({ data: { parts: [{ type: "text", text: "Draft" }], info: {} } })),
        abort: vi.fn(async () => ({ data: true })),
      },
    }));
    const session = createCoordinatorSession({ baseUrl: "http://127.0.0.1:4096", createClient });

    await expect(session.prompt({ system: "System", message: "Message", coordinator, signal: new AbortController().signal })).resolves.toBe("Draft");

    expect(createClient).toHaveBeenCalledWith("http://127.0.0.1:4096/");
    const client = createClient.mock.results[0]?.value;
    expect(client.tool.ids).toHaveBeenCalledBefore(client.session.create);
    expect(client.session.prompt).toHaveBeenCalledWith(expect.objectContaining({
      path: { id: "coordinator-session" },
      body: expect.objectContaining({
        model: { providerID: "openai", modelID: "gpt-5" },
        tools: { read: false, "mcp.github.search": false },
      }),
    }));
  });

  it("fails closed before session creation or prompting when the SDK cannot prove a complete inventory", async () => {
    const prompt = vi.fn();
    const create = vi.fn();
    const session = createCoordinatorSession({
      baseUrl: "http://127.0.0.1:4096",
      createClient: () => ({ tool: { ids: async () => ({ data: undefined }) }, session: { create, prompt, abort: vi.fn() } }),
    });

    await expect(session.prompt({ system: "System", message: "Message", coordinator, signal: new AbortController().signal })).rejects.toThrow(/complete tool inventory/i);
    expect(create).not.toHaveBeenCalled();
    expect(prompt).not.toHaveBeenCalled();
  });

  it("requires an explicit usable base URL and stops an already-cancelled prompt before it reaches the SDK", async () => {
    expect(() => createCoordinatorSession({ baseUrl: "", createClient: vi.fn() })).toThrow(/base url/i);
    expect(() => createCoordinatorSession({ baseUrl: "ftp://127.0.0.1:4096", createClient: vi.fn() })).toThrow(/base url/i);
    const createClient = vi.fn();
    const session = createCoordinatorSession({ baseUrl: "http://127.0.0.1:4096", createClient });
    const controller = new AbortController();
    controller.abort();

    await expect(session.prompt({ system: "System", message: "Message", coordinator, signal: controller.signal })).rejects.toThrow(/cancel/i);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("aborts the ephemeral session when cancellation occurs after creation", async () => {
    const controller = new AbortController();
    const abort = vi.fn(async () => ({ data: true }));
    const session = createCoordinatorSession({
      baseUrl: "http://127.0.0.1:4096",
      createClient: () => ({
        tool: { ids: async () => ({ data: ["read", "mcp.github.search"] }) },
        session: {
          create: async () => ({ data: { id: "coordinator-session" } }),
          prompt: async () => { controller.abort(); return { data: { parts: [{ type: "text", text: "Draft" }], info: {} } }; },
          abort,
        },
      }),
    });

    await expect(session.prompt({ system: "System", message: "Message", coordinator, signal: controller.signal })).rejects.toThrow(/cancel/i);
    expect(abort).toHaveBeenCalledWith({ path: { id: "coordinator-session" } });
  });

  it("adapts the mounted host client directly instead of requiring a second base-URL client", async () => {
    const prompt = vi.fn(async () => ({ data: { parts: [{ type: "text", text: "Draft" }] } }));
    const client = {
      tool: { ids: vi.fn(async () => ({ data: ["read"] })) },
      session: { create: vi.fn(async () => ({ data: { id: "coordinator-session" } })), prompt, abort: vi.fn() },
    };

    await expect(createCoordinatorSessionFromClient(client).prompt({ system: "System", message: "Message", coordinator, signal: new AbortController().signal })).resolves.toBe("Draft");
    expect(prompt).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ tools: { read: false } }) }));
  });
});
