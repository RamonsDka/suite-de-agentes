import { describe, expect, it, vi } from "vitest";
import { MAX_VISIBLE_ROWS, pageCount, pageRows } from "../src/tui/agent-suite-vm.ts";
import { CATALOG_EMPTY_MESSAGE, catalogRowLabel, dispatchCatalogWheel, captureCatalogRow, catalogFocusBounds, catalogMouseActivation } from "../src/tui/screens/catalog.tsx";
import { eventForKey } from "../src/tui/agent-suite-app.tsx";
import type { KeyEvent } from "@opencode-ai/plugin/tui";

const rows = Array.from({ length: 14 }, (_, index) => ({ id: `agent-${index}`, membership: "seed" as const, enabled: true, skills: [], consent: "explicit-current-turn" as const }));

describe("Agent Suite catalog", () => {
  it("pages six visible rows and clamps page and focus bounds", () => {
    expect(MAX_VISIBLE_ROWS).toBe(6);
    expect(pageRows(rows, 0)).toHaveLength(6);
    expect(pageRows(rows, 2).map((row) => row.id)).toEqual(["agent-12", "agent-13"]);
    expect(pageCount(rows.length)).toBe(3);
    expect(catalogFocusBounds(rows, 2)).toEqual({ maxFocus: 1, maxPage: 2 });
    expect(dispatchCatalogWheel(0, "down", 2)).toBe(1);
    expect(dispatchCatalogWheel(2, "down", 2)).toBe(2);
    expect(dispatchCatalogWheel(0, "up", 2)).toBe(0);
  });

  it("formats catalog rows as names only while keeping blank and long names selectable", () => {
    const detailed = {
      ...rows[0],
      id: "Nombre de agente extraordinariamente largo para la lista",
      enabled: false,
      membership: "custom" as const,
      model: "openai/gpt-5",
      variant: "high",
    };

    expect(catalogRowLabel({ ...detailed, id: "   " })).toBe("(sin nombre)");
    expect(catalogRowLabel(detailed, 18)).toBe("Nombre de agente …");
    expect(catalogRowLabel(detailed)).not.toContain("Creado");
    expect(catalogRowLabel(detailed)).not.toContain("openai/gpt-5");
    expect(catalogRowLabel(detailed)).not.toContain("high");
    expect(CATALOG_EMPTY_MESSAGE).toBe("No hay agentes disponibles.");
  });

  it("captures row identity at render time and activates only left clicks", () => {
    expect(captureCatalogRow(rows[3], 0)).toEqual({ agentId: "agent-3", index: 0 });
    expect(captureCatalogRow(rows[5], 4)).toEqual({ agentId: "agent-5", index: 4 });
    const activate = vi.fn();
    const left = { button: 0, preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as import("@opentui/core").MouseEvent;
    const right = { button: 2, preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as import("@opentui/core").MouseEvent;
    expect(catalogMouseActivation(left, rows[3], 0, activate)).toBe(true);
    expect(catalogMouseActivation(right, rows[5], 4, activate)).toBe(false);
    expect(activate).toHaveBeenCalledWith({ agentId: "agent-3", index: 0 });
    expect(right.preventDefault).not.toHaveBeenCalled();
  });

  it("maps catalog paging, focus, and Enter to the captured row identity", () => {
    const catalog = { stack: [{ kind: "landing", focus: 0 }, { kind: "catalog", page: 1, focus: 2 }], busy: false, closing: false } as import("../src/tui/agent-suite-nav.ts").NavState;
    expect(eventForKey({ name: "pageup" } as KeyEvent, catalog, rows.length)).toEqual({ type: "PAGE", delta: -1, maxPage: 2 });
    expect(eventForKey({ name: "pagedown" } as KeyEvent, catalog, rows.length)).toEqual({ type: "PAGE", delta: 1, maxPage: 2 });
    expect(eventForKey({ name: "down" } as KeyEvent, catalog, rows.length)).toEqual({ type: "MOVE_FOCUS", delta: 1, maxFocus: 5 });
    expect(eventForKey({ name: "return" } as KeyEvent, catalog, rows.length, "agent-8")).toEqual({ type: "ACTIVATE_AGENT", agentId: "agent-8" });
  });

  it("keeps seed info Volver as Back and ignores F8 while preserving custom delete", () => {
    const seedInfo = { stack: [{ kind: "landing", focus: 0 }, { kind: "info", agentId: "general", focus: 1 }], busy: false, closing: false } as import("../src/tui/agent-suite-nav.ts").NavState;
    const customInfo = { ...seedInfo, stack: [...seedInfo.stack.slice(0, -1), { kind: "info", agentId: "custom", focus: 1 }] } as import("../src/tui/agent-suite-nav.ts").NavState;
    const options = { infoActionCount: 2, isCustom: false, canDelete: false };

    expect(eventForKey({ name: "return" } as KeyEvent, seedInfo, 1, undefined, options)).toEqual({ type: "BACK" });
    expect(eventForKey({ name: "f8" } as KeyEvent, seedInfo, 1, undefined, options)).toBeUndefined();
    expect(eventForKey({ name: "return" } as KeyEvent, customInfo, 1, undefined, { infoActionCount: 3, isCustom: true, canDelete: true })).toEqual({ type: "REQUEST_DELETE", agentId: "custom" });
    expect(eventForKey({ name: "f8" } as KeyEvent, customInfo, 1, undefined, { infoActionCount: 3, isCustom: true, canDelete: true })).toEqual({ type: "REQUEST_DELETE", agentId: "custom" });
  });
});
