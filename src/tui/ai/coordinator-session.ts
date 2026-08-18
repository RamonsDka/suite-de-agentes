import { createOpencodeClient } from "@opencode-ai/sdk/client";
import type { CoordinatorSession } from "../../core/coordinator.ts";

type ToolInventoryClient = {
  tool: { ids(): Promise<{ data?: unknown }> };
  session: {
    create(): Promise<{ data?: { id?: unknown } }>;
    prompt(input: { path: { id: string }; body: { model: { providerID: string; modelID: string }; system: string; tools: Record<string, false>; parts: Array<{ type: "text"; text: string }> } }): Promise<{ data?: { parts?: Array<{ type?: unknown; text?: unknown }> } }>;
    abort(input: { path: { id: string } }): Promise<unknown>;
  };
};

export type CoordinatorClientFactory = (baseUrl: string) => ToolInventoryClient;

function invalidInventory(): Error {
  return new Error("A complete tool inventory is required to prove tool-less execution.");
}

export function buildDenyAllToolMap(inventory: readonly string[]): Record<string, false> {
  if (inventory.length === 0) throw invalidInventory();
  const map: Record<string, false> = Object.create(null) as Record<string, false>;
  for (const toolName of inventory) {
    if (typeof toolName !== "string" || !toolName || toolName.trim() !== toolName || Object.hasOwn(map, toolName)) throw invalidInventory();
    map[toolName] = false;
  }
  return map;
}

function sdkClient(baseUrl: string): ToolInventoryClient {
  return createOpencodeClient({ baseUrl }) as unknown as ToolInventoryClient;
}

function requiredBaseUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("unsupported protocol");
    return url.toString();
  } catch {
    throw new Error("A usable OpenCode base URL is required for coordinator sessions.");
  }
}

function textResponse(parts: readonly { type?: unknown; text?: unknown }[] | undefined): string {
  const text = parts?.filter((part) => part.type === "text" && typeof part.text === "string").map((part) => part.text).join("") ?? "";
  if (!text) throw new Error("Coordinator session returned no text response.");
  return text;
}

export function createCoordinatorSession(options: { baseUrl: string; createClient?: CoordinatorClientFactory }): CoordinatorSession {
  const baseUrl = requiredBaseUrl(options.baseUrl);
  const factory = options.createClient ?? sdkClient;
  return coordinatorSessionFromClient(() => factory(baseUrl));
}

export function createCoordinatorSessionFromClient(client: ToolInventoryClient): CoordinatorSession {
  return coordinatorSessionFromClient(() => client);
}

function coordinatorSessionFromClient(getClient: () => ToolInventoryClient): CoordinatorSession {
  return {
    async prompt(input) {
      if (input.signal.aborted) throw new Error("Coordinator prompt was cancelled before it started.");
      const client = getClient();
      const inventory = await client.tool.ids();
      if (!Array.isArray(inventory.data)) throw invalidInventory();
      const tools = buildDenyAllToolMap(inventory.data);
      if (input.signal.aborted) throw new Error("Coordinator prompt was cancelled before session creation.");
      const created = await client.session.create();
      if (!created.data || typeof created.data.id !== "string" || !created.data.id) throw new Error("Coordinator session creation failed.");
      const sessionID = created.data.id;
      const abort = () => { void client.session.abort({ path: { id: sessionID } }); };
      input.signal.addEventListener("abort", abort, { once: true });
      try {
        if (input.signal.aborted) throw new Error("Coordinator prompt was cancelled before it was sent.");
        const response = await client.session.prompt({
          path: { id: sessionID },
          body: {
            model: { providerID: input.coordinator.provider, modelID: input.coordinator.model },
            system: input.system,
            tools,
            parts: [{ type: "text", text: input.message }],
          },
        });
        if (input.signal.aborted) throw new Error("Coordinator prompt was cancelled.");
        const text = textResponse(response.data?.parts);
        input.onProgress?.(text);
        return text;
      } finally {
        input.signal.removeEventListener("abort", abort);
      }
    },
  };
}
