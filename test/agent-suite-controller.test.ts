import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAgentSuiteController } from "../src/tui/agent-suite-controller.ts";
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
    expect(Object.keys(controller)).toEqual(["snapshot", "refresh", "createAgent", "deleteAgent", "materialize", "setModel", "setEffort", "setSkills", "setOperations", "operations"]);
  });

  it("builds the initial snapshot from persisted and runtime agents", () => {
    const path = join(mkdtempSync(join(tmpdir(), "agent-suite-controller-")), "suites.json");
    writeFileSync(path, JSON.stringify({ version: 1, customAgents: { "smoke-custom": { id: "smoke-custom", description: "Smoke custom", model: "openai/gpt-5", prompt: "Smoke", permissions: { read: "allow" }, skills: [] } }, modelAssignments: {}, variantAssignments: {} }));
    const controller = createAgentSuiteController([], "1.0.1", { path, runtime: { general: { model: "openai/gpt-5" }, "smoke-custom": { model: "openai/gpt-5" } } });
    expect(controller.snapshot().rows.map(({ id }) => id)).toEqual(["agent-especialit-github", "general", "smoke-custom"]);
  });
});
