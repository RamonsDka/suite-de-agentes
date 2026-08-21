import { describe, expect, it, vi } from "vitest";
import { reduceNav, type NavState } from "../src/tui/agent-suite-nav.ts";
import { eventForKey } from "../src/tui/agent-suite-app.tsx";
import type { KeyEvent } from "@opencode-ai/plugin/tui";
import { applyCreateSubmission } from "../src/tui/agent-suite-app.tsx";
import { createDraftFields, createDraftWithStepValue, createStepPresentation, createSubmissionAction, validateCreateDraft, validateCreateStep } from "../src/tui/screens/create-agent.tsx";
import type { CreateDraft } from "../src/tui/agent-suite-nav.ts";
import { createAgentSuiteController } from "../src/tui/agent-suite-controller.ts";
import type { AgentSuiteController } from "../src/tui/agent-suite-controller.ts";

const draft: CreateDraft = {
  id: "review-agent",
  description: "Reviews changes",
  skills: ["testing"],
  operations: "Review carefully",
  model: "openai/gpt-5",
  effort: "high",
};

function controller(): AgentSuiteController & { calls: string[]; submitted?: CreateDraft } {
  const calls: string[] = [];
  let submitted: CreateDraft | undefined;
  return {
    calls,
    get submitted() { return submitted; },
    snapshot: () => ({ rows: [], version: "1.0.1" }),
    refresh: () => calls.push("refresh"),
    createAgent: async (value) => { calls.push("create"); submitted = value; },
    deleteAgent: async () => undefined,
    materialize: async () => undefined,
    setModel: async () => { calls.push("model"); },
    setEffort: async () => { calls.push("effort"); },
    setSkills: async () => { calls.push("skills"); },
    setOperations: async () => { calls.push("operations"); },
    patchAgent: async () => undefined,
  };
}

describe("Agent Suite create agent", () => {
  it("retains the controller-backed atomic create helper for compatibility consumers", async () => {
    const fake = controller();
    const dispatch = vi.fn();
    const error = await applyCreateSubmission(fake, draft, dispatch);

    expect(error).toBeUndefined();
    expect(fake.calls).toEqual(["create", "refresh"]);
    expect(fake.submitted).toEqual(draft);
    expect(fake.calls).not.toContain("skills");
    expect(fake.calls).not.toContain("operations");
    expect(dispatch).toHaveBeenCalledWith({ type: "AI_PREVIEW_APPLIED" });
  });

  it("trims a valid padded id before persisting the draft", async () => {
    const fake = controller();
    const dispatch = vi.fn();
    const error = await applyCreateSubmission(fake, { ...draft, id: ` ${draft.id} ` }, dispatch);

    expect(error).toBeUndefined();
    expect(fake.submitted?.id).toBe(draft.id);
  });

  it("rejects empty required fields before any controller operation", () => {
    expect(createDraftFields()).toEqual(["id", "description", "skills", "operations", "model", "effort"]);
    expect(validateCreateDraft({ ...draft, id: "" })).toBe("El identificador es obligatorio.");
    expect(validateCreateDraft({ ...draft, description: "" })).toBe("La descripción es obligatoria.");
    expect(validateCreateDraft({ ...draft, model: "" })).toBe("El modelo es obligatorio.");
    expect(validateCreateDraft({ ...draft, effort: "" })).toBe("El esfuerzo es obligatorio.");
    expect(validateCreateDraft({ ...draft, id: "Not a slug" })).toBe("El identificador no es válido.");
    expect(validateCreateDraft(draft, [draft.id])).toBe("El identificador ya existe.");
  });

  it("keeps the user-facing entry owned by the interview route", () => {
    const state = reduceNav({ stack: [{ kind: "landing", focus: 0 }], busy: false, closing: false }, { type: "CREATE_START", coordinatorConfigured: true });
    expect(state.stack.at(-1)).toMatchObject({ kind: "ai-interview" });
  });

  it("validates a manual draft before handing it to the controller", () => {
    expect(validateCreateDraft({ ...draft, id: "" })).toBe("El identificador es obligatorio.");
  });

  it("uses the manual review action for every field instead of an AI branch", () => {
    expect(createSubmissionAction(0, true)).toBe("next");
    expect(createSubmissionAction(3, true)).toBe("next");
    expect(createSubmissionAction(5, true)).toBe("submit");
  });

  it("describes each wizard step with the preserved field value", () => {
    expect(createStepPresentation(draft, 0)).toEqual({
      heading: "Paso 1/6 · Identificador · obligatorio",
      label: "Identificador",
      value: "review-agent",
    });
    expect(createStepPresentation(draft, 2)).toEqual({
      heading: "Paso 3/6 · Skills",
      label: "Skills",
      value: "testing",
    });
  });

  it("keeps the manual editor on field progression without an AI submission branch", () => {
    expect(createSubmissionAction(3, true)).toBe("next");
    expect(createSubmissionAction(3, false)).toBe("next");
    expect(createSubmissionAction(5, true)).toBe("submit");
  });
});
