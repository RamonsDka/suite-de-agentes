import type { JSX } from "solid-js";
import { ErrorBoundary } from "solid-js";
import type { TuiDialogSelectOption, TuiTheme } from "@opencode-ai/plugin/tui";
import type { AgentCatalogRow } from "../core/types.ts";
import type { AgentSuiteController } from "./agent-suite-controller.ts";
import { AgentSuiteApp } from "./agent-suite-app.tsx";
import { ErrorPanel } from "./screens/error-panel.tsx";

export const SUITE_DIALOG_SIZE = "medium" as const;

let nestedEscapeHandler: (() => boolean) | undefined;

export function registerAgentSuiteEscapeHandler(handler: () => boolean): () => void {
  nestedEscapeHandler = handler;
  return () => {
    if (nestedEscapeHandler === handler) nestedEscapeHandler = undefined;
  };
}

export function handleAgentSuiteEscape(): boolean {
  return nestedEscapeHandler?.() ?? false;
}

export interface DialogMountApi {
  theme: TuiTheme;
  modelOptions?: (row: AgentCatalogRow) => readonly TuiDialogSelectOption<string>[];
  variantOptions?: (row: AgentCatalogRow, model: string) => readonly TuiDialogSelectOption<string>[];
  ui: {
    Dialog: (props: { size?: "medium" | "large" | "xlarge"; onClose: () => void; children?: JSX.Element }) => JSX.Element;
    dialog: { replace: (render: () => JSX.Element, onClose?: () => void) => void; clear: () => void };
  };
}

export interface MountedAgentSuite {
  requestClose: () => void;
  isClosing: () => boolean;
}

export function mountAgentSuite(api: DialogMountApi, controller: AgentSuiteController): MountedAgentSuite {
  let closed = false;
  let closing = false;
  let unregisterEscapeHandler = () => {};
  const closeOnce = () => {
    if (closed) return;
    closed = true;
    closing = true;
    unregisterEscapeHandler();
    api.ui.dialog.clear();
  };
  api.ui.dialog.replace(() => api.ui.Dialog({
    size: SUITE_DIALOG_SIZE,
    onClose: closeOnce,
    children: (
      <ErrorBoundary fallback={(error, reset) => (
        <ErrorPanel theme={api.theme} message={error instanceof Error ? error.message : String(error)} onRetry={reset} onClose={closeOnce} />
      )}>
        <AgentSuiteApp theme={api.theme} controller={controller} onClose={closeOnce} registerEscapeHandler={(handler) => {
          unregisterEscapeHandler();
          unregisterEscapeHandler = registerAgentSuiteEscapeHandler(handler);
          return unregisterEscapeHandler;
        }} modelOptions={api.modelOptions} variantOptions={api.variantOptions} />
      </ErrorBoundary>
    ),
  }), closeOnce);
  return {
    requestClose: closeOnce,
    isClosing: () => closing,
  };
}
