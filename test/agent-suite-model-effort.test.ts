import { describe, expect, it, vi } from "vitest";
import { reduceNav, type NavState } from "../src/tui/agent-suite-nav.ts";
import { EffortSelect, effortSelectionOptions, effortSelectionRows } from "../src/tui/screens/effort-select.tsx";
import { MODEL_EMPTY_MESSAGE, ModelSelect, modelSelectionCue, modelSelectionOptions, modelSelectionRows, providerModelOptions, providerSelectionOptions } from "../src/tui/screens/model-select.tsx";
import { applyModelAssignment, eventForKey } from "../src/tui/agent-suite-app.tsx";
import { buildAgentModelOptions, buildAgentVariantOptions, buildRuntimeModelOptions } from "../src/tui/index.tsx";
import { selectionErrorPresentation } from "../src/tui/visual-primitives.tsx";

const row = { id: "general", membership: "seed" as const, enabled: true, model: "anthropic/sonnet", variant: "high", skills: [], consent: "explicit-current-turn" as const };
const state: NavState = { stack: [{ kind: "catalog", page: 0, focus: 0, query: "", searchFocused: false }, { kind: "info", agentId: row.id, focus: 0 }, { kind: "provider", agentId: row.id, focus: 0 }, { kind: "model", agentId: row.id, provider: "anthropic", focus: 0 }], busy: false, closing: false };

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

  it("keeps shared selectable-row presentation data and the Spanish empty-model state", () => {
    expect(modelSelectionRows(modelSelectionOptions(["openai/gpt-5", "anthropic/claude-sonnet"]), 1)).toEqual([
      { title: "openai/gpt-5", value: "openai/gpt-5", selected: false },
      { title: "anthropic/claude-sonnet", value: "anthropic/claude-sonnet", selected: true },
    ]);
    expect(effortSelectionRows(["x-high", "low"], 2)).toEqual([
      { value: "default", selected: false },
      { value: "low", selected: false },
      { value: "xhigh", selected: true },
    ]);
    expect(MODEL_EMPTY_MESSAGE).toBe("No hay modelos disponibles.");
  });

  it("keeps the effective model marker independent from keyboard focus", () => {
    const options = modelSelectionOptions(["openai/gpt-5", "anthropic/claude-sonnet"]);
    expect(modelSelectionRows(options, 1, "openai/gpt-5")).toEqual([
      { title: "openai/gpt-5", value: "openai/gpt-5", selected: false, current: true },
      { title: "anthropic/claude-sonnet", value: "anthropic/claude-sonnet", selected: true, current: false },
    ]);
    expect(modelSelectionRows(options, 0, "anthropic/claude-sonnet")).toEqual([
      { title: "openai/gpt-5", value: "openai/gpt-5", selected: true, current: false },
      { title: "anthropic/claude-sonnet", value: "anthropic/claude-sonnet", selected: false, current: true },
    ]);
  });

  it("assigns ownership of a duplicated current option to one row", () => {
    const rows = modelSelectionRows([
      { title: "Claude Sonnet", value: "anthropic/sonnet" },
      { title: "Sonnet fallback", value: "anthropic/sonnet" },
    ], 0, "anthropic/sonnet");
    expect(rows.filter((option) => option.current)).toHaveLength(1);
    expect(rows.map((option) => option.current)).toEqual([true, false]);
  });

  it("uses one Spanish non-color cue for the current model", () => {
    expect(modelSelectionCue("openai/gpt-5", true)).toBe("openai/gpt-5 · Modelo actual");
    expect(modelSelectionCue("openai/gpt-5", true)).not.toContain("✓");
    expect(modelSelectionCue("openai/gpt-5", false)).toBe("openai/gpt-5");
  });

  it("keeps model and effort persistence failures available as semantic feedback", () => {
    expect(selectionErrorPresentation("write failed")).toEqual({ status: "error", message: "write failed" });
    expect(selectionErrorPresentation()).toBeUndefined();
  });

  it("passes runtime catalogs through helpers without inventing a model", () => {
    const api = { state: { provider: [{ id: "anthropic", name: "Anthropic", models: { sonnet: { id: "sonnet", name: "Claude Sonnet" }, haiku: { id: "haiku", name: "Claude Haiku" } } }] } } as never;
    const runtime = buildRuntimeModelOptions(api);
    expect(runtime.map(({ value }) => value)).toEqual(["anthropic/sonnet", "anthropic/haiku"]);
    const unmarkedOptions = buildAgentModelOptions({ ...row, model: "anthropic/sonnet" }, runtime);
    expect(unmarkedOptions[0]).toMatchObject({ value: "anthropic/sonnet", title: "Claude Sonnet" });
    expect(unmarkedOptions.every(({ title, description }) => !title.includes("Modelo actual") && !title.startsWith("✓ ") && !description?.includes("Modelo actual"))).toBe(true);
    expect(buildAgentVariantOptions({ ...row, model: "anthropic/sonnet", variant: undefined }, "anthropic/sonnet", ["low", "x-high"]).map(({ value }) => value)).toEqual(["", "low", "xhigh"]);
    expect(buildRuntimeModelOptions({ state: { provider: [] } } as never)).toEqual([]);
  });

  it("groups runtime models by provider and persists model plus effort together", async () => {
    const providers = [{ id: "anthropic", name: "Anthropic", models: { sonnet: { id: "sonnet", name: "Claude Sonnet", variants: { high: {} } } } }];
    expect(providerSelectionOptions(providers)).toEqual([{ title: "Anthropic", value: "anthropic" }]);
    expect(providerModelOptions(providers, "anthropic")).toEqual([{ title: "Claude Sonnet", value: "anthropic/sonnet" }]);
    const setModelAndEffort = vi.fn(async () => undefined);
    const refresh = vi.fn();
    const dispatch = vi.fn();
    const busy: boolean[] = [];
    await applyModelAssignment({ setModelAndEffort, refresh }, row.id, "anthropic/claude-sonnet", "high", dispatch, (value) => busy.push(value));
    expect(setModelAndEffort).toHaveBeenCalledWith(row.id, "anthropic/claude-sonnet", "high");
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(busy).toEqual([true, false]);
    expect(dispatch).toHaveBeenCalledWith({ type: "ASSIGNMENT_SAVED" });
    expect(reduceNav(state, { type: "SELECT_MODEL", model: "anthropic/claude-sonnet" }).stack.at(-1)?.kind).toBe("effort");
  });
});
