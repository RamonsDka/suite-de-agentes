import { describe, expect, it, vi } from "vitest";
import { initialNavState, reduceNav, type NavState } from "../src/tui/agent-suite-nav.ts";
import { EffortSelect, effortSelectionOptions } from "../src/tui/screens/effort-select.tsx";
import { ModelSelect, modelSelectionOptions } from "../src/tui/screens/model-select.tsx";
import { applyEffortSelection, applyModelSelection } from "../src/tui/agent-suite-app.tsx";
import type { AgentSuiteController } from "../src/tui/agent-suite-controller.ts";
import { buildAgentModelOptions, buildAgentVariantOptions, buildRuntimeModelOptions } from "../src/tui/index.tsx";

const row = { id: "general", membership: "seed" as const, enabled: true, model: "anthropic/sonnet", variant: "high", skills: [], consent: "explicit-current-turn" as const };
const state: NavState = { stack: [{ kind: "landing", focus: 0 }, { kind: "info", agentId: row.id, focus: 0 }, { kind: "modify", agentId: row.id, focus: 0, edit: { mode: "menu" } }, { kind: "model", agentId: row.id, focus: 0 }], busy: false, closing: false };

function controller(): AgentSuiteController & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    snapshot: () => ({ rows: [row], version: "1.0.1" }),
    refresh: () => calls.push("refresh"),
    createAgent: async () => undefined,
    deleteAgent: async () => undefined,
    materialize: async () => undefined,
    setModel: async () => { calls.push("model"); },
    setEffort: async () => { calls.push("effort"); },
    setSkills: async () => undefined,
    setOperations: async () => undefined,
  };
}

describe("Agent Suite model and effort screens", () => {
  it("builds bounded model and normalized effort options", () => {
    expect(modelSelectionOptions(["openai/gpt-5", "anthropic/claude-sonnet"])).toEqual([
      { title: "openai/gpt-5", value: "openai/gpt-5" },
      { title: "anthropic/claude-sonnet", value: "anthropic/claude-sonnet" },
    ]);
    expect(effortSelectionOptions(["x-high", "low", "unknown"])).toEqual(["default", "low", "xhigh"]);
    expect(ModelSelect).toBeTypeOf("function");
    expect(EffortSelect).toBeTypeOf("function");
  });

  it("passes runtime catalogs through helpers without inventing a model", () => {
    const api = { state: { provider: [{ id: "anthropic", name: "Anthropic", models: { sonnet: { id: "sonnet", name: "Claude Sonnet" }, haiku: { id: "haiku", name: "Claude Haiku" } } }] } } as never;
    const runtime = buildRuntimeModelOptions(api);
    expect(runtime.map(({ value }) => value)).toEqual(["anthropic/sonnet", "anthropic/haiku"]);
    expect(buildAgentModelOptions({ ...row, model: "anthropic/sonnet" }, runtime)[0]).toMatchObject({ value: "anthropic/sonnet", title: "✓ Claude Sonnet" });
    expect(buildAgentVariantOptions({ ...row, model: "anthropic/sonnet", variant: undefined }, "anthropic/sonnet", ["low", "x-high"]).map(({ value }) => value)).toEqual(["", "low", "xhigh"]);
    expect(buildRuntimeModelOptions({ state: { provider: [] } } as never)).toEqual([]);
  });

  it("persists a selection, refreshes, and pops back to modify", async () => {
    const fake = controller();
    const dispatch = vi.fn();
    const busy: boolean[] = [];
    await applyModelSelection(fake, row.id, "anthropic/claude-sonnet", dispatch, (value) => busy.push(value));
    await applyEffortSelection(fake, row.id, "high", dispatch, (value) => busy.push(value));
    expect(fake.calls).toEqual(["model", "refresh", "effort", "refresh"]);
    expect(busy).toEqual([true, false, true, false]);
    expect(dispatch).toHaveBeenNthCalledWith(1, { type: "SELECT_MODEL", model: "anthropic/claude-sonnet" });
    expect(dispatch).toHaveBeenNthCalledWith(2, { type: "SELECT_EFFORT", effort: "high" });
    expect(reduceNav(state, { type: "SELECT_MODEL", model: "anthropic/claude-sonnet" }).stack.at(-1)?.kind).toBe("modify");
  });
});
