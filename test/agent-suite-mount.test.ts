import { describe, expect, it, vi } from "vitest";
import { mountAgentSuite, type DialogMountApi } from "../src/tui/agent-suite-mount.tsx";
import { createAgentSuiteController } from "../src/tui/agent-suite-controller.ts";
import { openAgentSuite, tui } from "../src/tui/index.tsx";

describe("Agent Suite dialog mount", () => {
  it("replaces once, never clears during navigation, and clears once on close", () => {
    const api: DialogMountApi & { onClose?: () => void } = { theme: {} as never, ui: { Dialog: () => null, dialog: { replace: vi.fn(), clear: vi.fn() } } };
    const replace = vi.fn((_render: () => unknown, onClose?: () => void) => { onClose && (api.onClose = onClose); });
    const clear = api.ui.dialog.clear as ReturnType<typeof vi.fn>;
    api.ui.dialog.replace = replace;
    const mounted = mountAgentSuite(api, createAgentSuiteController());
    expect(replace).toHaveBeenCalledTimes(1);
    mounted.requestClose();
    expect(clear).toHaveBeenCalledTimes(1);
    api.onClose?.();
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it("shares closeOnce between host close and request close in either order", () => {
    const clear = vi.fn();
    let onClose: (() => void) | undefined;
    const api: DialogMountApi = { theme: {} as never, ui: { Dialog: () => null, dialog: { replace: vi.fn((_render, close) => { onClose = close; }), clear } } };
    const first = mountAgentSuite(api, createAgentSuiteController());
    onClose?.();
    first.requestClose();
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it("registers the opener without exposing a route surface", () => {
    expect(tui).toBeTypeOf("function");
    expect(openAgentSuite).toBeTypeOf("function");
  });

  it("absorbs a second close request while closing", () => {
    const clear = vi.fn();
    const api: DialogMountApi = { theme: {} as never, ui: { Dialog: () => null, dialog: { replace: vi.fn(), clear } } };
    const mounted = mountAgentSuite(api, createAgentSuiteController());
    mounted.requestClose();
    mounted.requestClose();
    expect(mounted.isClosing()).toBe(true);
    expect(clear).toHaveBeenCalledTimes(1);
  });
});
