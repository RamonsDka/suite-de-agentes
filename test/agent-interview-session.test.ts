import { describe, expect, it, vi } from "vitest";
import {
  appendInterviewTurn,
  interviewSessionFromDraft,
  reenterInterviewFromPreview,
  runInterviewSessionTurn,
} from "../src/tui/agent-suite-app.tsx";

const draft = {
  id: "review-agent",
  description: "Reviews changes",
  operations: "Review safely",
  skills: ["testing"],
  model: "openai/gpt-5",
  effort: "high",
};

describe("adaptive interview session", () => {
  it("keeps the draft checkpoint while appending conversational answers", () => {
    const session = appendInterviewTurn(interviewSessionFromDraft(draft), "Focus on regressions");

    expect(session.transcript).toEqual([{ role: "user", text: "Focus on regressions" }]);
    expect(session.checkpoint.draft).toEqual(draft);
  });

  it("runs a fresh prompt with the full transcript and installed skills", async () => {
    const session = appendInterviewTurn(interviewSessionFromDraft(draft), "Focus on regressions");
    const prompt = vi.fn(async (input: { message: string }) => {
      expect(input.message).toContain("Focus on regressions");
      expect(input.message).toContain("testing");
      return JSON.stringify({ question: "Which output matters most?", quickReplies: ["Risks", "Tests"], checkpoint: session.checkpoint });
    });

    const next = await runInterviewSessionTurn({ prompt }, { provider: "openai", model: "gpt-5" }, session, ["testing"], new AbortController().signal);

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(next.turn?.question).toBe("Which output matters most?");
    expect(next.transcript.at(-1)).toEqual({ role: "assistant", text: "Which output matters most?" });
  });

  it("preserves the checkpoint when the turn is malformed or cancelled", async () => {
    const session = interviewSessionFromDraft(draft);
    const malformed = await runInterviewSessionTurn({ prompt: async () => "not-json" }, { provider: "openai", model: "gpt-5" }, session, [], new AbortController().signal);
    const cancelled = new AbortController();
    cancelled.abort();
    const aborted = await runInterviewSessionTurn({ prompt: async () => "unused" }, { provider: "openai", model: "gpt-5" }, session, [], cancelled.signal);

    expect(malformed.checkpoint).toEqual(session.checkpoint);
    expect(malformed.error).toMatch(/invalid turn/i);
    expect(aborted.checkpoint).toEqual(session.checkpoint);
    expect(aborted.error).toMatch(/cancel/i);
  });

  it("re-enters review changes with the same transcript", () => {
    const session = appendInterviewTurn(interviewSessionFromDraft(draft), "Keep tests concise");
    const revised = reenterInterviewFromPreview(session, { ...draft, description: "Reviews regressions" });

    expect(revised.transcript).toEqual(session.transcript);
    expect(revised.checkpoint.draft.description).toBe("Reviews regressions");
  });
});
