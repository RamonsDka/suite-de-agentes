import type { JSX } from "solid-js";
import { ErrorBoundary } from "solid-js";
import type { TuiDialogSelectOption, TuiTheme } from "@opencode-ai/plugin/tui";
import type { AgentCatalogRow } from "../core/types.ts";
import type { RuntimeCoordinatorProvider } from "./screens/coordinator-config.tsx";
import type { AgentSuiteController } from "./agent-suite-controller.ts";
import { AgentSuiteApp } from "./agent-suite-app.tsx";
import { ErrorPanel } from "./screens/error-panel.tsx";
import { SuiteShell } from "./screens/suite-shell.tsx";
import { screenKeyHints } from "./visual-primitives.tsx";
import type { SkillCandidate } from "../core/skill-catalog.ts";
import type { CoordinatorSession } from "../core/coordinator.ts";

export const SUITE_DIALOG_SIZE = "large" as const;

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
  coordinatorProviders?: readonly RuntimeCoordinatorProvider[];
  installedSkills?: () => Promise<readonly SkillCandidate[]>;
  coordinatorSession?: CoordinatorSession;
  ui: {
    Dialog: (props: { size?: "medium" | "large" | "xlarge"; onClose: () => void; children?: JSX.Element }) => JSX.Element;
    dialog: { setSize: (size: "medium" | "large" | "xlarge") => void; replace: (render: () => JSX.Element, onClose?: () => void) => void; clear: () => void };
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
  api.ui.dialog.replace(() => (
    <ErrorBoundary fallback={(error, reset) => (
      <SuiteShell theme={api.theme} title="ERROR DE LA SUITE" keybar={screenKeyHints("error")}>
        <ErrorPanel theme={api.theme} message={error instanceof Error ? error.message : String(error)} onRetry={reset} onClose={closeOnce} />
      </SuiteShell>
    )}>
      <AgentSuiteApp theme={api.theme} controller={controller} onClose={closeOnce} registerEscapeHandler={(handler) => {
        unregisterEscapeHandler();
        unregisterEscapeHandler = registerAgentSuiteEscapeHandler(handler);
        return unregisterEscapeHandler;
      }} modelOptions={api.modelOptions} variantOptions={api.variantOptions} coordinatorProviders={api.coordinatorProviders} installedSkills={api.installedSkills} coordinatorSession={api.coordinatorSession} />
    </ErrorBoundary>
  ), closeOnce);
  api.ui.dialog.setSize(SUITE_DIALOG_SIZE);
  return { requestClose: closeOnce, isClosing: () => closing };
}
