import { createSignal, onCleanup, onMount, type JSX } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import type { KeyEvent } from "@opencode-ai/plugin/tui";
import type { MouseEvent } from "@opentui/core";
import type { TuiDialogSelectOption, TuiTheme } from "@opencode-ai/plugin/tui";
import { initialNavState, reduceNav, type NavEvent, type NavState } from "./agent-suite-nav.ts";
import { modifyOptions } from "./agent-suite-vm.ts";
import type { AgentSuiteController } from "./agent-suite-controller.ts";
import { screenTitle } from "./agent-suite-vm.ts";
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

export interface AgentSuiteAppProps {
  theme: TuiTheme;
  controller: AgentSuiteController;
  onClose: () => void;
  registerEscapeHandler?: (handler: () => boolean) => () => void;
  modelOptions?: (row: import("../core/types.ts").AgentCatalogRow) => readonly TuiDialogSelectOption<string>[];
  variantOptions?: (row: import("../core/types.ts").AgentCatalogRow, model: string) => readonly TuiDialogSelectOption<string>[];
}

export function dispatchMouse(event: MouseEvent, action: () => void): boolean {
  if (event.button !== 0) return false;
  event.preventDefault();
  event.stopPropagation();
  action();
  return true;
}

export function handleNestedScreenEscape(state: NavState, dispatch: (event: NavEvent) => void): boolean {
  const screen = state.stack.at(-1);
  if (!screen || state.closing || screen.kind === "landing") return false;
  dispatch({ type: "BACK" });
  return true;
}

function modifyOptionAtFocus(row: Pick<import("../core/types.ts").AgentCatalogRow, "membership"> | undefined, focus: number): "model" | "effort" | "skills" | "operations" | "back" {
  const labels = row ? modifyOptions(row) : ["model", "effort", "skills", "operations", "back"];
  const option = labels[focus];
  return option === "Modelo de IA" || option === "model" ? "model"
    : option === "Nivel de esfuerzo" || option === "effort" ? "effort"
      : option === "Skills" || option === "skills" ? "skills"
        : option === "Operaciones" || option === "operations" ? "operations"
          : "back";
}

function eventForKey(key: KeyEvent, state: NavState, catalogRowCount = 0, focusedCatalogAgentId?: string, options: { infoActionCount?: number; modifyOptionCount?: number; focusedModel?: string; focusedEffort?: string; models?: readonly string[]; efforts?: readonly string[]; canDelete?: boolean; isCustom?: boolean } = {}): NavEvent | undefined {
  const screen = state.stack.at(-1);
  if (!screen || state.closing) return undefined;
  if (key.name === "escape") return screen.kind === "landing" ? { type: "REQUEST_CLOSE" } : { type: "BACK" };
  if (key.name === "f10") return { type: "REQUEST_CLOSE" };
  if (key.name === "f2") return { type: "ACTIVATE_LANDING_ITEM", index: 0 };
  if (key.name === "f3") return { type: "ACTIVATE_LANDING_ITEM", index: 1 };
  if (key.name === "f5" && screen.kind === "info") return { type: "OPEN_MODIFY", agentId: screen.agentId, custom: options.isCustom };
  if (key.name === "f8" && screen.kind === "info") return options.isCustom === true ? { type: "REQUEST_DELETE", agentId: screen.agentId } : undefined;
  const maxFocus = screen.kind === "landing" ? 1 : screen.kind === "catalog" ? Math.max(0, Math.min(5, catalogRowCount - screen.page * 6 - 1)) : screen.kind === "info" ? Math.max(0, (options.infoActionCount ?? 1) - 1) : screen.kind === "modify" ? Math.max(0, (options.modifyOptionCount ?? 1) - 1) : screen.kind === "model" ? Math.max(0, (options.models?.length ?? 0) - 1) : screen.kind === "effort" ? Math.max(0, (options.efforts?.length ?? 1) - 1) : screen.kind === "delete" ? 1 : undefined;
  if (key.name === "up" || key.name === "left") return { type: "MOVE_FOCUS", delta: -1, maxFocus };
  if (key.name === "down" || key.name === "right") return { type: "MOVE_FOCUS", delta: 1, maxFocus };
  if (key.name === "pageup") return screen.kind === "catalog" ? { type: "PAGE", delta: -1, maxPage: Math.max(0, Math.ceil(catalogRowCount / 6) - 1) } : undefined;
  if (key.name === "pagedown") return screen.kind === "catalog" ? { type: "PAGE", delta: 1, maxPage: Math.max(0, Math.ceil(catalogRowCount / 6) - 1) } : undefined;
  if (key.name === "return" || key.name === "linefeed") {
    if (screen.kind === "create") return undefined;
    if (screen.kind === "modify" && screen.edit.mode === "operations") return undefined;
    if (screen.kind === "landing") return { type: "ACTIVATE_LANDING_ITEM", index: screen.focus };
    if (screen.kind === "catalog" && focusedCatalogAgentId) return { type: "ACTIVATE_AGENT", agentId: focusedCatalogAgentId };
    if (screen.kind === "info") return screen.focus === 0 ? { type: "OPEN_MODIFY", agentId: screen.agentId, custom: options.isCustom } : screen.focus === 1 && options.isCustom === true ? { type: "REQUEST_DELETE", agentId: screen.agentId } : { type: "BACK" };
    if (screen.kind === "modify" && screen.edit.mode === "menu") return { type: "MODIFY_ACTIVATE", option: modifyOptionAtFocus(options.isCustom === undefined ? undefined : { membership: options.isCustom ? "custom" : "seed" }, screen.focus) };
    if (screen.kind === "modify" && screen.edit.mode === "skills") return { type: "EDIT_COMMIT" };
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

export async function applyInlineEdit(controller: AgentSuiteController, agentId: string, screen: AppScreen, dispatch: (event: NavEvent) => void): Promise<string | undefined> {
  if (screen.kind !== "modify" || screen.edit.mode === "menu") return "No hay una edición activa.";
  try {
    if (screen.edit.mode === "skills") await controller.setSkills(agentId, [...screen.edit.selected]);
    else await controller.setOperations(agentId, screen.edit.prompt);
    controller.refresh();
    dispatch({ type: "EDIT_COMMIT" });
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

export async function handleInlineEditKey(key: KeyEvent, screen: AppScreen, controller: AgentSuiteController, dispatch: (event: NavEvent) => void, setError: (error?: string) => void, setBusy?: (busy: boolean) => void): Promise<boolean> {
  if (screen.kind !== "modify" || screen.edit.mode !== "skills") return false;
  if (key.name === "escape") {
    key.preventDefault();
    key.stopPropagation();
    dispatch({ type: "BACK" });
    return true;
  }
  if (key.name !== "return" && key.name !== "linefeed") return false;
  key.preventDefault();
  key.stopPropagation();
  setBusy?.(true);
  try { setError(await applyInlineEdit(controller, screen.agentId, screen, dispatch)); }
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
  try {
    await controller.createAgent({ ...draft, skills: [...draft.skills] });
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
  const [, setBusy] = createSignal(false);
  const dispatch = (event: NavEvent) => {
    const next = reduceNav(state(), event);
    setState(next);
    if (event.type === "REQUEST_CLOSE" && next.closing) props.onClose();
  };
  const runInlineEdit = (screen: AppScreen) => {
    setBusy(true);
    void applyInlineEdit(props.controller, "agentId" in screen ? screen.agentId : "", screen, dispatch).then((error) => setOperationError(error)).finally(() => setBusy(false));
  };
  const runCreate = (draft: CreateDraft) => {
    setBusy(true);
    void applyCreateSubmission(props.controller, draft, dispatch).then((error) => setOperationError(error)).finally(() => setBusy(false));
  };
  const advanceCreate = (current: Extract<AppScreen, { kind: "create" }>) => setOperationError(advanceCreateDraft(current.draft, current.step, dispatch));
  const handleNestedEscape = () => {
    return handleNestedScreenEscape(state(), dispatch);
  };
  onMount(() => {
    const unregister = props.registerEscapeHandler?.(handleNestedEscape);
    onCleanup(() => unregister?.());
  });
  useKeyboard((key) => {
    const current = state().stack.at(-1);
    if (current?.kind === "modify" && current.edit.mode === "skills") {
      if (key.name === "return" || key.name === "linefeed" || key.name === "escape") {
        void handleInlineEditKey(key, current, props.controller, dispatch, setOperationError, setBusy);
        return;
      }
    }
    const focusedCatalogAgentId = current?.kind === "catalog" ? props.controller.snapshot().rows[current.page * 6 + current.focus]?.id : undefined;
    const snapshot = props.controller.snapshot();
    const focusedRow = current && "agentId" in current ? snapshot.rows.find((item) => item.id === current.agentId) : undefined;
    const modelOptions = focusedRow ? props.modelOptions?.(focusedRow) ?? [] : [];
    const effortOptions = focusedRow ? (props.variantOptions?.(focusedRow, focusedRow.model ?? "") ?? [{ title: "default", value: "" }]).map((option) => option.value || "default") : [];
    const event = eventForKey(key, state(), snapshot.rows.length, focusedCatalogAgentId, (() => {
      const screen = state().stack.at(-1);
      const row = screen && "agentId" in screen ? snapshot.rows.find((item) => item.id === screen.agentId) : undefined;
      return {
        infoActionCount: row ? row.membership === "custom" ? 3 : 2 : undefined,
        modifyOptionCount: row ? modifyOptions(row).length : undefined,
        focusedModel: modelOptions[current?.kind === "model" ? current.focus : 0]?.value,
        focusedEffort: effortOptions[current?.kind === "effort" ? current.focus : 0],
        models: modelOptions.map((option) => option.value),
        efforts: effortOptions,
        canDelete: row?.membership === "custom",
        isCustom: row?.membership === "custom",
      };
    })());
    if (!event) return;
    key.preventDefault();
    key.stopPropagation();
    dispatch(event);
  });

  const screen = () => state().stack.at(-1) ?? { kind: "landing", focus: 0 } as const;
  const snapshot = () => props.controller.snapshot();
  return (
    <SuiteShell theme={props.theme} title={screenTitle(screen())}>
      {renderError() ? <ErrorPanel theme={props.theme} message={renderError()!} onRetry={() => setRenderError(undefined)} onClose={props.onClose} /> : (() => {
        const current = screen();
        if (current.kind === "landing") return <Landing theme={props.theme} focus={current.focus} onActivate={(index) => dispatch({ type: "ACTIVATE_LANDING_ITEM", index })} />;
        if (current.kind === "catalog") return <Catalog theme={props.theme} rows={snapshot().rows} page={current.page} focus={current.focus} onActivate={(identity) => dispatch({ type: "ACTIVATE_AGENT", agentId: identity.agentId })} onPage={(delta) => dispatch({ type: "PAGE", delta, maxPage: Math.max(0, Math.ceil(snapshot().rows.length / 6) - 1) })} />;
         const row = "agentId" in current ? snapshot().rows.find((item) => item.id === current.agentId) : undefined;
         if (current.kind === "info") return row ? <AgentInfo theme={props.theme} row={row} operations={props.controller.operations?.(row.id)} focus={current.focus} onModify={() => dispatch({ type: "OPEN_MODIFY", agentId: row.id, custom: row.membership === "custom" })} onDelete={() => { if (row.membership === "custom") dispatch({ type: "REQUEST_DELETE", agentId: row.id }); }} onBack={() => dispatch({ type: "BACK" })} /> : <text fg={props.theme.current.textMuted}>Agente no encontrado.</text>;
         if (current.kind === "modify") return row ? <ModifyPanel theme={props.theme} row={row} focus={current.focus} edit={current.edit} error={operationError()} onActivate={(option) => dispatch({ type: "MODIFY_ACTIVATE", option, skills: row.skills, operations: props.controller.operations?.(row.id) ?? "" })} onToggleSkill={(_index, skill) => dispatch({ type: "EDIT_SKILLS_TOGGLE", index: current.edit.mode === "skills" ? current.edit.focus : 0, skill })} onOperationsInput={(value) => dispatch({ type: "EDIT_OPERATIONS_INPUT", value })} onCommit={() => runInlineEdit(current)} onCancel={() => dispatch({ type: "EDIT_CANCEL" })} onBack={() => dispatch({ type: "BACK" })} /> : <text fg={props.theme.current.textMuted}>Agente no encontrado.</text>;
         if (current.kind === "model") { const options = row ? props.modelOptions?.(row) ?? [] : []; return row ? <ModelSelect theme={props.theme} row={row} models={options.map((option) => option.value)} modelOptions={options} focus={current.focus} onSelect={(model) => void applyModelSelection(props.controller, row.id, model, dispatch, setBusy).catch((error) => setOperationError(error instanceof Error ? error.message : String(error)))} /> : <text fg={props.theme.current.textMuted}>Agente no encontrado.</text>; }
         if (current.kind === "effort") { const options = row ? (props.variantOptions?.(row, row.model ?? "") ?? [{ title: "default", value: "" }]).map((option) => option.value || "default") : []; return row ? <EffortSelect theme={props.theme} row={row} variants={options} focus={current.focus} onSelect={(effort) => void applyEffortSelection(props.controller, row.id, effort, dispatch, setBusy).catch((error) => setOperationError(error instanceof Error ? error.message : String(error)))} /> : <text fg={props.theme.current.textMuted}>Agente no encontrado.</text>; }
        if (current.kind === "delete") return row ? <DeleteWarning theme={props.theme} row={row} focus={current.confirmFocus} error={operationError()} onConfirm={() => void confirmDelete(props.controller, row.id, dispatch).then((error) => setOperationError(error))} onCancel={() => void cancelDelete(props.controller, row.id, dispatch)} /> : <text fg={props.theme.current.textMuted}>Agente no encontrado.</text>;
        if (current.kind === "create") return <CreateAgent theme={props.theme} draft={current.draft} step={current.step} focus={current.focus} error={operationError()} onInput={(field, value) => dispatch({ type: "CREATE_INPUT", field, value })} onNext={() => advanceCreate(current)} onPrevious={() => dispatch({ type: "CREATE_PREV" })} onSubmit={() => runCreate(current.draft)} />;
        return <text fg={props.theme.current.textMuted}>{operationError() ?? "Pantalla en preparación"}</text>;
      })()}
    </SuiteShell>
  );
}

export { eventForKey };
