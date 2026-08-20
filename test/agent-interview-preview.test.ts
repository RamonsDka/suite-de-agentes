import { describe, expect, it } from "vitest";
import {
  AI_PREVIEW_ACTIONS,
  AI_PREVIEW_FIELDS,
  aiPreviewActionAtFocus,
  applyPreviewFieldEdit,
  authoringDraftPreview,
  modelRecommendationRows,
  pendingSkillRows,
} from "../src/tui/screens/ai-preview.tsx";
import type { CreateDraft } from "../src/tui/agent-suite-nav.ts";

const draft: CreateDraft = {
  id: "review-agent",
  description: "Reviews changes",
  operations: "Review safely",
  skills: ["testing"],
  model: "openai/gpt-5",
  effort: "high",
};

describe("adaptive interview preview", () => {
  it("edits exactly the six safe fields", () => {
    expect(AI_PREVIEW_FIELDS).toEqual(["id", "description", "operations", "skills", "model", "effort"]);
    expect(applyPreviewFieldEdit(draft, "description", "Reviews regressions")).toMatchObject({ description: "Reviews regressions" });
    expect(applyPreviewFieldEdit(draft, "skills", "testing, github").skills).toEqual(["testing", "github"]);
    expect(Object.keys(applyPreviewFieldEdit(draft, "model", "openai/gpt-5.1"))).not.toContain("permissions");
  });

  it("offers only Approve, Request changes, and Discard", () => {
    expect(AI_PREVIEW_ACTIONS).toEqual(["Approve", "Request changes", "Discard"]);
    expect([0, 1, 2].map(aiPreviewActionAtFocus)).toEqual(AI_PREVIEW_ACTIONS);
    expect(aiPreviewActionAtFocus(3)).toBeUndefined();
  });

  it("shows recommendation rationale and keeps unavailable skills pending", () => {
    expect(modelRecommendationRows({ model: "openai/gpt-5", effort: "high", rationale: "Coordinates several review steps." })).toEqual([
      ["Modelo recomendado", "openai/gpt-5"],
      ["Esfuerzo recomendado", "high"],
      ["Rationale", "Coordinates several review steps."],
    ]);
    expect(pendingSkillRows([{ id: "future-skill", rationale: "Install only after approval." }])).toEqual([
      ["future-skill", "Install only after approval."],
    ]);
  });

  it("keeps every safe field visible in review order", () => {
    expect(authoringDraftPreview(draft)).toEqual([
      ["Identificador", "review-agent"],
      ["Descripción", "Reviews changes"],
      ["Operaciones", "Review safely"],
      ["Skills", "testing"],
      ["Modelo", "openai/gpt-5"],
      ["Esfuerzo", "high"],
    ]);
  });
});
