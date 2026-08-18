import { describe, expect, it } from "vitest";
import { initialNavState, reduceNav, type NavState } from "../src/tui/agent-suite-nav.ts";
import { eventForKey } from "../src/tui/agent-suite-app.tsx";
import { ModifyPanel, modifyMenuRows, modifyOptionKey } from "../src/tui/screens/modify-panel.tsx";
import { modifyOptions } from "../src/tui/agent-suite-vm.ts";

const seed = { id: "general", membership: "seed" as const, enabled: true, skills: [], consent: "explicit-current-turn" as const };
const custom = { ...seed, id: "custom", membership: "custom" as const, skills: ["testing"] };
const info = (agentId: string): NavState => ({
  stack: [{ kind: "landing", focus: 0 }, { kind: "info", agentId, focus: 0 }],
  busy: false,
  closing: false,
});

describe("Agent Suite modify panel", () => {
  it("opens one menu from F5 and exposes the source-specific options", () => {
    const opened = reduceNav(info(seed.id), { type: "OPEN_MODIFY", agentId: seed.id });
    expect(opened.stack.at(-1)).toEqual({ kind: "modify", agentId: seed.id, focus: 0, edit: { mode: "menu" } });
    expect(modifyOptions(seed)).toEqual(["Modelo de IA", "Nivel de esfuerzo", "Volver"]);
    expect(modifyOptions(custom)).toEqual(["Modelo de IA", "Nivel de esfuerzo", "Skills", "Operaciones", "Volver"]);
    expect(modifyOptionKey("Modelo de IA")).toBe("model");
    expect(ModifyPanel).toBeTypeOf("function");
  });

  it("keeps option keys and focused row presentation for seed and custom menus", () => {
    expect(modifyMenuRows(seed, 1)).toEqual([
      { label: "Modelo de IA", option: "model", selected: false },
      { label: "Nivel de esfuerzo", option: "effort", selected: true },
      { label: "Volver", option: "back", selected: false },
    ]);
    expect(modifyMenuRows(custom, 3)).toEqual([
      { label: "Modelo de IA", option: "model", selected: false },
      { label: "Nivel de esfuerzo", option: "effort", selected: false },
      { label: "Skills", option: "skills", selected: false },
      { label: "Operaciones", option: "operations", selected: true },
      { label: "Volver", option: "back", selected: false },
    ]);
  });

  it("activates the visual Volver row for both seed and custom menus", () => {
    const seedMenu = { ...info(seed.id), stack: [...info(seed.id).stack, { kind: "modify" as const, agentId: seed.id, focus: 2, edit: { mode: "menu" as const } }] };
    const customMenu = { ...info(custom.id), stack: [...info(custom.id).stack, { kind: "modify" as const, agentId: custom.id, focus: 4, edit: { mode: "menu" as const }, editable: true }] };
    const enter = { name: "return" } as never;
    const seedAction = eventForKey(enter, seedMenu, 0, undefined, { modifyOptionCount: 3, isCustom: false });
    const customAction = eventForKey(enter, customMenu, 0, undefined, { modifyOptionCount: 5, isCustom: true });

    expect(seedAction).toEqual({ type: "MODIFY_ACTIVATE", option: "back" });
    expect(customAction).toEqual({ type: "MODIFY_ACTIVATE", option: "back" });
    expect(reduceNav(seedMenu, seedAction!).stack.at(-1)).toMatchObject({ kind: "info", agentId: seed.id });
    expect(reduceNav(customMenu, customAction!).stack.at(-1)).toMatchObject({ kind: "info", agentId: custom.id });
  });

  it("routes model/effort and back edges without losing the modify menu", () => {
    const menu = reduceNav(info(custom.id), { type: "OPEN_MODIFY", agentId: custom.id });
    const model = reduceNav(menu, { type: "MODIFY_ACTIVATE", option: "model" });
    const returned = reduceNav(model, { type: "SELECT_MODEL", model: "openai/gpt-5" });
    const effort = reduceNav(returned, { type: "MODIFY_ACTIVATE", option: "effort" });
    const effortReturned = reduceNav(effort, { type: "SELECT_EFFORT", effort: "high" });
    const infoAgain = reduceNav(effortReturned, { type: "MODIFY_ACTIVATE", option: "back" });
    expect(model.stack.at(-1)?.kind).toBe("model");
    expect(returned.stack.at(-1)).toMatchObject({ kind: "modify", agentId: custom.id, edit: { mode: "menu" } });
    expect(effortReturned.stack.at(-1)).toMatchObject({ kind: "modify", agentId: custom.id, edit: { mode: "menu" } });
    expect(infoAgain.stack.at(-1)).toMatchObject({ kind: "info", agentId: custom.id });
  });
});
