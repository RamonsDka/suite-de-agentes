import { describe, expect, it } from "vitest";
import { agentInfoSections } from "../src/tui/visual-primitives.tsx";
import { AGENT_INFO_ACTIONS_LAYOUT, AGENT_INFO_CONTENT_LAYOUT, AGENT_INFO_DETAIL_LAYOUT, AGENT_INFO_LAYOUT, agentInfoActions, agentInfoDisplaySections, agentInfoStatus, formatAgentInfo, infoActionKeys } from "../src/tui/screens/agent-info.tsx";

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

  it("uses the same read-only actions for every catalog row and handles missing optional values", () => {
    expect(agentInfoActions()).toEqual(["Cambiar modelo y esfuerzo", "Volver"]);
    expect(infoActionKeys(row)).toEqual(["Cambiar modelo y esfuerzo", "Volver"]);
    expect(formatAgentInfo({ ...row, model: undefined, variant: undefined, description: undefined, skills: [] }, undefined)).toEqual([
      "custom-agent",
      "Descripción: ninguna",
      "Skills: ninguna",
      "Operaciones: ninguna",
      "Modelo: modelo pendiente",
      "Esfuerzo: predeterminado",
    ]);
  });

  it("keeps long structured detail values intact inside a bounded scroll area", () => {
    const longDescription = "descripción extensa ".repeat(8);
    const longOperations = "operación extensa ".repeat(8);
    const sections = agentInfoSections({ ...row, description: longDescription }, longOperations);
    const displayed = agentInfoDisplaySections({ ...row, description: longDescription }, longOperations);

    expect(sections.map(({ title }) => title)).toEqual(["Identidad y estado", "Descripción", "Modelo y esfuerzo", "Skills y operaciones"]);
    expect(displayed).toHaveLength(4);
    expect(displayed[1]?.fields).toEqual([["Descripción", longDescription]]);
    expect(displayed[3]?.fields[1]).toEqual(["Operaciones", longOperations]);
    expect(AGENT_INFO_DETAIL_LAYOUT).toMatchObject({ flexGrow: 1, flexShrink: 1, minHeight: 0, gap: 1, overflow: "scroll" });
    expect(AGENT_INFO_DETAIL_LAYOUT).not.toHaveProperty("maxHeight");
    expect(AGENT_INFO_LAYOUT).toMatchObject({ flexGrow: 1, flexShrink: 1, minHeight: 0, justifyContent: "center" });
    expect(AGENT_INFO_CONTENT_LAYOUT).toMatchObject({ width: "100%", maxHeight: "88%", flexShrink: 1 });
    expect(AGENT_INFO_ACTIONS_LAYOUT).toMatchObject({ flexShrink: 0 });
  });

  it("selects a semantic state badge without changing state copy", () => {
    expect(agentInfoStatus(row)).toBe("success");
    expect(agentInfoStatus({ ...row, enabled: false })).toBe("warning");
    expect(agentInfoStatus({ ...row, membership: "seed", enabled: false })).toBe("info");
  });

  it("keeps disabled rows read-only too", () => {
    expect(infoActionKeys({ ...row, membership: "seed", enabled: false, disabled: true })).toEqual(["Cambiar modelo y esfuerzo", "Volver"]);
  });
});
