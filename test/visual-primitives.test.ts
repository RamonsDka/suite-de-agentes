import { RGBA } from "@opentui/core";
import type { TuiThemeCurrent } from "@opencode-ai/plugin/tui";
import { describe, expect, it } from "vitest";
import { agentInfoSections, currentValueCue, screenKeyHints, selectableRowPresentation, selectionErrorPresentation } from "../src/tui/visual-primitives.tsx";

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

  it("provides a textual current-model cue and optional selection error presentation", () => {
    expect(currentValueCue("openai/gpt-5")).toBe("openai/gpt-5 · Modelo actual");
    expect(selectionErrorPresentation("write failed")).toEqual({ status: "error", message: "write failed" });
    expect(selectionErrorPresentation()).toBeUndefined();
  });

  it("uses a semantic status color without changing selected-row markers", () => {
    expect(selectableRowPresentation({ current } as never, true, "info")).toMatchObject({ marker: "► ", foreground: current.info, border: current.info });
  });

  it("returns screen-specific key hints", () => {
    expect(screenKeyHints("catalog")).toContain("Página");
    expect(screenKeyHints("catalog")).toContain("Info");
    expect(screenKeyHints("landing")).toContain("Catálogo");
    expect(screenKeyHints("landing")).not.toContain("Página");
  });

  it("groups agent information into recognizable sections", () => {
    expect(agentInfoSections(row, "Review pull requests")).toEqual([
      { title: "Identidad y estado", fields: [["Agente", "custom-agent"], ["Estado", "Disponible"]] },
      { title: "Descripción", fields: [["Descripción", "A coding helper"]] },
      { title: "Modelo y esfuerzo", fields: [["Modelo", "openai/gpt-5"], ["Esfuerzo", "high"]] },
      { title: "Skills y operaciones", fields: [["Skills", "testing, github"], ["Operaciones", "Review pull requests"]] },
    ]);
  });
});
