import { createSignal, onCleanup, onMount, type JSX } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import type { KeyEvent, TuiTheme } from "@opencode-ai/plugin/tui";
import { initialNavState, reduceNav, type AppScreen, type NavEvent, type NavState } from "./agent-suite-nav.ts";
import type { AgentSuiteController } from "./agent-suite-controller.ts";
import { filterCatalogRows, pageCount, pageRows, screenTitle } from "./agent-suite-vm.ts";
import { SuiteShell } from "./screens/suite-shell.tsx";
import { Catalog } from "./screens/catalog.tsx";
import { AgentInfo, agentInfoActions } from "./screens/agent-info.tsx";
import { ModelSelect, ProviderSelect, providerModelOptions, providerSelectionOptions, type RuntimeModelProvider } from "./screens/model-select.tsx";
import { EffortSelect, effortSelectionOptions } from "./screens/effort-select.tsx";
import { ErrorPanel } from "./screens/error-panel.tsx";
import { screenKeyHints, screenKeyHintsForScreen, selectionErrorPresentation, StatusBadge } from "./visual-primitives.tsx";
import { isSubmitKey } from "./key-handling.ts";

export interface AgentSuiteAppProps {
  theme: TuiTheme;
  controller: AgentSuiteController;
  onClose: () => void;
  registerEscapeHandler?: (handler: () => boolean) => () => void;
  providers: readonly RuntimeModelProvider[];
  variantOptions: (model: string) => readonly string[];
}

export function handleNestedScreenEscape(state: NavState, dispatch: (event: NavEvent) => void, catalogSearchDraft?: string): boolean {
  const screen = state.stack.at(-1);
  if (!screen || state.closing) return false;
  if (screen.kind === "catalog" && screen.searchFocused) {
    dispatch({ type: "FOCUS_CATALOG_RESULTS", query: catalogSearchDraft ?? screen.query });
    return true;
  }
  if (screen.kind === "catalog") return false;
  dispatch({ type: "BACK" });
  return true;
}

export function suiteScreenKeybar(screen: AppScreen, hasRenderError = false): string {
  return hasRenderError ? screenKeyHints("error") : screenKeyHintsForScreen(screen);
}

export function eventForKey(
  key: KeyEvent,
  state: NavState,
  catalogRowCount = 0,
  focusedCatalogAgentId?: string,
  options: {
    focusedProvider?: string;
    focusedModel?: string;
    focusedEffort?: string;
    providers?: readonly string[];
    models?: readonly string[];
    efforts?: readonly string[];
  } = {},
): NavEvent | undefined {
  const screen = state.stack.at(-1);
  if (!screen || state.closing) return undefined;
  if (key.name === "escape") {
    if (screen.kind === "catalog" && screen.searchFocused) return undefined;
    return screen.kind === "catalog" ? { type: "REQUEST_CLOSE" } : { type: "BACK" };
  }
  if (key.name === "f10") return screen.kind === "catalog" && !screen.searchFocused ? { type: "REQUEST_CLOSE" } : undefined;
  if (screen.kind === "catalog" && screen.searchFocused) return undefined;
  if (key.name === "/" && screen.kind === "catalog") return { type: "FOCUS_CATALOG_SEARCH" };

  const maxFocus = screen.kind === "catalog"
    ? Math.max(0, Math.min(5, catalogRowCount - screen.page * 6 - 1))
    : screen.kind === "info"
      ? agentInfoActions().length - 1
      : screen.kind === "provider"
        ? Math.max(0, (options.providers?.length ?? 0) - 1)
        : screen.kind === "model"
          ? Math.max(0, (options.models?.length ?? 0) - 1)
          : Math.max(0, (options.efforts?.length ?? 0) - 1);
  if (key.name === "up" || key.name === "left") return { type: "MOVE_FOCUS", delta: -1, maxFocus };
  if (key.name === "down" || key.name === "right") return { type: "MOVE_FOCUS", delta: 1, maxFocus };
  if (key.name === "pageup") return screen.kind === "catalog" ? { type: "PAGE", delta: -1, maxPage: Math.max(0, Math.ceil(catalogRowCount / 6) - 1) } : undefined;
  if (key.name === "pagedown") return screen.kind === "catalog" ? { type: "PAGE", delta: 1, maxPage: Math.max(0, Math.ceil(catalogRowCount / 6) - 1) } : undefined;
  if (!isSubmitKey(key)) return undefined;
  if (screen.kind === "catalog") return focusedCatalogAgentId ? { type: "ACTIVATE_AGENT", agentId: focusedCatalogAgentId } : undefined;
  if (screen.kind === "info") return screen.focus === 0 ? { type: "OPEN_MODEL_ASSIGNMENT" } : { type: "BACK" };
  if (screen.kind === "provider") return options.focusedProvider ? { type: "SELECT_PROVIDER", provider: options.focusedProvider } : undefined;
  if (screen.kind === "model") return options.focusedModel ? { type: "SELECT_MODEL", model: options.focusedModel } : undefined;
  return options.focusedEffort === undefined ? undefined : { type: "SELECT_EFFORT", effort: options.focusedEffort };
}

export async function applyModelAssignment(
  controller: Pick<AgentSuiteController, "setModelAndEffort" | "refresh">,
  agentId: string,
  model: string,
  effort: string,
  dispatch: (event: NavEvent) => void,
  setBusy?: (busy: boolean) => void,
): Promise<void> {
  setBusy?.(true);
  try {
    await controller.setModelAndEffort(agentId, model, effort === "default" ? "" : effort);
    controller.refresh();
    dispatch({ type: "ASSIGNMENT_SAVED" });
  } finally {
    setBusy?.(false);
  }
}

export function normalizeCatalogState(state: NavState, rows: readonly Pick<import("../core/types.ts").AgentCatalogRow, "id">[]): NavState {
  return {
    ...state,
    stack: state.stack.map((screen) => {
      if (screen.kind !== "catalog") return screen;
      const filtered = filterCatalogRows(rows, screen.query);
      const page = Math.max(0, Math.min(pageCount(filtered.length) - 1, screen.page));
      return { ...screen, page, focus: Math.max(0, Math.min(pageRows(filtered, page).length - 1, screen.focus)) };
    }),
  };
}

function operationErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function AgentSuiteApp(props: AgentSuiteAppProps): JSX.Element {
  const [state, setState] = createSignal(initialNavState());
  const [operationError, setOperationError] = createSignal<string>();
  const [busy, setBusy] = createSignal(false);
  let catalogSearchDraft = "";
  const rows = () => {
    const snapshot = props.controller.snapshot();
    return [...snapshot.rows, ...(snapshot.disabledRows ?? [])];
  };
  const navigationState = () => normalizeCatalogState(state(), rows());
  const dispatch = (event: NavEvent) => {
    const current = navigationState();
    const currentScreen = current.stack.at(-1);
    if (currentScreen?.kind === "catalog" && event.type === "FOCUS_CATALOG_SEARCH") catalogSearchDraft = currentScreen.query;
    if (currentScreen?.kind === "catalog" && event.type === "FOCUS_CATALOG_RESULTS") catalogSearchDraft = event.query ?? currentScreen.query;
    const next = normalizeCatalogState(reduceNav(current, event), rows());
    setState(next);
    if (event.type === "REQUEST_CLOSE" && next.closing) props.onClose();
  };
  const handleNestedEscape = () => handleNestedScreenEscape(state(), dispatch, catalogSearchDraft);
  onMount(() => {
    const unregister = props.registerEscapeHandler?.(handleNestedEscape);
    onCleanup(() => unregister?.());
  });
  useKeyboard((key) => {
    if (busy()) return;
    const current = navigationState().stack.at(-1);
    if (!current) return;
    const allRows = rows();
    const catalogQuery = current.kind === "catalog" && current.searchFocused ? catalogSearchDraft : current.kind === "catalog" ? current.query : "";
    const focusedCatalogAgentId = current.kind === "catalog" ? pageRows(filterCatalogRows(allRows, catalogQuery), current.page)[current.focus]?.id : undefined;
    const row = "agentId" in current ? allRows.find((item) => item.id === current.agentId) : undefined;
    const providerOptions = providerSelectionOptions(props.providers);
    const modelOptions = current.kind === "model" ? providerModelOptions(props.providers, current.provider) : [];
    const effortOptions = current.kind === "effort" ? effortSelectionOptions(props.variantOptions(current.model)) : [];
    const event = eventForKey(key, navigationState(), current.kind === "catalog" ? filterCatalogRows(allRows, catalogQuery).length : 0, focusedCatalogAgentId, {
      focusedProvider: providerOptions[current.kind === "provider" ? current.focus : 0]?.value,
      focusedModel: modelOptions[current.kind === "model" ? current.focus : 0]?.value,
      focusedEffort: effortOptions[current.kind === "effort" ? current.focus : 0],
      providers: providerOptions.map((option) => option.value),
      models: modelOptions.map((option) => option.value),
      efforts: effortOptions,
    });
    if (!event) return;
    if (event.type === "SELECT_EFFORT" && current.kind === "effort" && row) {
      key.preventDefault();
      key.stopPropagation();
      setOperationError(undefined);
      void applyModelAssignment(props.controller, row.id, current.model, event.effort, dispatch, setBusy).catch((error) => setOperationError(operationErrorMessage(error)));
      return;
    }
    key.preventDefault();
    key.stopPropagation();
    dispatch(event);
  });

  const screen = () => navigationState().stack.at(-1) ?? initialNavState().stack[0]!;
  return (
    <SuiteShell theme={props.theme} title={screenTitle(screen())} keybar={suiteScreenKeybar(screen(), Boolean(operationError()))}>
      {busy() ? <StatusBadge theme={props.theme} status="info">Guardando modelo y esfuerzo…</StatusBadge> : null}
      {operationError() ? <ErrorPanel theme={props.theme} message={operationError()!} onRetry={() => setOperationError(undefined)} onClose={props.onClose} /> : (() => {
        const current = screen();
        if (current.kind === "catalog") {
          const catalogRows = rows();
          return <Catalog theme={props.theme} rows={catalogRows} page={current.page} focus={current.focus} query={current.query} searchFocused={current.searchFocused} onDraftChange={(value) => { catalogSearchDraft = value; }} onFocusResults={(query) => dispatch({ type: "FOCUS_CATALOG_RESULTS", query })} onFocusSearch={() => { catalogSearchDraft = current.query; dispatch({ type: "FOCUS_CATALOG_SEARCH" }); }} onMoveFocus={(delta, maxFocus) => dispatch({ type: "MOVE_FOCUS", delta, maxFocus })} onActivate={(identity) => dispatch({ type: "ACTIVATE_AGENT", agentId: identity.agentId })} onPage={(delta) => dispatch({ type: "PAGE", delta, maxPage: Math.max(0, pageCount(filterCatalogRows(catalogRows, current.searchFocused ? catalogSearchDraft : current.query).length) - 1) })} />;
        }
        const row = rows().find((item) => item.id === current.agentId);
        if (!row) return <text fg={props.theme.current.textMuted}>Agente no encontrado.</text>;
        if (current.kind === "info") return <AgentInfo theme={props.theme} row={row} operations={props.controller.operations?.(row.id)} focus={current.focus} onOpenModelAssignment={() => dispatch({ type: "OPEN_MODEL_ASSIGNMENT" })} onBack={() => dispatch({ type: "BACK" })} />;
        if (current.kind === "provider") return <ProviderSelect theme={props.theme} providers={props.providers} focus={current.focus} onSelect={(provider) => dispatch({ type: "SELECT_PROVIDER", provider })} />;
        if (current.kind === "model") {
          const options = providerModelOptions(props.providers, current.provider);
          return <ModelSelect theme={props.theme} row={row} models={options.map((option) => option.value)} modelOptions={options} currentValue={row.model} focus={current.focus} error={selectionErrorPresentation(operationError())?.message} onSelect={(model) => dispatch({ type: "SELECT_MODEL", model })} />;
        }
        const variants = effortSelectionOptions(props.variantOptions(current.model));
        return <EffortSelect theme={props.theme} row={row} variants={variants} focus={current.focus} error={selectionErrorPresentation(operationError())?.message} onSelect={(effort) => { setOperationError(undefined); void applyModelAssignment(props.controller, row.id, current.model, effort, dispatch, setBusy).catch((error) => setOperationError(operationErrorMessage(error))); }} />;
      })()}
    </SuiteShell>
  );
}
