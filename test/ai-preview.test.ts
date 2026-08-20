import { describe, expect, it, vi } from "vitest";
import { AI_PREVIEW_ACTIONS, authoringDraftPreview, editorSaveStatus } from "../src/tui/screens/ai-preview.tsx";
import { finalizeCreateSubmission, finalizeModifyController, finalizeModifySubmission, runCreateAuthoring, shouldRequestAuthoring } from "../src/tui/agent-suite-app.tsx";
import { initialNavState, reduceNav, type CreateDraft } from "../src/tui/agent-suite-nav.ts";

const draft: CreateDraft = { id: "review-agent", description: "Reviews changes", skills: ["testing"], operations: "Review safely", model: "openai/gpt-5", effort: "high" };

describe("AI authoring preview", () => {
  it("offers exactly the required actions and keeps proposed values visible", () => {
    expect(AI_PREVIEW_ACTIONS).toEqual(["Approve", "Request changes", "Discard"]);
    expect(authoringDraftPreview(draft)).toEqual(expect.arrayContaining([
      ["Identificador", "review-agent"],
      ["Operaciones", "Review safely"],
    ]));
  });

  it("keeps approval external and restores the interview for changes or discard", () => {
    const interview = reduceNav(initialNavState(), { type: "CREATE_START", coordinatorConfigured: true });
    const preview = reduceNav(interview, { type: "OPEN_AI_PREVIEW", draft });
    const approved = reduceNav(preview, { type: "AI_PREVIEW_APPROVE" });
    const requested = reduceNav(preview, { type: "AI_PREVIEW_REQUEST_CHANGES" });
    const discarded = reduceNav(preview, { type: "AI_PREVIEW_DISCARD" });

    expect(approved.stack.at(-1)).toMatchObject({ kind: "ai-preview", draft });
    expect(requested.stack.at(-1)).toMatchObject({ kind: "ai-interview" });
    expect(discarded).toEqual(initialNavState());
  });

  it("finalizes only after controller persistence succeeds and reports saved or pending state", async () => {
    const createAgent = vi.fn(async () => undefined);
    const refresh = vi.fn();
    const dispatch = vi.fn();
    const close = vi.fn();
    const controller = { createAgent, refresh } as never;

    await expect(finalizeCreateSubmission(controller, draft, dispatch, close)).resolves.toBeUndefined();
    expect(createAgent).toHaveBeenCalledWith(draft);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith({ type: "CREATE_SUBMIT" });
    expect(close).toHaveBeenCalledTimes(1);
    expect(editorSaveStatus(false)).toEqual({ label: "Cambios guardados", status: "success" });
    expect(editorSaveStatus(true)).toEqual({ label: "Edición pendiente", status: "warning" });

    const blocked = vi.fn();
    await expect(finalizeCreateSubmission(controller, { ...draft, id: "" }, dispatch, blocked)).resolves.toMatch(/obligatorio/i);
    expect(blocked).not.toHaveBeenCalled();
  });

  it("keeps the suite open when modify finalization reports a pending validation failure", async () => {
    const close = vi.fn();

    await expect(finalizeModifySubmission(async () => "Invalid pending edit", close)).resolves.toBe("Invalid pending edit");
    expect(close).not.toHaveBeenCalled();
    await expect(finalizeModifySubmission(async () => undefined, close)).resolves.toBeUndefined();
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("refreshes through the existing controller before closing a saved modify menu", async () => {
    const close = vi.fn();
    const refresh = vi.fn();

    await expect(finalizeModifyController({ refresh } as never, close)).resolves.toBeUndefined();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    await expect(finalizeModifyController({ refresh: () => { throw new Error("save failed"); } } as never, close)).resolves.toBe("save failed");
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("runs configured conversational authoring into preview only, forwarding progress and leaving absent or cancelled paths manual", async () => {
    const dispatch = vi.fn();
    const progress = vi.fn();
    const session = {
      prompt: vi.fn(async (input: { onProgress?: (text: string) => void }) => {
        input.onProgress?.("Generating draft");
        return JSON.stringify({ id: "review-agent", description: "Reviews changes", systemPrompt: "Review safely.", operations: "Review safely", model: "openai/gpt-5", effort: "high", skills: ["testing"], permissions: { read: "allow" } });
      }),
    };

    await expect(runCreateAuthoring(session, { provider: "openai", model: "gpt-5" }, { ...draft, id: "" }, new AbortController().signal, dispatch, progress)).resolves.toBeUndefined();
    expect(progress).toHaveBeenCalledWith("Generating draft");
    expect(dispatch).toHaveBeenCalledWith({ type: "OPEN_AI_PREVIEW", draft });

    const cancelled = new AbortController();
    cancelled.abort();
    await expect(runCreateAuthoring(session, { provider: "openai", model: "gpt-5" }, draft, cancelled.signal, dispatch)).resolves.toMatch(/cancel/i);
    await expect(runCreateAuthoring(undefined, undefined, draft, new AbortController().signal, dispatch)).resolves.toBeUndefined();
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("offers the conversational action only after description and operations are collected, then fails open to manual completion", () => {
    expect(shouldRequestAuthoring(true, false, false, 3)).toBe(true);
    expect(shouldRequestAuthoring(true, false, false, 2)).toBe(false);
    expect(shouldRequestAuthoring(true, true, false, 3)).toBe(false);
    expect(shouldRequestAuthoring(true, false, true, 3)).toBe(false);
    expect(shouldRequestAuthoring(false, false, false, 3)).toBe(false);
  });
});
