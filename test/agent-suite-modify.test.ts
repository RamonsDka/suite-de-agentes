import { describe, expect, it } from "vitest";
import { initialNavState, reduceNav, type NavState } from "../src/tui/agent-suite-nav.ts";
import { ModifyPanel, modifyOptionKey } from "../src/tui/screens/modify-panel.tsx";
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
