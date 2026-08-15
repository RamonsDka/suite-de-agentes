import { describe, expect, it } from "vitest";
import { formatAgentInfo, infoActionKeys } from "../src/tui/screens/agent-info.tsx";

const row = {
  id: "custom-agent",
  membership: "custom" as const,
  enabled: true,
  model: "openai/gpt-5",
  variant: "high",
  description: "A coding helper",
  skills: ["testing", "github"],
  consent: "explicit-current-turn" as const,
};

describe("Agent Suite info screen", () => {
  it("displays the agent identity, skills, operations, model, and effort", () => {
    expect(formatAgentInfo(row, "Review pull requests carefully")).toEqual([
      "custom-agent",
      "A coding helper",
      "Skills: testing, github",
      "Operaciones: Review pull requests carefully",
      "Modelo: openai/gpt-5",
      "Esfuerzo: high",
    ]);
  });

  it("uses stable action-key intent and handles missing optional values", () => {
    expect(infoActionKeys(row)).toEqual(["F5 Modificar", "F8 Eliminar", "Esc Volver"]);
    expect(formatAgentInfo({ ...row, model: undefined, variant: undefined, description: undefined, skills: [] }, undefined)).toEqual([
      "custom-agent",
      "Descripción: ninguna",
      "Skills: ninguna",
      "Operaciones: ninguna",
      "Modelo: modelo pendiente",
      "Esfuerzo: predeterminado",
    ]);
  });
});
