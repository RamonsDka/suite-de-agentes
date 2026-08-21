import { describe, expect, it } from "vitest";
import { editorFields, modifyOptions } from "../src/tui/agent-suite-vm.ts";
import { editorMenuRows, modifyOptionKey } from "../src/tui/screens/modify-panel.tsx";

const custom = {
  id: "review-agent",
  membership: "custom" as const,
  enabled: true,
  skills: ["testing"],
  consent: "explicit-current-turn" as const,
  description: "Reviews changes",
  model: "openai/gpt-5",
  variant: "high",
};

describe("adaptive interview modification entry", () => {
  it("places the shared AI assistant first for editable agents", () => {
    expect(modifyOptions(custom)[0]).toBe("Asistente IA");
    expect(editorFields(custom)[0]).toBe("ai");
    expect(modifyOptionKey("Asistente IA")).toBe("ai");
  });

  it("describes the assistant as refinement of the current agent", () => {
    expect(editorMenuRows(custom, "Review safely", 0)[0]).toEqual({
      field: "ai",
      label: "Asistente IA",
      value: "Mejorar descripción, skills y operaciones",
      selected: true,
    });
  });

  it("keeps the assistant hidden for protected seed agents without full editing", () => {
    expect(modifyOptions({ membership: "seed" })).toEqual(["Modelo de IA", "Nivel de esfuerzo", "Volver"]);
    expect(editorFields({ membership: "seed" })).toEqual(["model", "effort"]);
  });
});
