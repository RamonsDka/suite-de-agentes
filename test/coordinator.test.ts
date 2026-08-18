import { describe, expect, it, vi } from "vitest";
import { buildAuthoringPrompt, parseAgentDraft, runAuthoringConversation } from "../src/core/coordinator.ts";

const response = JSON.stringify({
  id: " review-agent ",
  description: " Reviews pull requests ",
  systemPrompt: " Review changes carefully. ",
  operations: " Explain risks and next steps. ",
  model: " openai/gpt-5 ",
  effort: " high ",
  skills: [" testing ", "testing", " github "],
  permissions: { read: "allow", edit: "ask" },
});

describe("coordinator authoring", () => {
  it("builds tool-less prompts from the requested description and operations", () => {
    const prompt = buildAuthoringPrompt("Review pull requests", "Call out regressions");

    expect(prompt.system).toContain("strict JSON");
    expect(prompt.system.toLowerCase()).not.toContain("tool access");
    expect(prompt.message).toContain("Review pull requests");
    expect(prompt.message).toContain("Call out regressions");
  });

  it("parses only complete safe drafts and normalizes compatible values", () => {
    expect(parseAgentDraft(response)).toEqual({
      id: "review-agent",
      description: "Reviews pull requests",
      systemPrompt: "Review changes carefully.",
      operations: "Explain risks and next steps.",
      model: "openai/gpt-5",
      effort: "high",
      skills: ["testing", "github"],
      permissions: { read: "allow", edit: "ask" },
    });
    expect(() => parseAgentDraft(JSON.stringify({ id: "review-agent" }))).toThrow(/strict/i);
    expect(() => parseAgentDraft(response.replace('"id"', '"unexpected"'))).toThrow(/strict/i);
    expect(() => parseAgentDraft(response.replace(' review-agent ', ' ../unsafe '))).toThrow(/agent id/i);
  });

  it("surfaces progress and never returns a preview after cancellation", async () => {
    const progress = vi.fn();
    const session = { prompt: vi.fn(async (input) => { input.onProgress?.("Generating draft"); return response; }) };

    await expect(runAuthoringConversation({ session, coordinator: { provider: "openai", model: "gpt-5" }, description: "Review pull requests", operations: "Call out regressions", signal: new AbortController().signal, onProgress: progress })).resolves.toMatchObject({ id: "review-agent" });
    expect(progress).toHaveBeenCalledWith("Generating draft");

    const cancelled = new AbortController();
    cancelled.abort();
    await expect(runAuthoringConversation({ session, coordinator: { provider: "openai", model: "gpt-5" }, description: "Review pull requests", operations: "Call out regressions", signal: cancelled.signal })).rejects.toThrow(/cancel/i);
    expect(session.prompt).toHaveBeenCalledTimes(1);
  });
});
