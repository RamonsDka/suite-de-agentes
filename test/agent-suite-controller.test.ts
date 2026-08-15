import { describe, expect, it } from "vitest";
import { createAgentSuiteController } from "../src/tui/agent-suite-controller.ts";
import type { CreateDraft } from "../src/tui/agent-suite-nav.ts";
import type { AgentCatalogRow } from "../src/core/types.ts";

const row: AgentCatalogRow = { id: "custom", membership: "custom", enabled: false, skills: ["testing"], consent: "explicit-current-turn" };
const draft: CreateDraft = { id: "new-agent", description: "New agent", skills: ["testing"], operations: "Review", model: "openai/gpt-5", effort: "high" };

describe("Agent Suite controller adapter", () => {
  it("exposes a defensive snapshot and keeps operations behind the adapter boundary", async () => {
    const controller = createAgentSuiteController([row]);
    const snapshot = controller.snapshot();
    snapshot.rows[0].skills.push("mutated");
    expect(controller.snapshot().rows[0].skills).toEqual(["testing"]);
    await controller.setSkills(row.id, ["github"]);
    await controller.setOperations(row.id, "Updated");
    await controller.createAgent(draft);
    expect(controller.snapshot().rows.some((item) => item.id === draft.id)).toBe(true);
  });

  it("supports explicit operation method names for every mutation", () => {
    const controller = createAgentSuiteController();
    expect(Object.keys(controller)).toEqual(["snapshot", "refresh", "createAgent", "deleteAgent", "materialize", "setModel", "setEffort", "setSkills", "setOperations", "operations"]);
  });
});
