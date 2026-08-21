import { describe, expect, it } from "vitest";
import { initialNavState, reduceNav, type NavState } from "../src/tui/agent-suite-nav.ts";
import { eventForKey } from "../src/tui/agent-suite-app.tsx";
import { ModifyPanel, editorMenuRows, modifyFinalizationStatus, modifyMenuRows, modifyOptionKey, validateSkillInput } from "../src/tui/screens/modify-panel.tsx";
import { modifyOptions } from "../src/tui/agent-suite-vm.ts";
import { screenKeyHintsForScreen } from "../src/tui/visual-primitives.tsx";

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
    expect(opened.stack.at(-1)).toEqual({ kind: "modify", agentId: seed.id, focus: 0, edit: { mode: "menu" }, protectedBase: true });
    expect(modifyOptions(seed)).toEqual(["Modelo de IA", "Nivel de esfuerzo", "Volver"]);
    expect(modifyOptions(custom)).toEqual(["Asistente IA", "Modificar nombre", "Descripción", "Skills", "Operaciones", "Modelo de IA", "Nivel de esfuerzo", "Eliminar", "Volver"]);
    expect(modifyOptionKey("Asistente IA")).toBe("ai");
    expect(modifyOptionKey("Modificar nombre")).toBe("id");
    expect(ModifyPanel).toBeTypeOf("function");
  });

  it("keeps option keys and focused row presentation for seed and custom menus", () => {
    expect(modifyMenuRows(seed, 1)).toEqual([
      { label: "Modelo de IA", option: "model", selected: false },
      { label: "Nivel de esfuerzo", option: "effort", selected: true },
      { label: "Volver", option: "back", selected: false },
    ]);
    expect(modifyMenuRows(custom, 4)).toEqual([
      { label: "Asistente IA", option: "ai", selected: false },
      { label: "Modificar nombre", option: "id", selected: false },
      { label: "Descripción", option: "description", selected: false },
      { label: "Skills", option: "skills", selected: false },
      { label: "Operaciones", option: "operations", selected: true },
      { label: "Modelo de IA", option: "model", selected: false },
      { label: "Nivel de esfuerzo", option: "effort", selected: false },
      { label: "Eliminar", option: "delete", selected: false },
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

  it("activates Delete as the final custom-editor field", () => {
    const customMenu = { ...info(custom.id), stack: [...info(custom.id).stack, { kind: "modify" as const, agentId: custom.id, focus: 7, edit: { mode: "menu" as const }, editable: true }] };
    expect(eventForKey({ name: "return" } as never, customMenu, 0, undefined, { modifyOptionCount: 8, isCustom: true })).toEqual({ type: "MODIFY_ACTIVATE", option: "delete" });
  });

  it("renders one membership-scoped editor with Delete last for custom agents", () => {
    expect(editorMenuRows(custom, "Review safely", 0)).toEqual([
      { field: "ai", label: "Asistente IA", value: "Mejorar descripción, skills y operaciones", selected: true },
      { field: "id", label: "Modificar nombre", value: "custom", selected: false },
      { field: "description", label: "Descripción", value: "sin descripción", selected: false },
      { field: "skills", label: "Skills", value: "testing", selected: false },
      { field: "operations", label: "Operaciones", value: "Review safely", selected: false },
      { field: "model", label: "Modelo de IA", value: "modelo pendiente", selected: false },
      { field: "effort", label: "Nivel de esfuerzo", value: "predeterminado", selected: false },
      { field: "delete", label: "Eliminar", value: "", selected: false },
    ]);
    expect(editorMenuRows(seed, "", 2, true)).toEqual([
      { field: "ai", label: "Asistente IA", value: "Mejorar descripción, skills y operaciones", selected: false },
      { field: "description", label: "Descripción", value: "sin descripción", selected: false },
      { field: "skills", label: "Skills", value: "ninguna", selected: true },
      { field: "operations", label: "Operaciones", value: "ninguna", selected: false },
      { field: "model", label: "Modelo de IA", value: "modelo pendiente", selected: false },
      { field: "effort", label: "Nivel de esfuerzo", value: "predeterminado", selected: false },
    ]);
  });

  it("routes description, skills, and operations for the protected base editor", () => {
    const menu = reduceNav(info(seed.id), { type: "OPEN_MODIFY", agentId: seed.id });
    const description = { ...menu, stack: [...menu.stack.slice(0, -1), { ...(menu.stack.at(-1) as Extract<NavState["stack"][number], { kind: "modify" }>), focus: 1 }] };
    const skills = { ...description, stack: [...description.stack.slice(0, -1), { ...(description.stack.at(-1) as Extract<NavState["stack"][number], { kind: "modify" }>), focus: 2 }] };
    const operations = { ...description, stack: [...description.stack.slice(0, -1), { ...(description.stack.at(-1) as Extract<NavState["stack"][number], { kind: "modify" }>), focus: 3 }] };

    expect(eventForKey({ name: "return" } as never, description, 0, undefined, { modifyOptionCount: 6, isCustom: false })).toEqual({ type: "MODIFY_ACTIVATE", option: "description" });
    expect(eventForKey({ name: "return" } as never, skills, 0, undefined, { modifyOptionCount: 6, isCustom: false })).toEqual({ type: "MODIFY_ACTIVATE", option: "skills" });
    expect(eventForKey({ name: "return" } as never, operations, 0, undefined, { modifyOptionCount: 6, isCustom: false })).toEqual({ type: "MODIFY_ACTIVATE", option: "operations" });
  });

  it("validates and deduplicates visible skill additions with Spanish errors", () => {
    expect(validateSkillInput("", ["testing"])).toBe("El skill es obligatorio.");
    expect(validateSkillInput("not valid", ["testing"])).toContain("El skill debe usar");
    expect(validateSkillInput("testing", ["testing"])).toBe("Ese skill ya está agregado.");
    expect(validateSkillInput("github", ["testing"])).toBeUndefined();
  });

  it("routes model/effort and back edges without losing the modify menu", () => {
    const menu = reduceNav(info(custom.id), { type: "OPEN_MODIFY", agentId: custom.id });
    const model = reduceNav(menu, { type: "MODIFY_ACTIVATE", option: "model" });
    const returned = reduceNav(model, { type: "SELECT_MODEL", model: "openai/gpt-5" });
    const effort = reduceNav(returned, { type: "MODIFY_ACTIVATE", option: "effort" });
    const effortReturned = reduceNav(effort, { type: "SELECT_EFFORT", effort: "high" });
    const infoAgain = reduceNav(effortReturned, { type: "MODIFY_ACTIVATE", option: "back" });
    expect(model.stack.at(-1)?.kind).toBe("model");
    expect(returned.stack.at(-1)).toMatchObject({ kind: "effort", agentId: custom.id });
    expect(effortReturned.stack.at(-1)).toMatchObject({ kind: "modify", agentId: custom.id, edit: { mode: "menu" } });
    expect(infoAgain.stack.at(-1)).toMatchObject({ kind: "info", agentId: custom.id });
  });

  it("exposes Finalizar only from a saved modify menu and routes F10 through validated finalization", () => {
    const menu = reduceNav(info(custom.id), { type: "OPEN_MODIFY", agentId: custom.id, custom: true });
    const editing = reduceNav(menu, { type: "MODIFY_ACTIVATE", option: "description", value: "Draft" });

    expect(modifyFinalizationStatus({ mode: "menu" })).toEqual({ label: "Cambios guardados", status: "success" });
    expect(modifyFinalizationStatus({ mode: "text", field: "description", value: "Draft" })).toEqual({ label: "Edición pendiente", status: "warning" });
    expect(eventForKey({ name: "f10" } as never, menu, 0, undefined, { modifyOptionCount: 7, isCustom: true })).toEqual({ type: "FINALIZE_MODIFY" });
    expect(eventForKey({ name: "f10" } as never, editing, 0, undefined, { modifyOptionCount: 7, isCustom: true })).toBeUndefined();
    expect(screenKeyHintsForScreen(menu.stack.at(-1)!)).toContain("Finalizar");
  });
});
