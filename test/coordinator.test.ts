import { describe, expect, it, vi } from "vitest";
import {
  buildInterviewPrompt,
  normalizeInterviewCheckpoint,
  parseInterviewTurn,
  runInterviewTurn,
  type InterviewCheckpoint,
  type InterviewTranscript,
} from "../src/core/coordinator.ts";

const checkpoint: InterviewCheckpoint = {
  draft: {
    id: "review-agent",
    description: "Reviews pull requests",
    operations: "Explain risks and next steps.",
    model: "openai/gpt-5",
    effort: "high",
    skills: ["testing"],
  },
  pendingSkills: [],
};

const turnResponse = JSON.stringify({
  question: "Which review output matters most?",
  quickReplies: ["Risks", "Tests"],
  checkpoint,
});

describe("coordinator authoring", () => {
  it("parses a bounded interview turn with a safe checkpoint", () => {
    expect(parseInterviewTurn(turnResponse, checkpoint)).toEqual({
      question: "Which review output matters most?",
      quickReplies: ["Risks", "Tests"],
      checkpoint,
    });
  });

  it("rejects malformed turns while retaining the last valid checkpoint as fallback", () => {
    expect(() => parseInterviewTurn("not-json", checkpoint)).toThrow(/interview turn/i);
    expect(parseInterviewTurn("not-json", checkpoint, { fallback: true })).toEqual({
      question: "We kept your last checkpoint. Please retry this turn.",
      quickReplies: ["Retry", "Continue later"],
      checkpoint,
    });
  });

  it("accepts the complete quick-reply boundary and rejects replies outside it", () => {
    const payload = JSON.parse(turnResponse) as Record<string, unknown>;
    payload.quickReplies = ["One", "Two", "Three", "Four"];
    expect(parseInterviewTurn(JSON.stringify(payload), checkpoint).quickReplies).toEqual(["One", "Two", "Three", "Four"]);
    payload.quickReplies = ["Only one"];
    expect(() => parseInterviewTurn(JSON.stringify(payload), checkpoint)).toThrow(/strict|quick/i);
    payload.quickReplies = ["One", "Two", "Three", "Four", "Five"];
    expect(() => parseInterviewTurn(JSON.stringify(payload), checkpoint)).toThrow(/strict|quick/i);
  });

  it("rejects permission and systemPrompt injection in interview payloads", () => {
    for (const key of ["permissions", "systemPrompt"]) {
      const payload = JSON.parse(turnResponse) as Record<string, unknown>;
      payload[key] = key === "permissions" ? { shell: "allow" } : "unsafe instructions";
      expect(() => parseInterviewTurn(JSON.stringify(payload), checkpoint)).toThrow(/strict|safe|permission|system/i);
    }
  });

  it("replays the full transcript and seeds modify-mode state in the interview prompt", () => {
    const transcript: InterviewTranscript = [
      { role: "user", text: "Review pull requests" },
      { role: "assistant", text: "Which output matters most?" },
    ];
    const prompt = buildInterviewPrompt({
      transcript,
      checkpoint,
      installedSkills: ["testing", "github"],
      mode: "modify",
    });

    expect(prompt.system).toContain("one question");
    expect(prompt.system).toContain("Do not include permissions");
    expect(prompt.message).toContain(JSON.stringify(transcript));
    expect(prompt.message).toContain(JSON.stringify(checkpoint));
    expect(prompt.message).toContain("testing");
    expect(prompt.message).toContain("modify");
  });

  it("replays transcript through the session and returns the parsed checkpoint", async () => {
    const transcript: InterviewTranscript = [{ role: "user", text: "Review pull requests" }];
    const session = { prompt: vi.fn(async (input) => {
      expect(input.message).toContain(JSON.stringify(transcript));
      return turnResponse;
    }) };

    await expect(runInterviewTurn({
      session,
      coordinator: { provider: "openai", model: "gpt-5" },
      transcript,
      checkpoint,
      installedSkills: ["testing"],
      signal: new AbortController().signal,
    })).resolves.toEqual({
      question: "Which review output matters most?",
      quickReplies: ["Risks", "Tests"],
      checkpoint,
    });
  });

  it("keeps installed skills in the draft and isolates unavailable candidates as pending", () => {
    const normalized = normalizeInterviewCheckpoint({
      draft: { ...checkpoint.draft, skills: ["testing", "remote-capability"] },
      pendingSkills: [{ id: "future-skill", rationale: "Needs a package after approval." }],
      recommendation: { model: "openai/gpt-5", effort: "high", rationale: "The agent coordinates several review steps." },
    }, [{ id: "testing", name: "Testing", description: "Test support", source: "installed" }]);

    expect(normalized.draft.skills).toEqual(["testing"]);
    expect(normalized.pendingSkills).toEqual([
      { id: "remote-capability", rationale: "No installed or verified remote skill matches “remote-capability”." },
      { id: "future-skill", rationale: "Needs a package after approval." },
    ]);
    expect(normalized.recommendation).toEqual({ model: "openai/gpt-5", effort: "high", rationale: "The agent coordinates several review steps." });
  });
});
