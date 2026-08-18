import { describe, expect, it, vi } from "vitest";
import type { KeyEvent } from "@opencode-ai/plugin/tui";
import { reduceNav, type NavState } from "../src/tui/agent-suite-nav.ts";
import { applyInlineEdit, eventForKey, handleInlineEditKey, handleNestedScreenEscape } from "../src/tui/agent-suite-app.tsx";
import type { AgentSuiteController } from "../src/tui/agent-suite-controller.ts";
import { modifyOptions } from "../src/tui/agent-suite-vm.ts";

const custom = {
  id: "custom-agent",
  membership: "custom" as const,
  enabled: true,
  skills: ["testing", "github"],
  consent: "explicit-current-turn" as const,
};

const menuState: NavState = {
  stack: [
    { kind: "landing", focus: 0 },
    { kind: "info", agentId: custom.id, focus: 0 },
    { kind: "modify", agentId: custom.id, focus: 0, edit: { mode: "menu" }, editable: true },
  ],
  busy: false,
  closing: false,
};

function keyEvent(name: string) {
  const preventDefault = vi.fn();
  const stopPropagation = vi.fn();
  return {
    key: { name, preventDefault, stopPropagation } as unknown as KeyEvent,
    preventDefault,
    stopPropagation,
  };
}

function fakeController(overrides: Partial<AgentSuiteController> = {}): AgentSuiteController & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    snapshot: () => ({ rows: [custom], version: "1.0.1" }),
    refresh: () => calls.push("refresh"),
    createAgent: async () => undefined,
    deleteAgent: async () => undefined,
    materialize: async () => undefined,
    setModel: async () => undefined,
    setEffort: async () => undefined,
    setSkills: async (_id, skills) => { calls.push(`skills:${skills.join(",")}`); },
    setOperations: async (_id, prompt) => { calls.push(`operations:${prompt}`); },
    ...overrides,
  };
}

describe("Agent Suite inline editing", () => {
  it("commits the active skills edit once, refreshes, and returns to the menu", async () => {
    const controller = fakeController();
    const dispatch = vi.fn();
    const state = reduceNav(menuState, { type: "MODIFY_ACTIVATE", option: "skills" });
    const editing = reduceNav(reduceNav(state, { type: "EDIT_SKILLS_TOGGLE", index: 0, skill: "testing" }), { type: "EDIT_SKILLS_TOGGLE", index: 1, skill: "github" });

    const error = await applyInlineEdit(controller, custom.id, editing.stack.at(-1)!, dispatch);

    expect(error).toBeUndefined();
    expect(controller.calls).toEqual(["skills:testing,github", "refresh"]);
    expect(dispatch).toHaveBeenCalledWith({ type: "EDIT_COMMIT" });
  });

  it("routes Enter in the skills UI through the persistence path once", async () => {
    const controller = fakeController();
    const dispatch = vi.fn();
    const state = reduceNav(reduceNav(menuState, { type: "MODIFY_ACTIVATE", option: "skills" }), { type: "EDIT_SKILLS_TOGGLE", index: 0, skill: "testing" });
    const { key, preventDefault, stopPropagation } = keyEvent("return");

    await expect(handleInlineEditKey(key, state.stack.at(-1)!, controller, dispatch, vi.fn())).resolves.toBe(true);
    expect(controller.calls).toEqual(["skills:testing", "refresh"]);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
  });

  it("preserves Esc cancellation for the skills editor", async () => {
    const state = reduceNav(menuState, { type: "MODIFY_ACTIVATE", option: "skills" });
    const dispatch = vi.fn();
    const { key, preventDefault, stopPropagation } = keyEvent("escape");
    await expect(handleInlineEditKey(key, state.stack.at(-1)!, fakeController(), dispatch, vi.fn())).resolves.toBe(true);
    expect(dispatch).toHaveBeenCalledWith({ type: "BACK" });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
  });

  it("surfaces a skills persistence failure without leaving edit mode silently", async () => {
    const controller = fakeController({ setSkills: async () => { throw new Error("write failed"); } });
    const dispatch = vi.fn();
    const setError = vi.fn();
    const state = reduceNav(menuState, { type: "MODIFY_ACTIVATE", option: "skills" });

    await handleInlineEditKey(keyEvent("return").key, state.stack.at(-1)!, controller, dispatch, setError);
    expect(setError).toHaveBeenCalledWith("write failed");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("cancels without persistence and cannot expose edit options for a seed", () => {
    const controller = fakeController();
    const seed = { ...custom, id: "general", membership: "seed" as const, skills: [] };
    const seedMenu = { ...menuState, stack: [{ kind: "landing", focus: 0 }, { kind: "info", agentId: seed.id, focus: 0 }, { kind: "modify", agentId: seed.id, focus: 0, edit: { mode: "menu" as const } }] } satisfies NavState;
    const cancelled = reduceNav(seedMenu, { type: "EDIT_CANCEL" });

    expect(modifyOptions(seed)).toEqual(["Modelo de IA", "Nivel de esfuerzo", "Volver"]);
    expect(cancelled).toEqual(seedMenu);
    expect(controller.calls).toEqual([]);
  });

  it("keeps the pending operations edit open when the adapter rejects", async () => {
    const controller = fakeController({ setOperations: async () => { throw new Error("write failed"); } });
    const dispatch = vi.fn();
    const editing = reduceNav(
      { ...menuState, stack: [...menuState.stack.slice(0, -1), { ...(menuState.stack.at(-1) as Extract<NavState["stack"][number], { kind: "modify" }>), editable: true }] },
      { type: "MODIFY_ACTIVATE", option: "operations" },
    );
    const pending = reduceNav(editing, { type: "EDIT_OPERATIONS_INPUT", value: "Review carefully" });

    const error = await applyInlineEdit(controller, custom.id, pending.stack.at(-1)!, dispatch);

    expect(error).toBe("write failed");
    expect(dispatch).not.toHaveBeenCalled();
    expect(pending.stack.at(-1)).toMatchObject({ edit: { mode: "operations", prompt: "Review carefully" } });
  });

  it("routes operations editor keys to the correct owner", () => {
    const state = reduceNav(
      { ...menuState, stack: [...menuState.stack.slice(0, -1), { ...(menuState.stack.at(-1) as Extract<NavState["stack"][number], { kind: "modify" }>), editable: true }] },
      { type: "MODIFY_ACTIVATE", option: "operations", operations: "Review carefully" },
    );

    expect(eventForKey(keyEvent("escape").key, state)).toEqual({ type: "BACK" });
    expect(eventForKey(keyEvent("f10").key, state)).toEqual({ type: "REQUEST_CLOSE" });
    expect(eventForKey(keyEvent("return").key, state)).toBeUndefined();
    expect(eventForKey(keyEvent("linefeed").key, state)).toBeUndefined();
  });

  it("walks nested Escape through the internal stack without closing the host", () => {
    const dispatch = vi.fn();
    expect(handleNestedScreenEscape(menuState, dispatch)).toBe(true);
    expect(dispatch).toHaveBeenCalledWith({ type: "BACK" });

    const landing: NavState = { stack: [{ kind: "landing", focus: 0 }], busy: false, closing: false };
    expect(handleNestedScreenEscape(landing, dispatch)).toBe(false);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});
