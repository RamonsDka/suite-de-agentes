import { describe, expect, it, vi } from "vitest";
import { reduceNav, type NavState } from "../src/tui/agent-suite-nav.ts";
import { eventForKey } from "../src/tui/agent-suite-app.tsx";
import type { KeyEvent } from "@opencode-ai/plugin/tui";
import { advanceCreateDraft, applyCreateSubmission } from "../src/tui/agent-suite-app.tsx";
import { createDraftFields, createStepPresentation, validateCreateDraft, validateCreateStep } from "../src/tui/screens/create-agent.tsx";
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

const createState: NavState = {
  stack: [{ kind: "landing", focus: 0 }, { kind: "create", step: 0, draft: { id: "", description: "", skills: [], operations: "", model: "", effort: "" }, focus: 0 }],
  busy: false,
  closing: false,
};

describe("Agent Suite create agent", () => {
  it("captures the complete draft across the six ordered fields", async () => {
    const filled = ["id", "description", "skills", "operations", "model", "effort"].reduce(
      (state, field, index) => reduceNav(reduceNav(state, { type: "CREATE_INPUT", field: field as keyof CreateDraft, value: field === "skills" ? ["testing"] : draft[field as keyof CreateDraft] as string }), { type: "CREATE_NEXT" }),
      createState,
    );
    const fake = controller();
    const dispatch = vi.fn();
    const error = await applyCreateSubmission(fake, (filled.stack.at(-1) as Extract<NavState["stack"][number], { kind: "create" }>).draft, dispatch);

    expect(error).toBeUndefined();
    expect(fake.calls).toEqual(["create", "refresh"]);
    expect(fake.submitted).toEqual(draft);
    expect(fake.calls).not.toContain("skills");
    expect(fake.calls).not.toContain("operations");
    expect(dispatch).toHaveBeenCalledWith({ type: "CREATE_SUBMIT" });
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

  it("leaves Enter ownership to the focused create Input and blocks invalid advancement", () => {
    expect(eventForKey({ name: "return" } as KeyEvent, createState)).toBeUndefined();
    const dispatch = vi.fn();
    expect(advanceCreateDraft(createState.stack[1].kind === "create" ? createState.stack[1].draft : draft, 0, dispatch)).toBe("El identificador es obligatorio.");
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("keeps the draft values when moving back from the final step", () => {
    const entered = reduceNav(createState, { type: "CREATE_INPUT", field: "id", value: draft.id });
    const final = reduceNav({ ...entered, stack: [{ ...entered.stack[0] }, { ...(entered.stack[1] as Extract<NavState["stack"][number], { kind: "create" }>), step: 5 }] }, { type: "CREATE_INPUT", field: "model", value: draft.model });
    const previous = reduceNav(final, { type: "CREATE_PREV" });

    expect(previous.stack.at(-1)).toMatchObject({ kind: "create", step: 4, draft: { id: draft.id, model: draft.model } });
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
});
