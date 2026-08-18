import { describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAgentSuiteController } from "../src/tui/agent-suite-controller.ts";
import { globalAgentPath, materializeGlobalAgent } from "../src/core/agents.ts";
import { loadSuiteConfig, saveSuiteConfig } from "../src/core/persistence.ts";
import type { CreateDraft } from "../src/tui/agent-suite-nav.ts";
import type { AgentCatalogRow } from "../src/core/types.ts";

const row: AgentCatalogRow = { id: "custom", membership: "custom", enabled: false, skills: ["testing"], consent: "explicit-current-turn" };
const draft: CreateDraft = { id: "new-agent", description: "New agent", skills: ["testing"], operations: "Review", model: "openai/gpt-5", effort: "high" };

describe("Agent Suite controller adapter", () => {
  it("exposes a defensive snapshot and keeps operations behind the adapter boundary", async () => {
    const controller = createAgentSuiteController([row]);
    const snapshot = controller.snapshot();
    snapshot.rows.find((item) => item.id === row.id)?.skills.push("mutated");
    expect(controller.snapshot().rows.find((item) => item.id === row.id)?.skills).toEqual(["testing"]);
    await controller.setSkills(row.id, ["github"]);
    await controller.setOperations(row.id, "Updated");
    await controller.createAgent(draft);
    expect(controller.snapshot().rows.some((item) => item.id === draft.id)).toBe(true);
  });

  it("supports explicit operation method names for every mutation", () => {
    const controller = createAgentSuiteController();
    expect(Object.keys(controller)).toEqual(["snapshot", "refresh", "createAgent", "deleteAgent", "materialize", "setModel", "setEffort", "setSkills", "setOperations", "patchAgent", "operations"]);
  });

  it("builds the initial snapshot from persisted and runtime agents", () => {
    const path = join(mkdtempSync(join(tmpdir(), "agent-suite-controller-")), "suites.json");
    writeFileSync(path, JSON.stringify({ version: 1, customAgents: { "smoke-custom": { id: "smoke-custom", description: "Smoke custom", model: "openai/gpt-5", prompt: "Smoke", permissions: { read: "allow" }, skills: [] } }, modelAssignments: {}, variantAssignments: {} }));
    const controller = createAgentSuiteController([], "1.0.1", { path, runtime: { general: { model: "openai/gpt-5" }, "smoke-custom": { model: "openai/gpt-5" } } });
    expect(controller.snapshot().rows.map(({ id }) => id)).toEqual(["agent-especialit-github", "general", "smoke-custom"]);
  });

  it("commits a custom patch, persists it, migrates its materialized file, and rebuilds", async () => {
    const home = mkdtempSync(join(tmpdir(), "agent-suite-controller-home-"));
    const path = join(mkdtempSync(join(tmpdir(), "agent-suite-controller-")), "suites.json");
    const agent = { id: "old-agent", description: "Old", model: "openai/x", prompt: "Do work.", permissions: { read: "allow" as const }, skills: ["testing"] };
    saveSuiteConfig(path, { version: 1, customAgents: { "old-agent": agent }, modelAssignments: { "old-agent": "openai/assigned" }, variantAssignments: { "old-agent": "high" } });
    materializeGlobalAgent(agent, () => true, home);
    const controller = createAgentSuiteController([], "1.0.1", { path, home, runtime: { "old-agent": { model: agent.model } } });

    await controller.patchAgent!("old-agent", { newId: "new-agent", description: "Updated", skills: ["linting"] });

    expect(loadSuiteConfig(path)).toEqual({
      version: 1,
      customAgents: { "new-agent": { ...agent, id: "new-agent", description: "Updated", skills: ["linting"] } },
      modelAssignments: { "new-agent": "openai/assigned" },
      variantAssignments: { "new-agent": "high" },
    });
    expect(controller.snapshot().rows.some((row) => row.id === "new-agent")).toBe(true);
    expect(controller.snapshot().rows.some((row) => row.id === "old-agent")).toBe(false);
    expect(existsSync(globalAgentPath("old-agent", home))).toBe(false);
    expect(readFileSync(globalAgentPath("new-agent", home), "utf8")).toContain("name: new-agent");
  });

  it("rolls back persisted identity and materialized files when migration fails", async () => {
    const home = mkdtempSync(join(tmpdir(), "agent-suite-controller-home-"));
    const path = join(mkdtempSync(join(tmpdir(), "agent-suite-controller-")), "suites.json");
    const persistedAgent = { id: "old-agent", description: "Old", model: "openai/x", prompt: "Do work.", permissions: { read: "allow" as const }, skills: [] };
    const controllerAgent = { ...persistedAgent, prompt: "" };
    saveSuiteConfig(path, { version: 1, customAgents: { "old-agent": controllerAgent }, modelAssignments: {}, variantAssignments: {} });
    materializeGlobalAgent(persistedAgent, () => true, home);
    const controller = createAgentSuiteController([], "1.0.1", { path, home, runtime: { "old-agent": { model: persistedAgent.model } } });

    await expect(controller.patchAgent!("old-agent", { newId: "new-agent" })).rejects.toThrow(/requires model and prompt/i);

    expect(loadSuiteConfig(path).customAgents).toEqual({ "old-agent": controllerAgent });
    expect(controller.snapshot().rows.some((row) => row.id === "old-agent")).toBe(true);
    expect(controller.snapshot().rows.some((row) => row.id === "new-agent")).toBe(false);
    expect(existsSync(globalAgentPath("old-agent", home))).toBe(true);
    expect(existsSync(globalAgentPath("new-agent", home))).toBe(false);
  });

  it("does not leave both registry identities active after a failed migration", async () => {
    const home = mkdtempSync(join(tmpdir(), "agent-suite-controller-home-"));
    const path = join(mkdtempSync(join(tmpdir(), "agent-suite-controller-")), "suites.json");
    const agent = { id: "old-agent", description: "Old", model: "openai/x", prompt: "Do work.", permissions: { read: "allow" as const }, skills: [] };
    saveSuiteConfig(path, { version: 1, customAgents: { "old-agent": agent }, modelAssignments: {}, variantAssignments: {} });
    materializeGlobalAgent(agent, () => true, home);
    const controller = createAgentSuiteController([], "1.0.1", { path, home, runtime: { "old-agent": { model: agent.model } } });

    await expect(controller.patchAgent!("old-agent", { newId: "new-agent", operations: "" })).rejects.toThrow(/requires model and prompt/i);

    const saved = loadSuiteConfig(path);
    expect(Object.keys(saved.customAgents)).toEqual(["old-agent"]);
    expect(existsSync(globalAgentPath("old-agent", home))).toBe(true);
    expect(existsSync(globalAgentPath("new-agent", home))).toBe(false);
  });

  it("restores the original materialized file when rebuild fails after migration", async () => {
    const home = mkdtempSync(join(tmpdir(), "agent-suite-controller-home-"));
    const path = join(mkdtempSync(join(tmpdir(), "agent-suite-controller-")), "suites.json");
    const agent = { id: "old-agent", description: "Old", model: "openai/x", prompt: "Do work.", permissions: { read: "allow" as const }, skills: [] };
    saveSuiteConfig(path, { version: 1, customAgents: { "old-agent": agent }, modelAssignments: {}, variantAssignments: {} });
    materializeGlobalAgent(agent, () => true, home);
    const originalFile = readFileSync(globalAgentPath("old-agent", home), "utf8");
    const runtime = Object.create(null) as Record<string, { model?: string }>;
    Object.defineProperty(runtime, "new-agent", { get: () => { throw new Error("rebuild failed"); } });
    const controller = createAgentSuiteController([], "1.0.1", { path, home, runtime });

    await expect(controller.patchAgent!("old-agent", { newId: "new-agent" })).rejects.toThrow("rebuild failed");

    expect(loadSuiteConfig(path).customAgents).toEqual({ "old-agent": agent });
    expect(readFileSync(globalAgentPath("old-agent", home), "utf8")).toBe(originalFile);
    expect(existsSync(globalAgentPath("new-agent", home))).toBe(false);
  });

  it("rejects assignment-map destination collisions before persisting or migrating", async () => {
    const home = mkdtempSync(join(tmpdir(), "agent-suite-controller-home-"));
    const path = join(mkdtempSync(join(tmpdir(), "agent-suite-controller-")), "suites.json");
    const agent = { id: "old-agent", description: "Old", model: "openai/x", prompt: "Do work.", permissions: { read: "allow" as const }, skills: [] };
    saveSuiteConfig(path, { version: 1, customAgents: { "old-agent": agent }, modelAssignments: { "reserved-agent": "openai/reserved" }, variantAssignments: {} });
    materializeGlobalAgent(agent, () => true, home);
    const before = readFileSync(path, "utf8");
    const controller = createAgentSuiteController([], "1.0.1", { path, home, runtime: { "old-agent": { model: agent.model } } });

    await expect(controller.patchAgent!("old-agent", { newId: "reserved-agent" })).rejects.toThrow(/collision|colisi[oó]n/i);

    expect(readFileSync(path, "utf8")).toBe(before);
    expect(existsSync(globalAgentPath("old-agent", home))).toBe(true);
    expect(existsSync(globalAgentPath("reserved-agent", home))).toBe(false);
  });
});
