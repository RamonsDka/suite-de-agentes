import { describe, expect, it, vi } from "vitest";
import { initialNavState, reduceNav, type NavState } from "../src/tui/agent-suite-nav.ts";
import { DeleteWarning, deleteConfirmationOptions, deleteWarningPresentation } from "../src/tui/screens/delete-warning.tsx";
import { confirmDelete, cancelDelete } from "../src/tui/agent-suite-app.tsx";
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
  };
}

describe("Agent Suite delete warning", () => {
  it("requires explicit confirmation and does not call the controller when cancelled", async () => {
    const opened = reduceNav(base, { type: "REQUEST_DELETE", agentId: "custom" });
    const fake = failingController();
    await cancelDelete(fake, "custom", vi.fn());
    expect(opened.stack.at(-1)).toEqual({ kind: "delete", agentId: "custom", confirmFocus: 0 });
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
    expect(deleteWarningPresentation(0)).toEqual({
      status: "warning",
      options: [
        { label: "Eliminar", selected: true },
        { label: "Cancelar", selected: false },
      ],
    });
  });
});
