import { describe, expect, it, vi } from "vitest";
import {
  AI_GATE_ACTIONS,
  appendInterviewAnswer,
  createInterviewSession,
  initialNavState,
  reduceNav,
} from "../src/tui/agent-suite-nav.ts";
import { screenTitle } from "../src/tui/agent-suite-vm.ts";
import { interviewActionLabels, interviewCheckpointRows } from "../src/tui/screens/ai-interview.tsx";

describe("adaptive interview navigation", () => {
  it("routes both creation entries through the coordinator gate", () => {
    const unconfiguredLanding = reduceNav(initialNavState(), { type: "ACTIVATE_LANDING_ITEM", index: 1, coordinatorConfigured: false });
    const unconfiguredStart = reduceNav(initialNavState(), { type: "CREATE_START", coordinatorConfigured: false });
    const configuredLanding = reduceNav(initialNavState(), { type: "ACTIVATE_LANDING_ITEM", index: 1, coordinatorConfigured: true });
    const configuredStart = reduceNav(initialNavState(), { type: "CREATE_START", coordinatorConfigured: true });

    expect(unconfiguredLanding.stack.at(-1)).toMatchObject({ kind: "ai-gate", intent: "agent-creation-interview" });
    expect(unconfiguredStart.stack.at(-1)).toMatchObject({ kind: "ai-gate", intent: "agent-creation-interview" });
    expect(configuredLanding.stack.at(-1)).toEqual({ kind: "ai-interview", focus: 0 });
    expect(configuredStart.stack.at(-1)).toEqual({ kind: "ai-interview", focus: 0 });
    expect(AI_GATE_ACTIONS).toEqual(["Configurar ahora", "Cancelar"]);
  });

  it("cancels the gate without invoking persistence", () => {
    const persist = vi.fn();
    const gated = reduceNav(initialNavState(), { type: "CREATE_START", coordinatorConfigured: false });

    expect(reduceNav(gated, { type: "CANCEL_AI_GATE" })).toEqual(initialNavState());
    expect(persist).not.toHaveBeenCalled();
  });

  it("keeps transcript and checkpoint state in memory for retries", () => {
    const session = createInterviewSession({ id: "review-agent", description: "Reviews changes", skills: ["testing"], operations: "Review safely", model: "openai/gpt-5", effort: "high" });
    const answered = appendInterviewAnswer(session, "Focus on regressions");

    expect(answered.transcript).toEqual([{ role: "user", text: "Focus on regressions" }]);
    expect(answered.checkpoint).toEqual(session.checkpoint);
    expect(interviewCheckpointRows(answered.checkpoint)).toEqual([
      ["Agente", "review-agent"],
      ["Propósito", "Reviews changes"],
      ["Operaciones", "1"],
      ["Skills", "testing"],
      ["Modelo recomendado", "openai/gpt-5"],
    ]);
  });

  it("exposes one-question actions and a dedicated screen title", () => {
    const session = createInterviewSession();

    expect(interviewActionLabels(session.turn)).toEqual([
      "Describir el objetivo",
      "Partir de una idea existente",
      "Enviar respuesta",
      "Revisar propuesta",
      "Cancelar",
    ]);
    expect(screenTitle({ kind: "ai-interview", focus: 0 })).toContain("ENTREVISTA");
  });
});
