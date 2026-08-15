import { describe, expect, it } from "vitest";
import {
  initialNavState,
  reduceNav,
  type AppScreen,
} from "../src/tui/agent-suite-nav.ts";
import {
  MAX_VISIBLE_ROWS,
  modifyOptions,
  pageRows,
  screenTitle,
} from "../src/tui/agent-suite-vm.ts";

const seed = { id: "general", membership: "seed" as const, enabled: true, skills: [], consent: "explicit-current-turn" as const };
const custom = { ...seed, id: "custom", membership: "custom" as const };

describe("Agent Suite navigation", () => {
  it("pushes landing destinations and preserves catalog context on Back", () => {
    const catalog = reduceNav(initialNavState(), { type: "ACTIVATE_LANDING_ITEM", index: 0 });
    const paged = reduceNav(catalog, { type: "PAGE", delta: 1, maxPage: 3 });
    const focused = reduceNav(reduceNav(paged, { type: "MOVE_FOCUS", delta: 1, maxFocus: 5 }), { type: "MOVE_FOCUS", delta: 1, maxFocus: 5 });
    const info = reduceNav(focused, { type: "ACTIVATE_AGENT", agentId: "general" });
    const restored = reduceNav(info, { type: "BACK" });
    expect(restored.stack.at(-1)).toEqual({ kind: "catalog", page: 1, focus: 2 });
    expect(catalog.stack.at(-1)).toEqual({ kind: "catalog", page: 0, focus: 0 });
  });

  it("uses one modify destination and returns model selection to its menu", () => {
    const info = { stack: [{ kind: "landing", focus: 0 }, { kind: "info", agentId: "general", focus: 0 }], busy: false, closing: false } as import("../src/tui/agent-suite-nav.ts").NavState;
    const modify = reduceNav(info, { type: "OPEN_MODIFY", agentId: "general" });
    const model = reduceNav(modify, { type: "MODIFY_ACTIVATE", option: "model" });
    const returned = reduceNav(model, { type: "SELECT_MODEL", model: "openai/new" });
    expect(modify.stack.at(-1)).toEqual({ kind: "modify", agentId: "general", focus: 0, edit: { mode: "menu" } });
    expect(model.stack.at(-1)).toMatchObject({ kind: "model", agentId: "general" });
    expect(returned.stack.at(-1)).toMatchObject({ kind: "modify", agentId: "general", edit: { mode: "menu" } });
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
    expect(modifyOptions(custom)).toEqual(["Modelo de IA", "Nivel de esfuerzo", "Skills", "Operaciones", "Volver"]);
  });
});
