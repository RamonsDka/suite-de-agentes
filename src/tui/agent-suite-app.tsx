import { createSignal, onCleanup, onMount, type JSX } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import type { KeyEvent } from "@opencode-ai/plugin/tui";
import type { MouseEvent } from "@opentui/core";
import type { TuiDialogSelectOption, TuiTheme } from "@opencode-ai/plugin/tui";
import { initialNavState, reduceNav, type NavEvent, type NavState } from "./agent-suite-nav.ts";
import { editorFields, type EditorField } from "./agent-suite-vm.ts";
import type { AgentSuiteController } from "./agent-suite-controller.ts";
import { screenTitle } from "./agent-suite-vm.ts";
import { filterCatalogRows, pageCount, pageRows } from "./agent-suite-vm.ts";
import { SuiteShell } from "./screens/suite-shell.tsx";
import { Landing } from "./screens/landing.tsx";
import { Catalog } from "./screens/catalog.tsx";
import { AgentInfo } from "./screens/agent-info.tsx";
import { ModifyPanel } from "./screens/modify-panel.tsx";
import { ModelSelect } from "./screens/model-select.tsx";
import { EffortSelect } from "./screens/effort-select.tsx";
import { DeleteWarning } from "./screens/delete-warning.tsx";
import { ErrorPanel } from "./screens/error-panel.tsx";
import { CreateAgent, validateCreateDraft, validateCreateStep } from "./screens/create-agent.tsx";
import type { CreateDraft, AppScreen } from "./agent-suite-nav.ts";
import { screenKeyHints, screenKeyHintsForScreen, selectionErrorPresentation, StatusBadge } from "./visual-primitives.tsx";
import { validateSkillInput } from "./screens/modify-panel.tsx";
import { isSubmitKey } from "./key-handling.ts";

export interface AgentSuiteAppProps {
  theme: TuiTheme;
  controller: AgentSuiteController;
  onClose: () => void;
  registerEscapeHandler?: (handler: () => boolean) => () => void;
  modelOptions?: (row: import("../core/types.ts").AgentCatalogRow) => readonly TuiDialogSelectOption<string>[];
  variantOptions?: (row: import("../core/types.ts").AgentCatalogRow, model: string) => readonly TuiDialogSelectOption<string>[];
}

export async function applyBaseDeactivation(controller: AgentSuiteController, agentId: string, dispatch: (event: NavEvent) => void): Promise<string | undefined> {
  try {
    await controller.deactivateAgent?.(agentId);
    controller.refresh();
    dispatch({ type: "BACK" });
    return undefined;
  } catch (error) {
    return operationErrorMessage(error);
  }
}

export async function applyBaseReactivation(controller: AgentSuiteController, agentId: string, dispatch: (event: NavEvent) => void): Promise<string | undefined> {
  try {
    await controller.reactivateAgent?.(agentId);
    controller.refresh();
    dispatch({ type: "BACK" });
    return undefined;
  } catch (error) {
    return operationErrorMessage(error);
  }
}

export function dispatchMouse(event: MouseEvent, action: () => void): boolean {
  if (event.button !== 0) return false;
  event.preventDefault();
  event.stopPropagation();
  action();
  return true;
}

export function handleNestedScreenEscape(state: NavState, dispatch: (event: NavEvent) => void, catalogSearchDraft?: string): boolean {
  const screen = state.stack.at(-1);
  if (!screen || state.closing || screen.kind === "landing") return false;
  if (screen.kind === "catalog" && screen.searchFocused === true) {
    dispatch({ type: "FOCUS_CATALOG_RESULTS", query: catalogSearchDraft ?? screen.query });
    return true;
  }
  dispatch({ type: "BACK" });
  return true;
}

export function suiteScreenKeybar(screen: AppScreen, hasRenderError = false, capability?: { canDelete?: boolean; canDeactivate?: boolean; canReactivate?: boolean }): string {
  return hasRenderError ? screenKeyHints("error") : screen.kind === "info" ? screenKeyHints("info", capability) : screenKeyHintsForScreen(screen);
}

function modifyOptionAtFocus(row: Pick<import("../core/types.ts").AgentCatalogRow, "membership"> | undefined, focus: number, fullBaseEditing = false): EditorField | "back" {
  if (row) return editorFields({ ...row, fullBaseEditing })[focus] ?? "back";
  return focus === 0 ? "model" : focus === 1 ? "effort" : "back";
}

function legacyModifyOptionAtFocus(isCustom: boolean | undefined, focus: number): EditorField | "back" {
  const options = isCustom ? ["model", "effort", "skills", "operations", "back"] : ["model", "effort", "back"];
  return (options[focus] as EditorField | "back" | undefined) ?? "back";
}

function eventForKey(key: KeyEvent, state: NavState, catalogRowCount = 0, focusedCatalogAgentId?: string, options: { infoActionCount?: number; modifyOptionCount?: number; focusedModel?: string; focusedEffort?: string; models?: readonly string[]; efforts?: readonly string[]; canDelete?: boolean; isCustom?: boolean; isEnabled?: boolean; isDisabled?: boolean } = {}): NavEvent | undefined {
  const screen = state.stack.at(-1);
  if (!screen || state.closing) return undefined;
  if (key.name === "escape") {
    if (screen.kind === "catalog" && screen.searchFocused === true) return undefined;
    if (screen.kind === "modify" && (screen.edit.mode === "text" || screen.edit.mode === "operations" || screen.edit.mode === "skills" && screen.edit.adding)) return undefined;
    return screen.kind === "landing" ? { type: "REQUEST_CLOSE" } : { type: "BACK" };
  }
  const ownsKeyboardInput = screen.kind === "catalog" && screen.searchFocused === true
    || screen.kind === "modify" && screen.edit.mode !== "menu"
    || screen.kind === "create";
  if (key.name === "f10") return ownsKeyboardInput ? undefined : { type: "REQUEST_CLOSE" };
  if (screen.kind === "catalog" && screen.searchFocused) {
    return undefined;
  }
  if (screen.kind === "create" || screen.kind === "modify" && (screen.edit.mode === "text" || screen.edit.mode === "operations" || screen.edit.mode === "skills" && screen.edit.adding)) return undefined;
  if (key.name === "/" && screen.kind === "catalog") return { type: "FOCUS_CATALOG_SEARCH" };
  if (key.name === "f2") return { type: "ACTIVATE_LANDING_ITEM", index: 0 };
  if (key.name === "f3") return { type: "ACTIVATE_LANDING_ITEM", index: 1 };
  if (key.name === "f5" && screen.kind === "info") return options.isDisabled === true ? undefined : { type: "OPEN_MODIFY", agentId: screen.agentId, custom: options.isCustom };
  if (key.name === "f8" && screen.kind === "info") return options.isCustom === true ? { type: "REQUEST_DELETE", agentId: screen.agentId } : undefined;
  const maxFocus = screen.kind === "landing" ? 1 : screen.kind === "catalog" ? Math.max(0, Math.min(5, catalogRowCount - screen.page * 6 - 1)) : screen.kind === "info" ? Math.max(0, (options.infoActionCount ?? 1) - 1) : screen.kind === "modify" ? screen.edit.mode === "skills" ? screen.edit.skills.length : Math.max(0, (options.modifyOptionCount ?? 1) - 1) : screen.kind === "model" ? Math.max(0, (options.models?.length ?? 0) - 1) : screen.kind === "effort" ? Math.max(0, (options.efforts?.length ?? 1) - 1) : screen.kind === "delete" ? 1 : undefined;
  if (key.name === "up" || key.name === "left") return { type: "MOVE_FOCUS", delta: -1, maxFocus };
  if (key.name === "down" || key.name === "right") return { type: "MOVE_FOCUS", delta: 1, maxFocus };
  if (key.name === "pageup") return screen.kind === "catalog" ? { type: "PAGE", delta: -1, maxPage: Math.max(0, Math.ceil(catalogRowCount / 6) - 1) } : undefined;
  if (key.name === "pagedown") return screen.kind === "catalog" ? { type: "PAGE", delta: 1, maxPage: Math.max(0, Math.ceil(catalogRowCount / 6) - 1) } : undefined;
  if (isSubmitKey(key)) {
    if (screen.kind === "modify" && (screen.edit.mode === "text" || screen.edit.mode === "operations")) return undefined;
    if (screen.kind === "landing") return { type: "ACTIVATE_LANDING_ITEM", index: screen.focus };
    if (screen.kind === "catalog" && focusedCatalogAgentId) return { type: "ACTIVATE_AGENT", agentId: focusedCatalogAgentId };
    if (screen.kind === "info") {
      if (options.isDisabled === true) return screen.focus === 0 ? { type: "REACTIVATE_AGENT", agentId: screen.agentId } : { type: "BACK" };
      if (options.isCustom === true) return screen.focus === 0 ? { type: "OPEN_MODIFY", agentId: screen.agentId, custom: true } : screen.focus === 1 ? { type: "REQUEST_DELETE", agentId: screen.agentId } : { type: "BACK" };
      return screen.focus === 0 ? { type: "OPEN_MODIFY", agentId: screen.agentId, custom: false } : screen.focus === 1 ? { type: "DEACTIVATE_AGENT", agentId: screen.agentId } : { type: "BACK" };
    }
    if (screen.kind === "modify" && screen.edit.mode === "menu") {
      const optionCount = options.modifyOptionCount ?? (options.isCustom ? 5 : 3);
      const legacyMenu = optionCount === (options.isCustom ? 5 : 3);
      const option = legacyMenu ? legacyModifyOptionAtFocus(options.isCustom, screen.focus) : modifyOptionAtFocus(options.isCustom === undefined ? undefined : { membership: options.isCustom ? "custom" : "seed" }, screen.focus, screen.protectedBase === true);
      return { type: "MODIFY_ACTIVATE", option };
    }
    if (screen.kind === "modify" && screen.edit.mode === "skills") return screen.edit.adding ? undefined : screen.edit.focus >= screen.edit.skills.length ? { type: "EDIT_SKILLS_START_ADD" } : { type: "EDIT_COMMIT" };
    if (screen.kind === "modify" && screen.edit.mode === "operations") return { type: "EDIT_COMMIT" };
    if (screen.kind === "model" && options.focusedModel) return { type: "SELECT_MODEL", model: options.focusedModel };
    if (screen.kind === "effort" && options.focusedEffort) return { type: "SELECT_EFFORT", effort: options.focusedEffort };
    if (screen.kind === "delete") return screen.confirmFocus === 0 ? { type: "CONFIRM_DELETE" } : { type: "CANCEL_DELETE" };
  }
  return undefined;
}

export async function applyModelSelection(controller: AgentSuiteController, agentId: string, model: string, dispatch: (event: NavEvent) => void, setBusy?: (busy: boolean) => void): Promise<void> {
  setBusy?.(true);
  try {
    await controller.setModel(agentId, model);
    controller.refresh();
    dispatch({ type: "SELECT_MODEL", model });
  } finally { setBusy?.(false); }
}

export async function applyEffortSelection(controller: AgentSuiteController, agentId: string, effort: string, dispatch: (event: NavEvent) => void, setBusy?: (busy: boolean) => void): Promise<void> {
  setBusy?.(true);
  try {
    await controller.setEffort(agentId, effort === "default" ? "" : effort);
    controller.refresh();
    dispatch({ type: "SELECT_EFFORT", effort });
  } finally { setBusy?.(false); }
}

export async function handleSelectionKey(key: KeyEvent, event: NavEvent, agentId: string, controller: AgentSuiteController, dispatch: (event: NavEvent) => void, setError: (error?: string) => void, setBusy?: (busy: boolean) => void): Promise<boolean> {
  if (!isSubmitKey(key)) return false;
  if (event.type !== "SELECT_MODEL" && event.type !== "SELECT_EFFORT") return false;
  key.preventDefault();
  key.stopPropagation();
  setError(undefined);
  try {
    if (event.type === "SELECT_MODEL") await applyModelSelection(controller, agentId, event.model, dispatch, setBusy);
    else await applyEffortSelection(controller, agentId, event.effort, dispatch, setBusy);
  } catch (error) {
    setError(operationErrorMessage(error));
  }
  return true;
}

export function normalizeCatalogState(state: NavState, rows: readonly Pick<import("../core/types.ts").AgentCatalogRow, "id">[]): NavState {
  return {
    ...state,
    stack: state.stack.map((screen) => {
      if (screen.kind !== "catalog") return screen;
      const filtered = filterCatalogRows(rows, screen.query ?? "");
      const maxPage = pageCount(filtered.length) - 1;
      const page = Math.max(0, Math.min(maxPage, screen.page));
      const maxFocus = Math.max(0, pageRows(filtered, page).length - 1);
      return { ...screen, page, focus: Math.max(0, Math.min(maxFocus, screen.focus)) };
    }),
  };
}

function operationErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function confirmDelete(controller: AgentSuiteController, agentId: string, dispatch: (event: NavEvent) => void): Promise<string | undefined> {
  try {
    await controller.deleteAgent(agentId);
    controller.refresh();
    dispatch({ type: "CONFIRM_DELETE" });
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export async function cancelDelete(_controller: AgentSuiteController, _agentId: string, dispatch: (event: NavEvent) => void): Promise<void> {
  dispatch({ type: "CANCEL_DELETE" });
}

export async function handleDeleteKey(key: KeyEvent, screen: AppScreen, controller: AgentSuiteController, dispatch: (event: NavEvent) => void, setError: (error?: string) => void, setBusy?: (busy: boolean) => void): Promise<boolean> {
  if (screen.kind !== "delete" || !isSubmitKey(key)) return false;
  key.preventDefault();
  key.stopPropagation();
  setError(undefined);
  if (screen.confirmFocus === 1) {
    await cancelDelete(controller, screen.agentId, dispatch);
    return true;
  }
  setBusy?.(true);
  try {
    setError(await confirmDelete(controller, screen.agentId, dispatch));
  } finally { setBusy?.(false); }
  return true;
}

export async function applyInlineEdit(controller: AgentSuiteController, agentId: string, screen: AppScreen, dispatch: (event: NavEvent) => void): Promise<string | undefined> {
  if (screen.kind !== "modify" || screen.edit.mode === "menu") return "No hay una edición activa.";
  try {
    if (screen.edit.mode === "skills") {
      const skills = [...screen.edit.skills];
      if (screen.edit.adding) {
        const error = validateSkillInput(screen.edit.input, skills);
        if (error) return error;
        skills.push(screen.edit.input.trim());
      }
      await controller.patchAgent(agentId, { skills });
    } else if (screen.edit.mode === "operations") await controller.patchAgent(agentId, { operations: screen.edit.prompt });
    else if (screen.edit.mode === "text") {
      const value = screen.edit.field === "id" ? screen.edit.value.trim() : screen.edit.value;
      if (screen.edit.field === "id") await controller.patchAgent(agentId, { newId: value });
      else if (screen.edit.field === "description") await controller.patchAgent(agentId, { description: value });
      else await controller.patchAgent(agentId, { operations: value });
    }
    else return "No hay una edición de texto activa.";
    controller.refresh();
    dispatch({ type: "EDIT_COMMIT", ...(screen.edit.mode === "text" && screen.edit.field === "id" ? { agentId: screen.edit.value.trim() } : {}) });
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export async function handleInlineEditKey(key: KeyEvent, screen: AppScreen, controller: AgentSuiteController, dispatch: (event: NavEvent) => void, setError: (error?: string) => void, setBusy?: (busy: boolean) => void): Promise<boolean> {
  if (screen.kind !== "modify" || (screen.edit.mode !== "skills" && screen.edit.mode !== "text" && screen.edit.mode !== "operations")) return false;
  if (key.name === "escape") {
    key.preventDefault();
    key.stopPropagation();
    dispatch({ type: "BACK" });
    return true;
  }
  if (!isSubmitKey(key)) return false;
  key.preventDefault();
  key.stopPropagation();
  setBusy?.(true);
  try {
    const error = await applyInlineEdit(controller, screen.agentId, screen, dispatch);
    setError(error);
  } catch (error) {
    setError(operationErrorMessage(error));
  }
  finally { setBusy?.(false); }
  return true;
}

export function advanceCreateDraft(draft: CreateDraft, step: 0 | 1 | 2 | 3 | 4 | 5, dispatch: (event: NavEvent) => void): string | undefined {
  const error = validateCreateStep(draft, step);
  if (error) return error;
  dispatch({ type: "CREATE_NEXT" });
  return undefined;
}

export async function applyCreateSubmission(controller: AgentSuiteController, draft: CreateDraft, dispatch: (event: NavEvent) => void): Promise<string | undefined> {
  const validationError = validateCreateDraft(draft);
  if (validationError) return validationError;
  const normalizedDraft = { ...draft, id: draft.id.trim(), skills: [...draft.skills] };
  try {
    await controller.createAgent(normalizedDraft);
    controller.refresh();
    dispatch({ type: "CREATE_SUBMIT" });
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export function AgentSuiteApp(props: AgentSuiteAppProps): JSX.Element {
  const [state, setState] = createSignal(initialNavState());
  const [renderError, setRenderError] = createSignal<string>();
  const [operationError, setOperationError] = createSignal<string>();
  const [busy, setBusy] = createSignal(false);
  let catalogSearchDraft = "";
  const catalogRows = () => {
    const snapshot = props.controller.snapshot();
    return [...snapshot.rows, ...(snapshot.disabledRows ?? [])];
  };
  const navigationState = () => normalizeCatalogState(state(), catalogRows());
  const dispatch = (event: NavEvent) => {
    const current = navigationState();
    const currentScreen = current.stack.at(-1);
    if (currentScreen?.kind === "catalog" && event.type === "FOCUS_CATALOG_SEARCH") catalogSearchDraft = currentScreen.query;
    if (currentScreen?.kind === "catalog" && event.type === "FOCUS_CATALOG_RESULTS") catalogSearchDraft = event.query ?? currentScreen.query;
    if (event.type === "DEACTIVATE_AGENT" || event.type === "REACTIVATE_AGENT") {
      setOperationError(undefined);
      setBusy(true);
      const operation = event.type === "DEACTIVATE_AGENT" ? props.controller.deactivateAgent : props.controller.reactivateAgent;
      if (!operation) {
        setOperationError("La operación no está disponible en este host.");
        setBusy(false);
        return;
      }
      void operation(event.agentId).then(() => {
        props.controller.refresh();
        dispatch({ type: "BACK" });
      }).catch((error) => setOperationError(operationErrorMessage(error))).finally(() => setBusy(false));
      return;
    }
    const next = normalizeCatalogState(reduceNav(current, event), catalogRows());
    setState(next);
    if (event.type === "REQUEST_CLOSE" && next.closing) props.onClose();
  };
  const runInlineEdit = (screen: AppScreen, submittedValue?: string) => {
    if (busy()) return;
    setOperationError(undefined);
    setBusy(true);
    const target = submittedValue === undefined || screen.kind !== "modify"
      ? screen
      : screen.edit.mode === "text"
        ? { ...screen, edit: { ...screen.edit, value: submittedValue } }
        : screen.edit.mode === "skills"
          ? { ...screen, edit: { ...screen.edit, input: submittedValue, adding: true } }
          : screen;
    void applyInlineEdit(props.controller, "agentId" in target ? target.agentId : "", target, dispatch).then((error) => setOperationError(error)).finally(() => setBusy(false));
  };
  const runCreate = (draft: CreateDraft) => {
    if (busy()) return;
    setBusy(true);
    void applyCreateSubmission(props.controller, draft, dispatch).then((error) => setOperationError(error)).finally(() => setBusy(false));
  };
  const advanceCreate = (current: Extract<AppScreen, { kind: "create" }>) => setOperationError(advanceCreateDraft(current.draft, current.step, dispatch));
  const handleNestedEscape = () => handleNestedScreenEscape(state(), dispatch, catalogSearchDraft);
  onMount(() => {
    const unregister = props.registerEscapeHandler?.(handleNestedEscape);
    onCleanup(() => unregister?.());
  });
  useKeyboard((key) => {
    const currentNavigation = navigationState();
    const current = currentNavigation.stack.at(-1);
    if (current?.kind === "delete" && isSubmitKey(key)) {
      void handleDeleteKey(key, current, props.controller, dispatch, setOperationError, setBusy);
      return;
    }
    if (current?.kind === "modify" && current.edit.mode === "skills") {
      if (isSubmitKey(key) && !current.edit.adding && current.edit.focus >= current.edit.skills.length) {
        key.preventDefault();
        key.stopPropagation();
        dispatch({ type: "EDIT_SKILLS_START_ADD" });
        return;
      }
      if (key.name === "escape" || (!current.edit.adding && isSubmitKey(key))) {
        void handleInlineEditKey(key, current, props.controller, dispatch, setOperationError, setBusy);
        return;
      }
    }
    if (busy()) return;
    const currentSnapshot = props.controller.snapshot();
    const allCatalogRows = [...currentSnapshot.rows, ...(currentSnapshot.disabledRows ?? [])];
    const effectiveCatalogQuery = current?.kind === "catalog" && current.searchFocused ? catalogSearchDraft : current?.kind === "catalog" ? current.query : "";
    const focusedCatalogAgentId = current?.kind === "catalog" ? filterCatalogRows(allCatalogRows, effectiveCatalogQuery)[current.page * 6 + current.focus]?.id : undefined;
    const snapshot = props.controller.snapshot();
    const focusedRow = current && "agentId" in current ? [...snapshot.rows, ...(snapshot.disabledRows ?? [])].find((item) => item.id === current.agentId) : undefined;
    const modelOptions = focusedRow ? props.modelOptions?.(focusedRow) ?? [] : [];
    const effortOptions = focusedRow ? (props.variantOptions?.(focusedRow, focusedRow.model ?? "") ?? [{ title: "default", value: "" }]).map((option) => option.value || "default") : [];
    const catalogRowCount = current?.kind === "catalog" ? filterCatalogRows([...snapshot.rows, ...(snapshot.disabledRows ?? [])], effectiveCatalogQuery).length : snapshot.rows.length;
    const event = eventForKey(key, currentNavigation, catalogRowCount, focusedCatalogAgentId, (() => {
      const screen = currentNavigation.stack.at(-1);
      const row = screen && "agentId" in screen ? [...snapshot.rows, ...(snapshot.disabledRows ?? [])].find((item) => item.id === screen.agentId) : undefined;
      return {
        infoActionCount: row ? row.disabled ? 2 : 3 : undefined,
        modifyOptionCount: row ? editorFields({ ...row, fullBaseEditing: row.membership === "seed" }).length : undefined,
        focusedModel: modelOptions[current?.kind === "model" ? current.focus : 0]?.value,
        focusedEffort: effortOptions[current?.kind === "effort" ? current.focus : 0],
        models: modelOptions.map((option) => option.value),
        efforts: effortOptions,
        canDelete: row?.membership === "custom",
        isCustom: row?.membership === "custom",
        isEnabled: row?.enabled,
        isDisabled: row?.disabled === true,
      };
    })());
    if (!event) return;
    if (event.type === "SELECT_MODEL" || event.type === "SELECT_EFFORT") {
      void handleSelectionKey(key, event, focusedRow?.id ?? "", props.controller, dispatch, setOperationError, setBusy);
      return;
    }
    key.preventDefault();
    key.stopPropagation();
    dispatch(event);
  });

  const screen = () => navigationState().stack.at(-1) ?? { kind: "landing", focus: 0 } as const;
  const snapshot = () => props.controller.snapshot();
  return (
    <SuiteShell theme={props.theme} title={screenTitle(screen())} keybar={suiteScreenKeybar(screen(), Boolean(renderError()), (() => { const current = screen(); const row = "agentId" in current ? [...snapshot().rows, ...(snapshot().disabledRows ?? [])].find((item) => item.id === current.agentId) : undefined; return row ? { canDelete: row.membership === "custom" && row.disabled !== true, canDeactivate: row.membership === "seed" && row.disabled !== true, canReactivate: row.disabled === true } : undefined; })())}>
      {busy() ? <StatusBadge theme={props.theme} status="info">Guardando cambios…</StatusBadge> : null}
      {renderError() ? <ErrorPanel theme={props.theme} message={renderError()!} onRetry={() => setRenderError(undefined)} onClose={props.onClose} /> : (() => {
        const current = screen();
        if (current.kind === "landing") return <Landing theme={props.theme} focus={current.focus} onActivate={(index) => dispatch({ type: "ACTIVATE_LANDING_ITEM", index })} />;
        if (current.kind === "catalog") {
          const catalogRows = [...snapshot().rows, ...(snapshot().disabledRows ?? [])];
           return <Catalog theme={props.theme} rows={catalogRows} page={current.page} focus={current.focus} query={current.query} searchFocused={current.searchFocused} onDraftChange={(value) => { catalogSearchDraft = value; }} onFocusResults={(query) => dispatch({ type: "FOCUS_CATALOG_RESULTS", query })} onFocusSearch={() => { catalogSearchDraft = current.query; dispatch({ type: "FOCUS_CATALOG_SEARCH" }); }} onMoveFocus={(delta, maxFocus) => dispatch({ type: "MOVE_FOCUS", delta, maxFocus })} onActivate={(identity) => dispatch({ type: "ACTIVATE_AGENT", agentId: identity.agentId })} onPage={(delta) => dispatch({ type: "PAGE", delta, maxPage: Math.max(0, Math.ceil(filterCatalogRows(catalogRows, current.searchFocused ? catalogSearchDraft : current.query).length / 6) - 1) })} />;
        }
           const catalogSource = current.kind === "info" || current.kind === "modify" || current.kind === "model" || current.kind === "effort" || current.kind === "delete" ? (current as { agentId: string }).agentId : undefined;
           const row = catalogSource ? [...snapshot().rows, ...(snapshot().disabledRows ?? [])].find((item) => item.id === catalogSource) : undefined;
           if (current.kind === "info") return row ? <AgentInfo theme={props.theme} row={row} operations={props.controller.operations?.(row.id)} focus={current.focus} onModify={() => dispatch({ type: "OPEN_MODIFY", agentId: row.id, custom: row.membership === "custom" })} onDelete={() => { if (row.membership === "custom") dispatch({ type: "REQUEST_DELETE", agentId: row.id }); }} onDeactivate={() => dispatch({ type: "DEACTIVATE_AGENT", agentId: row.id })} onReactivate={() => dispatch({ type: "REACTIVATE_AGENT", agentId: row.id })} onBack={() => dispatch({ type: "BACK" })} /> : <text fg={props.theme.current.textMuted}>Agente no encontrado.</text>;
           if (current.kind === "modify") return row ? <ModifyPanel theme={props.theme} row={row} protectedBase={current.protectedBase} operations={props.controller.operations?.(row.id)} focus={current.focus} edit={current.edit} busy={busy()} error={operationError()} onActivate={(option) => { setOperationError(undefined); dispatch({ type: "MODIFY_ACTIVATE", option, skills: row.skills, operations: props.controller.operations?.(row.id) ?? "", value: option === "id" ? row.id : option === "description" ? row.description ?? "" : undefined }); }} onToggleSkill={(index, skill) => dispatch({ type: "EDIT_SKILLS_TOGGLE", index, skill })} onStartSkillAdd={() => dispatch({ type: "EDIT_SKILLS_START_ADD" })} onSkillAdd={(value?: string) => runInlineEdit(current, value)} onCommit={(value?: string) => runInlineEdit(current, value)} onCancel={() => { setOperationError(undefined); dispatch({ type: "EDIT_CANCEL" }); }} onBack={() => { setOperationError(undefined); dispatch({ type: "BACK" }); }} /> : <text fg={props.theme.current.textMuted}>Agente no encontrado.</text>;
          if (current.kind === "model") { const options = row ? props.modelOptions?.(row) ?? [] : []; const error = selectionErrorPresentation(operationError()); return row ? <ModelSelect theme={props.theme} row={row} models={options.map((option) => option.value)} modelOptions={options} currentValue={row.model} focus={current.focus} error={error?.message} onSelect={(model) => { setOperationError(undefined); void applyModelSelection(props.controller, row.id, model, dispatch, setBusy).catch((caught) => setOperationError(operationErrorMessage(caught))); }} /> : <text fg={props.theme.current.textMuted}>Agente no encontrado.</text>; }
         if (current.kind === "effort") { const options = row ? (props.variantOptions?.(row, row.model ?? "") ?? [{ title: "default", value: "" }]).map((option) => option.value || "default") : []; const error = selectionErrorPresentation(operationError()); return row ? <EffortSelect theme={props.theme} row={row} variants={options} focus={current.focus} error={error?.message} onSelect={(effort) => { setOperationError(undefined); void applyEffortSelection(props.controller, row.id, effort, dispatch, setBusy).catch((caught) => setOperationError(operationErrorMessage(caught))); }} /> : <text fg={props.theme.current.textMuted}>Agente no encontrado.</text>; }
         if (current.kind === "delete") return row ? <DeleteWarning theme={props.theme} row={row} focus={current.confirmFocus} error={operationError()} onConfirm={() => { setOperationError(undefined); setBusy(true); void confirmDelete(props.controller, row.id, dispatch).then((error) => setOperationError(error)).finally(() => setBusy(false)); }} onCancel={() => { setOperationError(undefined); void cancelDelete(props.controller, row.id, dispatch); }} /> : <text fg={props.theme.current.textMuted}>Agente no encontrado.</text>;
        if (current.kind === "create") return <CreateAgent theme={props.theme} draft={current.draft} step={current.step} focus={current.focus} error={operationError()} onInput={(field, value) => dispatch({ type: "CREATE_INPUT", field, value })} onNext={() => advanceCreate(current)} onPrevious={() => dispatch({ type: "CREATE_PREV" })} onSubmit={() => runCreate(current.draft)} />;
        return <text fg={props.theme.current.textMuted}>{operationError() ?? "Pantalla en preparación"}</text>;
      })()}
    </SuiteShell>
  );
}

export { eventForKey };
