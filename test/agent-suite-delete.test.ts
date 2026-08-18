import { describe, expect, it, vi } from "vitest";
import { initialNavState, reduceNav, type NavState } from "../src/tui/agent-suite-nav.ts";
import { DeleteWarning, deleteConfirmationOptions, deleteWarningPresentation } from "../src/tui/screens/delete-warning.tsx";
import { confirmDelete, cancelDelete, eventForKey, handleDeleteKey } from "../src/tui/agent-suite-app.tsx";
import type { AgentSuiteController } from "../src/tui/agent-suite-controller.ts";

const base: NavState = { stack: [{ kind: "landing", focus: 0 }, { kind: "info", agentId: "custom", focus: 0 }], busy: false, closing: false };
function failingController(): AgentSuiteController & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    snapshot: () => ({ rows: [], version: "1.0.1" }),
    refresh: () => calls.push("refresh"),
    createAgent: async () => undefined,
    deleteAgent: async () => { calls.push("delete"); throw new Error("filesystem unavailable"); },
    materialize: async () => undefined,
    setModel: async () => undefined,
    setEffort: async () => undefined,
    setSkills: async () => undefined,
    setOperations: async () => undefined,
    patchAgent: async () => undefined,
  };
}

describe("Agent Suite delete warning", () => {
  it("requires explicit confirmation and does not call the controller when cancelled", async () => {
    const opened = reduceNav(base, { type: "REQUEST_DELETE", agentId: "custom" });
    const fake = failingController();
    await cancelDelete(fake, "custom", vi.fn());
    expect(opened.stack.at(-1)).toEqual({ kind: "delete", agentId: "custom", confirmFocus: 1 });
    expect(deleteConfirmationOptions()).toEqual(["Eliminar", "Cancelar"]);
    expect(fake.calls).toEqual([]);
    expect(DeleteWarning).toBeTypeOf("function");
  });

  it("keeps the mounted panel on filesystem failure after confirmed deletion", async () => {
    const fake = failingController();
    const dispatch = vi.fn();
    const error = await confirmDelete(fake, "custom", dispatch);
    expect(error).toBe("filesystem unavailable");
    expect(fake.calls).toEqual(["delete"]);
    expect(dispatch).not.toHaveBeenCalled();
    expect(reduceNav(reduceNav(base, { type: "REQUEST_DELETE", agentId: "custom" }), { type: "CONFIRM_DELETE" }).stack).toHaveLength(2);
  });

  it("presents a semantic warning with marked confirm and cancel rows", () => {
    expect(deleteWarningPresentation(1)).toEqual({
      status: "warning",
      options: [
        { label: "Eliminar", selected: false },
        { label: "Cancelar", selected: true },
      ],
    });
  });

  it("opens delete from the custom editor with cancel focused by default", () => {
    const customEditor: NavState = {
      stack: [
        { kind: "landing", focus: 0 },
        { kind: "info", agentId: "custom", focus: 0 },
        { kind: "modify", agentId: "custom", focus: 6, edit: { mode: "menu" }, editable: true },
      ],
      busy: false,
      closing: false,
    };

    const opened = reduceNav(customEditor, { type: "MODIFY_ACTIVATE", option: "delete" });
    const defaultEnter = eventForKey({ name: "return" } as never, opened);

    expect(opened.stack.at(-1)).toEqual({ kind: "delete", agentId: "custom", confirmFocus: 1 });
    expect(defaultEnter).toEqual({ type: "CANCEL_DELETE" });
  });

  it("mutates through the controller when keyboard Enter confirms deletion", async () => {
    const customEditor: NavState = {
      stack: [
        { kind: "landing", focus: 0 },
        { kind: "info", agentId: "custom", focus: 0 },
        { kind: "modify", agentId: "custom", focus: 6, edit: { mode: "menu" }, editable: true },
      ],
      busy: false,
      closing: false,
    };
    const opened = reduceNav(customEditor, { type: "MODIFY_ACTIVATE", option: "delete" });
    const confirming = reduceNav(opened, { type: "MOVE_FOCUS", delta: -1 });
    const fake = failingController();
    fake.deleteAgent = async () => { fake.calls.push("delete"); };
    const dispatch = vi.fn();

    await expect(handleDeleteKey({ name: "return", preventDefault: vi.fn(), stopPropagation: vi.fn() } as never, confirming.stack.at(-1)!, fake, dispatch, vi.fn(), vi.fn())).resolves.toBe(true);

    expect(fake.calls).toEqual(["delete", "refresh"]);
    expect(dispatch).toHaveBeenCalledWith({ type: "CONFIRM_DELETE" });
  });

  it("mutates through the controller for keypad Enter without reducer-only deletion", async () => {
    const customEditor: NavState = {
      stack: [
        { kind: "landing", focus: 0 },
        { kind: "info", agentId: "custom", focus: 0 },
        { kind: "modify", agentId: "custom", focus: 6, edit: { mode: "menu" }, editable: true },
      ],
      busy: false,
      closing: false,
    };
    const opened = reduceNav(customEditor, { type: "MODIFY_ACTIVATE", option: "delete" });
    const confirming = reduceNav(opened, { type: "MOVE_FOCUS", delta: -1 });
    const fake = failingController();
    fake.deleteAgent = async () => { fake.calls.push("delete"); };
    const dispatch = vi.fn();
    const key = { name: "kpenter", preventDefault: vi.fn(), stopPropagation: vi.fn() } as never;

    await expect(handleDeleteKey(key, confirming.stack.at(-1)!, fake, dispatch, vi.fn(), vi.fn())).resolves.toBe(true);

    expect(fake.calls).toEqual(["delete", "refresh"]);
    expect(dispatch).toHaveBeenCalledWith({ type: "CONFIRM_DELETE" });
  });

  it("keeps keyboard Enter cancellation mutation-free at the default focus", async () => {
    const customEditor = reduceNav(base, { type: "OPEN_MODIFY", agentId: "custom", custom: true });
    const opened = reduceNav(customEditor, { type: "MODIFY_ACTIVATE", option: "delete" });
    const fake = failingController();
    const dispatch = vi.fn();

    await expect(handleDeleteKey({ name: "return", preventDefault: vi.fn(), stopPropagation: vi.fn() } as never, opened.stack.at(-1)!, fake, dispatch, vi.fn(), vi.fn())).resolves.toBe(true);

    expect(fake.calls).toEqual([]);
    expect(dispatch).toHaveBeenCalledWith({ type: "CANCEL_DELETE" });
  });
});
