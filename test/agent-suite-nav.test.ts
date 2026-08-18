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

const seed = { id: "general", membership: "seed" as const, enabled: true, skills: [], consent: "explicit-current-turn" as const };
const custom = { ...seed, id: "custom", membership: "custom" as const };

describe("Agent Suite navigation", () => {
  it("exposes only catalog and create landing choices with selected presentation state", () => {
    expect(landingRows(0)).toEqual([
      { label: "CATALOGO", selected: true },
      { label: "CREAR AGENTE", selected: false },
    ]);
    expect(landingRows(1)).toEqual([
      { label: "CATALOGO", selected: false },
      { label: "CREAR AGENTE", selected: true },
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
