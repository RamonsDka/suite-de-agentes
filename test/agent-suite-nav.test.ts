import { describe, expect, it, vi } from "vitest";
import {
  initialNavState,
  reduceNav,
  type AppScreen,
  type NavState,
} from "../src/tui/agent-suite-nav.ts";
import {
  MAX_VISIBLE_ROWS,
  editorFields,
  modifyOptions,
  pageRows,
  screenTitle,
} from "../src/tui/agent-suite-vm.ts";
import { landingMouseActivation, landingRows } from "../src/tui/screens/landing.tsx";
import { coordinatorEffortOptions, coordinatorModelOptions, coordinatorProviderOptions, coordinatorSelectionOptions, coordinatorStatus } from "../src/tui/screens/coordinator-config.tsx";
import { applyCoordinatorSelection, eventForKey, handleCoordinatorSelectionKey } from "../src/tui/agent-suite-app.tsx";
import { skillPickerRows } from "../src/tui/screens/skill-picker.tsx";

const seed = { id: "general", membership: "seed" as const, enabled: true, skills: [], consent: "explicit-current-turn" as const };
const custom = { ...seed, id: "custom", membership: "custom" as const };

describe("Agent Suite navigation", () => {
  it("renders the three exact landing options and labels the configuration gear status", () => {
    expect(landingRows(0)).toEqual([
      { label: "Catálogo", selected: true },
      { label: "Crear agente", selected: false },
      { label: "⚙ Configuración", selected: false, status: "No configurado" },
    ]);
    expect(landingRows(2, { provider: "openai", model: "gpt-5", effort: "high" })).toEqual([
      { label: "Catálogo", selected: false },
      { label: "Crear agente", selected: false },
      { label: "⚙ Configuración", selected: true, status: "Configurado" },
    ]);
  });

  it("activates landing choices only for left-click rows", () => {
    const activate = vi.fn();
    const left = { button: 0, preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as import("@opentui/core").MouseEvent;
    const right = { button: 2, preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as import("@opentui/core").MouseEvent;

    expect(landingMouseActivation(left, 1, activate)).toBe(true);
    expect(landingMouseActivation(right, 0, activate)).toBe(false);
    expect(activate).toHaveBeenCalledWith(1);
    expect(right.preventDefault).not.toHaveBeenCalled();
  });

  it("routes configuration through provider, model, and dynamic effort selection, then returns to its root", () => {
    const settings = reduceNav(initialNavState(), { type: "ACTIVATE_LANDING_ITEM", index: 2 });
    const provider = reduceNav(settings, { type: "OPEN_COORDINATOR_SETUP" });
    const model = reduceNav(provider, { type: "SELECT_COORDINATOR_PROVIDER", provider: "openai" });
    const effort = reduceNav(model, { type: "SELECT_COORDINATOR_MODEL", model: "gpt-5" });
    const root = reduceNav(effort, { type: "SELECT_COORDINATOR_EFFORT", effort: "high" });

    expect(settings.stack.at(-1)).toMatchObject({ kind: "coordinator", stage: "settings", focus: 0 });
    expect(provider.stack.at(-1)).toMatchObject({ kind: "coordinator", stage: "provider" });
    expect(model.stack.at(-1)).toMatchObject({ kind: "coordinator", stage: "model", provider: "openai" });
    expect(effort.stack.at(-1)).toMatchObject({ kind: "coordinator", stage: "effort", provider: "openai", model: "gpt-5" });
    expect(root.stack.at(-1)).toEqual({ kind: "coordinator", stage: "settings", focus: 0 });
  });

  it("derives provider, model, and effort choices from runtime data without closing the effort vocabulary", () => {
    const runtime = [{ id: "openai", name: "OpenAI", models: { "gpt-5": { id: "gpt-5", name: "GPT-5", variants: { high: {}, "extra-high": {} } } } }];
    const providers = coordinatorProviderOptions(runtime);

    expect(providers.map(({ value }) => value)).toEqual(["openai"]);
    expect(coordinatorModelOptions(runtime, "openai")).toEqual([{ title: "GPT-5", value: "gpt-5" }]);
    expect(coordinatorEffortOptions(runtime, "openai", "gpt-5")).toEqual([
      { title: "Predeterminado", value: "" },
      { title: "high", value: "high" },
      { title: "extra-high", value: "extra-high" },
    ]);
    expect(coordinatorSelectionOptions("effort", runtime, "openai", "gpt-5").map(({ value }) => value)).toEqual(["", "high", "extra-high"]);
  });

  it("gates an unconfigured AI intent and preserves it when canceling or routing to setup", () => {
    const requested = reduceNav(initialNavState(), { type: "REQUEST_AI_ACTION", intent: "assisted-authoring" });
    const cancelled = reduceNav(requested, { type: "CANCEL_AI_GATE" });
    const configuring = reduceNav(requested, { type: "CONFIGURE_AI_GATE" });

    expect(requested.stack.at(-1)).toEqual({ kind: "ai-gate", intent: "assisted-authoring", focus: 0 });
    expect(cancelled).toEqual(initialNavState());
    expect(configuring.stack.at(-1)).toMatchObject({ kind: "coordinator", stage: "provider", returnIntent: "assisted-authoring" });
    expect(reduceNav(reduceNav(reduceNav(configuring, { type: "SELECT_COORDINATOR_PROVIDER", provider: "openai" }), { type: "SELECT_COORDINATOR_MODEL", model: "gpt-5" }), { type: "SELECT_COORDINATOR_EFFORT", effort: "" }).stack.at(-1)).toEqual({ kind: "coordinator", stage: "settings", focus: 0, returnIntent: "assisted-authoring" });
    expect(coordinatorStatus()).toEqual({ label: "No configurado", status: "error" });
    expect(coordinatorStatus({ provider: "openai", model: "gpt-5" })).toEqual({ label: "Configurado", status: "success" });
  });

  it("maps keyboard selection through coordinator stages and the configuration gate", () => {
    const submit = { name: "return" } as import("@opencode-ai/plugin/tui").KeyEvent;
    const providerState: NavState = { stack: [{ kind: "landing", focus: 0 }, { kind: "coordinator", stage: "provider", focus: 1 }], busy: false, closing: false };
    const gateState: NavState = { stack: [{ kind: "landing", focus: 0 }, { kind: "ai-gate", intent: "assisted-authoring", focus: 1 }], busy: false, closing: false };

    expect(eventForKey(submit, providerState, 0, undefined, { coordinatorOptions: ["openai", "anthropic"] })).toEqual({ type: "SELECT_COORDINATOR_PROVIDER", provider: "anthropic" });
    expect(eventForKey(submit, gateState)).toEqual({ type: "CANCEL_AI_GATE" });
  });

  it("persists coordinator selection through the controller and returns to settings", async () => {
    const setCoordinator = vi.fn(async () => undefined);
    const refresh = vi.fn();
    const dispatch = vi.fn();
    const busy: boolean[] = [];
    const controller = { setCoordinator, refresh } as unknown as import("../src/tui/agent-suite-controller.ts").AgentSuiteController;

    await applyCoordinatorSelection(controller, "openai", "gpt-5", "", dispatch, (value) => busy.push(value));

    expect(setCoordinator).toHaveBeenCalledWith({ provider: "openai", model: "gpt-5" });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: "SELECT_COORDINATOR_EFFORT", effort: "" });
    expect(busy).toEqual([true, false]);
  });

  it("routes keyboard effort completion through coordinator persistence instead of only changing navigation", async () => {
    const key = { name: "return", preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as import("@opencode-ai/plugin/tui").KeyEvent;
    const setCoordinator = vi.fn(async () => undefined);
    const refresh = vi.fn();
    const dispatch = vi.fn();
    const setError = vi.fn();
    const controller = { setCoordinator, refresh } as unknown as import("../src/tui/agent-suite-controller.ts").AgentSuiteController;
    const state: NavState = { stack: [{ kind: "landing", focus: 0 }, { kind: "coordinator", stage: "effort", focus: 0, provider: "openai", model: "gpt-5" }], busy: false, closing: false };

    await expect(handleCoordinatorSelectionKey(key, { type: "SELECT_COORDINATOR_EFFORT", effort: "high" }, state, controller, dispatch, setError)).resolves.toBe(true);

    expect(setCoordinator).toHaveBeenCalledWith({ provider: "openai", model: "gpt-5", effort: "high" });
    expect(dispatch).toHaveBeenCalledWith({ type: "SELECT_COORDINATOR_EFFORT", effort: "high" });
    expect(setError).toHaveBeenCalledWith(undefined);
    expect(key.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("pushes landing destinations and preserves catalog context on Back", () => {
    const catalog = reduceNav(initialNavState(), { type: "ACTIVATE_LANDING_ITEM", index: 0 });
    const paged = reduceNav(catalog, { type: "PAGE", delta: 1, maxPage: 3 });
    const focused = reduceNav(reduceNav(paged, { type: "MOVE_FOCUS", delta: 1, maxFocus: 5 }), { type: "MOVE_FOCUS", delta: 1, maxFocus: 5 });
    const info = reduceNav(focused, { type: "ACTIVATE_AGENT", agentId: "general" });
    const restored = reduceNav(info, { type: "BACK" });
    expect(restored.stack.at(-1)).toMatchObject({ kind: "catalog", page: 1, focus: 2, searchFocused: false });
    expect(catalog.stack.at(-1)).toMatchObject({ kind: "catalog", page: 0, focus: 0, searchFocused: false });
  });

  it("opens the unified catalog on results and enters search explicitly", () => {
    const catalog = reduceNav(initialNavState(), { type: "ACTIVATE_LANDING_ITEM", index: 0 });
    expect(catalog.stack.at(-1)).toMatchObject({ kind: "catalog", page: 0, focus: 0, query: "", searchFocused: false });

    const searching = reduceNav(catalog, { type: "FOCUS_CATALOG_SEARCH" });
    expect(searching.stack.at(-1)).toMatchObject({ kind: "catalog", searchFocused: true });

    const filtered = reduceNav(searching, { type: "CATALOG_QUERY", value: "Son" });
    expect(filtered.stack.at(-1)).toMatchObject({ kind: "catalog", page: 0, focus: 0, query: "Son", searchFocused: true });

    const results = reduceNav(filtered, { type: "FOCUS_CATALOG_RESULTS" });
    expect(results.stack.at(-1)).toMatchObject({ kind: "catalog", query: "Son", searchFocused: false });
    expect(reduceNav(results, { type: "FOCUS_CATALOG_SEARCH" }).stack.at(-1)).toMatchObject({ kind: "catalog", searchFocused: true });
  });

  it("uses one modify destination and returns model selection to its menu", () => {
    const info = { stack: [{ kind: "landing", focus: 0 }, { kind: "info", agentId: "general", focus: 0 }], busy: false, closing: false } as import("../src/tui/agent-suite-nav.ts").NavState;
    const modify = reduceNav(info, { type: "OPEN_MODIFY", agentId: "general" });
    const model = reduceNav(modify, { type: "MODIFY_ACTIVATE", option: "model" });
    const returned = reduceNav(model, { type: "SELECT_MODEL", model: "openai/new" });
    expect(modify.stack.at(-1)).toMatchObject({ kind: "modify", agentId: "general", focus: 0, edit: { mode: "menu" }, protectedBase: true });
    expect(model.stack.at(-1)).toMatchObject({ kind: "model", agentId: "general" });
    expect(returned.stack.at(-1)).toMatchObject({ kind: "effort", agentId: "general", focus: 0 });
  });

  it("keeps create draft values while moving between steps and closes only from landing", () => {
    const create = reduceNav(initialNavState(), { type: "CREATE_START" });
    const entered = reduceNav(create, { type: "CREATE_INPUT", field: "description", value: "A test agent" });
    const next = reduceNav(entered, { type: "CREATE_NEXT" });
    const previous = reduceNav(next, { type: "CREATE_PREV" });
    const closing = reduceNav(initialNavState(), { type: "REQUEST_CLOSE" });
    expect((previous.stack.at(-1) as any).draft.description).toBe("A test agent");
    expect(previous.stack.at(-1)).toMatchObject({ kind: "create", step: 0 });
    expect(closing.closing).toBe(true);
  });

  it("maps every WU1 screen title and bounds catalog rows", () => {
    const kinds: AppScreen["kind"][] = ["landing", "catalog", "info", "modify", "model", "effort", "delete", "create"];
    expect(kinds.map((kind) => screenTitle({ kind } as AppScreen))).toEqual([
      "SUITE DE AGENTES — v1.0.1", "CATALOGO DE AGENTES", "INFO DEL AGENTE", "MODIFICAR AGENTE",
      "SELECCIONAR EL MODELO DE IA", "SELECCIONAR NIVEL DE ESFUERZO", "ADVERTENCIA", "CREAR AGENTE — v1.0.1",
    ]);
    expect(pageRows(Array.from({ length: 8 }, (_, index) => index), 1)).toEqual([6, 7]);
    expect(MAX_VISIBLE_ROWS).toBe(6);
    expect(modifyOptions(seed)).toEqual(["Modelo de IA", "Nivel de esfuerzo", "Volver"]);
    expect(modifyOptions({ ...seed, fullBaseEditing: true })).toEqual(["Descripción", "Skills", "Operaciones", "Modelo de IA", "Nivel de esfuerzo", "Volver"]);
    expect(modifyOptions(custom)).toEqual(["Modificar nombre", "Descripción", "Skills", "Operaciones", "Modelo de IA", "Nivel de esfuerzo", "Eliminar", "Volver"]);
  });

  it("defines deterministic membership-scoped editor fields", () => {
    expect(editorFields(custom)).toEqual(["id", "description", "skills", "operations", "model", "effort", "delete"]);
    expect(editorFields(seed)).toEqual(["model", "effort"]);
    expect(editorFields({ ...seed, fullBaseEditing: true })).toEqual(["description", "skills", "operations", "model", "effort"]);
  });

  it("bounds editor-menu focus to the final permitted field", () => {
    let customMenu = reduceNav(infoState(custom.id), { type: "OPEN_MODIFY", agentId: custom.id, custom: true });
    let seedMenu = reduceNav(infoState(seed.id), { type: "OPEN_MODIFY", agentId: seed.id });
    for (let index = 0; index < 10; index += 1) {
      customMenu = reduceNav(customMenu, { type: "MOVE_FOCUS", delta: 1 });
      seedMenu = reduceNav(seedMenu, { type: "MOVE_FOCUS", delta: 1 });
    }

    expect(customMenu.stack.at(-1)).toMatchObject({ kind: "modify", focus: 6 });
    expect(seedMenu.stack.at(-1)).toMatchObject({ kind: "modify", focus: 4 });
  });

  it("stages text and skills drafts without leaking mutable source values", () => {
    const menu = reduceNav(infoState(custom.id), { type: "OPEN_MODIFY", agentId: custom.id, custom: true });
    const text = reduceNav(menu, { type: "MODIFY_ACTIVATE", option: "description", value: "Draft description" });
    const textInput = reduceNav(text, { type: "EDIT_TEXT_INPUT", value: "Updated description" });
    const skills = reduceNav(menu, { type: "MODIFY_ACTIVATE", option: "skills", skills: ["testing"] });
    const added = reduceNav(reduceNav(skills, { type: "EDIT_SKILLS_START_ADD" }), { type: "EDIT_SKILLS_INPUT", value: "github" });
    const committedDraft = reduceNav(added, { type: "EDIT_SKILLS_ADD" });

    expect(text.stack.at(-1)).toMatchObject({ edit: { mode: "text", field: "description", value: "Draft description" } });
    expect(textInput.stack.at(-1)).toMatchObject({ edit: { mode: "text", field: "description", value: "Updated description" } });
    expect(skills.stack.at(-1)).toMatchObject({ edit: { mode: "skills", skills: ["testing"], focus: 0, adding: false, input: "" } });
    expect(committedDraft.stack.at(-1)).toMatchObject({ edit: { mode: "skills", skills: ["testing", "github"], adding: false, input: "" } });
    expect((skills.stack.at(-1) as any).edit.skills).not.toBe(custom.skills);
  });

  it("opens a searchable installed-skill picker and returns its selected assignment to the skills draft", () => {
    const menu = reduceNav(infoState(custom.id), { type: "OPEN_MODIFY", agentId: custom.id, custom: true });
    const skills = reduceNav(menu, { type: "MODIFY_ACTIVATE", option: "skills", skills: ["testing"] });
    const picker = reduceNav(skills, { type: "OPEN_SKILL_PICKER", installed: [{ id: "github", name: "GitHub", description: "Git hosting", source: "installed" }] });
    const searching = reduceNav(picker, { type: "SKILL_PICKER_QUERY", value: "hub" });
    const attached = reduceNav(searching, { type: "SKILL_PICKER_TOGGLE", skill: "github" });

    expect(picker.stack.at(-1)).toMatchObject({ kind: "skill-picker", agentId: custom.id, query: "", selected: ["testing"] });
    expect(searching.stack.at(-1)).toMatchObject({ kind: "skill-picker", query: "hub" });
    expect(skillPickerRows((searching.stack.at(-1) as any).installed, "hub", ["testing"])).toEqual([{ id: "github", label: "GitHub", description: "Git hosting", attached: false }]);
    expect(attached.stack.at(-1)).toMatchObject({ kind: "modify", agentId: custom.id, edit: { mode: "skills", skills: ["testing", "github"] } });
  });

  it("keeps draft focus bounded and backs out of nested edits before the screen", () => {
    const menu = reduceNav(infoState(custom.id), { type: "OPEN_MODIFY", agentId: custom.id, custom: true });
    const skills = reduceNav(menu, { type: "MODIFY_ACTIVATE", option: "skills", skills: ["testing"] });
    const moved = reduceNav(reduceNav(skills, { type: "MOVE_FOCUS", delta: 1 }), { type: "MOVE_FOCUS", delta: 1 });
    const draftBack = reduceNav(moved, { type: "BACK" });
    const screenBack = reduceNav(draftBack, { type: "BACK" });

    expect((moved.stack.at(-1) as any).edit.focus).toBe(1);
    expect(draftBack.stack.at(-1)).toMatchObject({ kind: "modify", edit: { mode: "menu" } });
    expect(screenBack.stack.at(-1)).toMatchObject({ kind: "info", agentId: custom.id });
  });
});

function infoState(agentId: string): NavState {
  return {
    stack: [{ kind: "landing" as const, focus: 0 }, { kind: "info" as const, agentId, focus: 0 }],
    busy: false,
    closing: false,
  };
}
