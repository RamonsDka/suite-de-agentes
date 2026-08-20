import { describe, expect, it, vi } from "vitest";
import type { KeyEvent } from "@opencode-ai/plugin/tui";
import { reduceNav, type NavState } from "../src/tui/agent-suite-nav.ts";
import { applyInlineEdit, eventForKey, handleInlineEditKey, handleNestedScreenEscape, suiteScreenKeybar } from "../src/tui/agent-suite-app.tsx";
import { isSubmitKey } from "../src/tui/key-handling.ts";
import type { AppScreen } from "../src/tui/agent-suite-nav.ts";
import type { AgentSuiteController } from "../src/tui/agent-suite-controller.ts";
import { modifyOptions } from "../src/tui/agent-suite-vm.ts";
import { screenKeyHints, screenKeyHintsForScreen } from "../src/tui/visual-primitives.tsx";
import { syncDraftInput } from "../src/tui/screens/modify-panel.tsx";

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
    setSkills: async (_id, skills) => { calls.push(`legacy-skills:${skills.join(",")}`); },
    setOperations: async (_id, prompt) => { calls.push(`legacy-operations:${prompt}`); },
    patchAgent: async (_id, patch) => { calls.push(`patch:${JSON.stringify(patch)}`); },
    ...overrides,
  };
}

describe("Agent Suite inline editing", () => {
  it("uses one submit predicate for every OpenTUI Enter alias", () => {
    expect(["return", "linefeed", "kpenter"].map((name) => isSubmitKey({ name }))).toEqual([true, true, true]);
    expect(isSubmitKey({ name: "escape" })).toBe(false);
  });

  it("commits the active skills edit once, refreshes, and returns to the menu", async () => {
    const controller = fakeController();
    const dispatch = vi.fn();
    const state = reduceNav(menuState, { type: "MODIFY_ACTIVATE", option: "skills" });
    const editing = reduceNav(reduceNav(state, { type: "EDIT_SKILLS_TOGGLE", index: 0, skill: "testing" }), { type: "EDIT_SKILLS_TOGGLE", index: 1, skill: "github" });

    const error = await applyInlineEdit(controller, custom.id, editing.stack.at(-1)!, dispatch);

    expect(error).toBeUndefined();
    expect(controller.calls).toEqual(["patch:{\"skills\":[\"testing\",\"github\"]}", "refresh"]);
    expect(dispatch).toHaveBeenCalledWith({ type: "EDIT_COMMIT" });
  });

  it("routes Enter in the skills UI through the persistence path once", async () => {
    const controller = fakeController();
    const dispatch = vi.fn();
    const state = reduceNav(reduceNav(menuState, { type: "MODIFY_ACTIVATE", option: "skills" }), { type: "EDIT_SKILLS_TOGGLE", index: 0, skill: "testing" });
    const { key, preventDefault, stopPropagation } = keyEvent("return");

    await expect(handleInlineEditKey(key, state.stack.at(-1)!, controller, dispatch, vi.fn())).resolves.toBe(true);
    expect(controller.calls).toEqual(["patch:{\"skills\":[\"testing\"]}", "refresh"]);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
  });

  it("persists a keypad Enter skills edit instead of reducer-only committing", async () => {
    const controller = fakeController();
    const dispatch = vi.fn();
    const state = reduceNav(menuState, { type: "MODIFY_ACTIVATE", option: "skills", skills: ["testing"] });
    const key = keyEvent("kpenter").key;

    expect(isSubmitKey(key)).toBe(true);
    await expect(handleInlineEditKey(key, state.stack.at(-1)!, controller, dispatch, vi.fn())).resolves.toBe(true);

    expect(controller.calls).toEqual(["patch:{\"skills\":[\"testing\"]}", "refresh"]);
    expect(dispatch).toHaveBeenCalledWith({ type: "EDIT_COMMIT" });
  });

  it("keeps the visible add row focus bounded and lets the input own Enter", async () => {
    const state = reduceNav(reduceNav(menuState, { type: "MODIFY_ACTIVATE", option: "skills", skills: ["testing"] }), { type: "MOVE_FOCUS", delta: 1 });

    expect(eventForKey(keyEvent("down").key, state)).toEqual({ type: "MOVE_FOCUS", delta: 1, maxFocus: 1 });
    expect(eventForKey(keyEvent("return").key, state)).toEqual({ type: "EDIT_SKILLS_START_ADD" });

    const adding = reduceNav(state, { type: "EDIT_SKILLS_START_ADD" });
    expect(eventForKey(keyEvent("return").key, adding)).toBeUndefined();
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
    const controller = fakeController({ patchAgent: async () => { throw new Error("write failed"); } });
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
    const controller = fakeController({ patchAgent: async () => { throw new Error("write failed"); } });
    const dispatch = vi.fn();
    const editing = reduceNav(
      { ...menuState, stack: [...menuState.stack.slice(0, -1), { ...(menuState.stack.at(-1) as Extract<NavState["stack"][number], { kind: "modify" }>), editable: true }] },
      { type: "MODIFY_ACTIVATE", option: "operations" },
    );
    const pending = reduceNav(editing, { type: "EDIT_OPERATIONS_INPUT", value: "Review carefully" });
    const operationsScreen = { ...pending.stack.at(-1)!, edit: { mode: "operations" as const, prompt: "Review carefully" } } as AppScreen;

    const error = await applyInlineEdit(controller, custom.id, operationsScreen, dispatch);

    expect(error).toBe("write failed");
    expect(dispatch).not.toHaveBeenCalled();
    expect(pending.stack.at(-1)).toMatchObject({ edit: { mode: "text", field: "operations", value: "Review carefully" } });
  });

  it("commits custom text fields through patchAgent without losing the draft on failure", async () => {
    const calls: unknown[] = [];
    const controller = fakeController({ patchAgent: async (_id, patch) => { calls.push(patch); } });
    const dispatch = vi.fn();
    const state = reduceNav(menuState, { type: "MODIFY_ACTIVATE", option: "id", value: custom.id });
    const edited = reduceNav(state, { type: "EDIT_TEXT_INPUT", value: "renamed-agent" });

    const error = await applyInlineEdit(controller, custom.id, edited.stack.at(-1)!, dispatch);

    expect(error).toBeUndefined();
    expect(calls).toEqual([{ newId: "renamed-agent" }]);
    expect(dispatch).toHaveBeenCalledWith({ type: "EDIT_COMMIT", agentId: "renamed-agent" });
  });

  it("keeps typed drafts local so input rerenders do not dispatch navigation state", async () => {
    const controller = fakeController();
    const localDrafts: string[] = [];
    syncDraftInput("Fresh description", (value) => localDrafts.push(value));

    expect(localDrafts).toEqual(["Fresh description"]);
    expect(controller.calls).toEqual([]);
  });

  it("updates nested identity screens and returns to the editor menu after rename", () => {
    const state = reduceNav(menuState, { type: "MODIFY_ACTIVATE", option: "id", value: custom.id });
    const renamed = reduceNav(state, { type: "EDIT_TEXT_INPUT", value: "renamed-agent" });
    const committed = reduceNav(renamed, { type: "EDIT_COMMIT", agentId: "renamed-agent" });

    expect(committed.stack).toEqual([
      { kind: "landing", focus: 0 },
      { kind: "info", agentId: "renamed-agent", focus: 0 },
      { kind: "modify", agentId: "renamed-agent", focus: 0, edit: { mode: "menu" }, editable: true },
    ]);
  });

  it("commits description and operations with separate patch fields", async () => {
    const patches: unknown[] = [];
    const controller = fakeController({ patchAgent: async (_id, patch) => { patches.push(patch); } });
    const dispatch = vi.fn();
    const description = reduceNav(menuState, { type: "MODIFY_ACTIVATE", option: "description", value: "Old" });
    const operations = reduceNav(menuState, { type: "MODIFY_ACTIVATE", option: "operations", operations: "Old ops" });

    await applyInlineEdit(controller, custom.id, reduceNav(description, { type: "EDIT_TEXT_INPUT", value: "New" }).stack.at(-1)!, dispatch);
    await applyInlineEdit(controller, custom.id, reduceNav(operations, { type: "EDIT_TEXT_INPUT", value: "New ops" }).stack.at(-1)!, dispatch);

    expect(patches).toEqual([{ description: "New" }, { operations: "New ops" }]);
  });

  it("routes operations editor keys to the correct owner", () => {
    const state = reduceNav(
      { ...menuState, stack: [...menuState.stack.slice(0, -1), { ...(menuState.stack.at(-1) as Extract<NavState["stack"][number], { kind: "modify" }>), editable: true }] },
      { type: "MODIFY_ACTIVATE", option: "operations", operations: "Review carefully" },
    );

    expect(eventForKey(keyEvent("escape").key, state)).toBeUndefined();
    expect(eventForKey(keyEvent("f10").key, state)).toBeUndefined();
    expect(eventForKey(keyEvent("return").key, state)).toBeUndefined();
    expect(eventForKey(keyEvent("linefeed").key, state)).toBeUndefined();
  });

  it("routes every screen kind through the global shell keybar", () => {
    const screens: readonly AppScreen[] = [
      { kind: "landing", focus: 0 }, { kind: "catalog", page: 0, focus: 0, query: "", searchFocused: false }, { kind: "info", agentId: custom.id, focus: 0 },
      { kind: "modify", agentId: custom.id, focus: 0, edit: { mode: "menu" } }, { kind: "model", agentId: custom.id, focus: 0 },
      { kind: "effort", agentId: custom.id, focus: 0 }, { kind: "delete", agentId: custom.id, confirmFocus: 0 },
      { kind: "ai-interview", focus: 0 },
    ];
    for (const screen of screens) expect(suiteScreenKeybar(screen)).toBe(screen.kind === "modify" ? "F10 Finalizar · ↑↓ navega · Enter selecciona · Esc volver" : screenKeyHints(screen.kind));
    expect(suiteScreenKeybar(screens[0]!, true)).toBe(screenKeyHints("error"));
    expect(screenKeyHintsForScreen({ kind: "modify", agentId: custom.id, focus: 0, edit: { mode: "skills", skills: [], focus: 0, adding: false, input: "" } })).toBe("Enter guardar · Esc cancelar");
    expect(screenKeyHintsForScreen({ kind: "modify", agentId: custom.id, focus: 0, edit: { mode: "text", field: "operations", value: "" } })).toBe("Enter guardar · Esc cancelar");
  });

  it("walks nested Escape through the internal stack without closing the host", () => {
    const dispatch = vi.fn();
    expect(handleNestedScreenEscape(menuState, dispatch)).toBe(true);
    expect(dispatch).toHaveBeenCalledWith({ type: "BACK" });

    const landing: NavState = { stack: [{ kind: "landing", focus: 0 }], busy: false, closing: false };
    expect(handleNestedScreenEscape(landing, dispatch)).toBe(false);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("commits a catalog search draft before host-level Escape leaves search", () => {
    const dispatch = vi.fn();
    const searching: NavState = { stack: [{ kind: "landing", focus: 0 }, { kind: "catalog", page: 0, focus: 0, query: "old", searchFocused: true }], busy: false, closing: false };

    expect(handleNestedScreenEscape(searching, dispatch, "draft")).toBe(true);
    expect(dispatch).toHaveBeenCalledWith({ type: "FOCUS_CATALOG_RESULTS", query: "draft" });
  });

});
