import { RGBA } from "@opentui/core";
import type { TuiThemeCurrent } from "@opencode-ai/plugin/tui";
import { describe, expect, it, vi } from "vitest";
import { agentInfoSections, createSafeMouseActivation, currentValueCue, keyHintPresentation, screenKeyHints, screenKeyHintsForScreen, searchInputPresentation, selectableRowPresentation } from "../src/tui/visual-primitives.tsx";
import { SUITE_SHELL_LAYOUT } from "../src/tui/screens/suite-shell.tsx";

const row = {
  id: "custom-agent", membership: "custom" as const, enabled: true, model: "openai/gpt-5",
  variant: "high", description: "A coding helper", skills: ["testing", "github"], consent: "explicit-current-turn" as const,
};

const color = (value: number) => RGBA.fromValues(value / 100, value / 100, value / 100);
const current = {
  accent: color(1), primary: color(2), borderActive: color(3), backgroundMenu: color(4),
  selectedListItemText: color(5), text: color(6), background: color(7), border: color(8),
  backgroundPanel: color(9), backgroundElement: color(10), success: color(11), warning: color(12),
  error: color(13), info: color(14),
} as TuiThemeCurrent;

describe("visual primitives", () => {
  it("presents selected rows with a marker and host accent colors", () => {
    expect(selectableRowPresentation({ current } as never, true)).toMatchObject({
      marker: "► ", background: current.accent, foreground: current.selectedListItemText, border: current.borderActive,
    });
  });

  it("keeps the semantic info accent on current rows whether focused or not", () => {
    expect(selectableRowPresentation({ current } as never, false, "info").border).toBe(current.info);
    expect(selectableRowPresentation({ current } as never, true, "info").border).toBe(current.info);
  });

  it("uses the semantic status color for a labeled configuration state", () => {
    expect(selectableRowPresentation({ current } as never, false, "success")).toMatchObject({ foreground: current.success, border: current.success });
    expect(selectableRowPresentation({ current } as never, false, "error")).toMatchObject({ foreground: current.error, border: current.error });
  });

  it("provides one Spanish non-color cue for a current model", () => {
    expect(currentValueCue("openai/gpt-5")).toBe("openai/gpt-5 · Modelo actual");
    expect(currentValueCue("openai/gpt-5")).not.toContain("✓");
  });

  it("returns screen-specific key hints", () => {
    expect(screenKeyHints("catalog")).toContain("Página");
    expect(screenKeyHints("catalog")).toContain("Info");
    expect(screenKeyHints("landing")).toContain("Catálogo");
    expect(screenKeyHints("landing")).toContain("Configuración");
    expect(screenKeyHints("landing")).not.toContain("Desactivados");
    expect(screenKeyHints("catalog")).toContain("buscar");
    expect(screenKeyHints("catalog")).toContain("/");
    expect(screenKeyHints("landing")).not.toContain("Página");
  });

  it("presents finalization and focused search with their semantic visual treatments", () => {
    const finalHint = screenKeyHintsForScreen({ kind: "create", step: 5 } as never);
    const search = searchInputPresentation({ current } as never, true);

    expect(finalHint).toContain("Finalizar");
    expect(keyHintPresentation({ current } as never, finalHint)).toBe(current.warning);
    expect(search.background.a).toBeLessThan(1);
    expect(search.border).toBe(current.primary);
  });

  it("groups agent information into recognizable sections", () => {
    expect(agentInfoSections(row, "Review pull requests")).toEqual([
      { title: "Identidad y estado", fields: [["Agente", "custom-agent"], ["Estado", "Disponible"]] },
      { title: "Descripción", fields: [["Descripción", "A coding helper"]] },
      { title: "Modelo y esfuerzo", fields: [["Modelo", "openai/gpt-5"], ["Esfuerzo", "high"]] },
      { title: "Skills y operaciones", fields: [["Skills", "testing, github"], ["Operaciones", "Review pull requests"]] },
    ]);
  });

  it("keeps the host shell as the single accent-framed boundary", () => {
    expect(SUITE_SHELL_LAYOUT).toMatchObject({ borderStyle: "single" });
  });

  it("consumes a complete mouse click and activates exactly once", () => {
    const activate = vi.fn();
    const backdrop = vi.fn();
    const handlers = createSafeMouseActivation(activate);
    const event = () => {
      let propagationStopped = false;
      return {
        button: 0,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(() => { propagationStopped = true; }),
        get propagationStopped() { return propagationStopped; },
      } as unknown as import("@opentui/core").MouseEvent;
    };

    const dispatch = (handler: (event: import("@opentui/core").MouseEvent) => void, mouseEvent: import("@opentui/core").MouseEvent) => {
      handler(mouseEvent);
      if (!mouseEvent.propagationStopped) backdrop();
    };

    const down = event();
    const up = event();
    dispatch(handlers.onMouseDown, down);
    dispatch(handlers.onMouseUp, up);
    expect(activate).toHaveBeenCalledTimes(1);
    expect(backdrop).toHaveBeenCalledTimes(0);
    expect(down.preventDefault).toHaveBeenCalledTimes(1);
    expect(up.stopPropagation).toHaveBeenCalledTimes(1);
  });

  it("resets shared mouse activation across cross-row releases", () => {
    const activateA = vi.fn();
    const activateB = vi.fn();
    const backdrop = vi.fn();
    const rowA = createSafeMouseActivation(activateA);
    const rowB = createSafeMouseActivation(activateB);
    const event = () => {
      let propagationStopped = false;
      return {
        button: 0,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(() => { propagationStopped = true; }),
        get propagationStopped() { return propagationStopped; },
      } as unknown as import("@opentui/core").MouseEvent;
    };
    const dispatch = (handler: (event: import("@opentui/core").MouseEvent) => void, mouseEvent: import("@opentui/core").MouseEvent) => {
      handler(mouseEvent);
      if (!mouseEvent.propagationStopped) backdrop();
    };

    dispatch(rowA.onMouseDown, event());
    dispatch(rowB.onMouseUp, event());
    dispatch(rowB.onMouseDown, event());
    dispatch(rowA.onMouseUp, event());

    expect(activateA).not.toHaveBeenCalled();
    expect(activateB).not.toHaveBeenCalled();

    dispatch(rowB.onMouseDown, event());
    dispatch(rowB.onMouseUp, event());

    expect(activateA).not.toHaveBeenCalled();
    expect(activateB).toHaveBeenCalledTimes(1);
    expect(backdrop).not.toHaveBeenCalled();
  });
});
