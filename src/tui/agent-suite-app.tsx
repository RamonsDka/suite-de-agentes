import { createSignal, onCleanup, onMount, type JSX } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import type { KeyEvent } from "@opencode-ai/plugin/tui";
import type { MouseEvent } from "@opentui/core";
import type { TuiDialogSelectOption, TuiTheme } from "@opencode-ai/plugin/tui";
import { appendInterviewAnswer, applyInterviewTurn, createInterviewSession, EMPTY_DRAFT, initialNavState, preserveInterviewError, reduceNav, type InterviewSession, type NavEvent, type NavState } from "./agent-suite-nav.ts";
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
import { CoordinatorConfig, coordinatorSelectionOptions, type RuntimeCoordinatorProvider } from "./screens/coordinator-config.tsx";
import { DeleteWarning } from "./screens/delete-warning.tsx";
import { ErrorPanel } from "./screens/error-panel.tsx";
import type { CreateDraft, AppScreen } from "./agent-suite-nav.ts";
import { screenKeyHints, screenKeyHintsForScreen, selectionErrorPresentation, SelectableRow, StatusBadge } from "./visual-primitives.tsx";
import { validateSkillInput } from "./screens/modify-panel.tsx";
import { isSubmitKey } from "./key-handling.ts";
import { SkillPicker } from "./screens/skill-picker.tsx";
import type { SkillCandidate } from "../core/skill-catalog.ts";
import { AiPreview, type AiPreviewAction } from "./screens/ai-preview.tsx";
import { AiInterview } from "./screens/ai-interview.tsx";
import type { CoordinatorSession, InstalledSkillInput } from "../core/coordinator.ts";
import { runInterviewTurn } from "../core/coordinator.ts";
import type { CoordinatorConfig as CoordinatorConfigShape, InterviewCheckpoint } from "../core/types.ts";
import { validateAgentId, validateModelId, validateVariantId } from "../core/config.ts";

export interface AgentSuiteAppProps {
  theme: TuiTheme;
  controller: AgentSuiteController;
  onClose: () => void;
  registerEscapeHandler?: (handler: () => boolean) => () => void;
  modelOptions?: (row: import("../core/types.ts").AgentCatalogRow) => readonly TuiDialogSelectOption<string>[];
  variantOptions?: (row: import("../core/types.ts").AgentCatalogRow, model: string) => readonly TuiDialogSelectOption<string>[];
  coordinatorProviders?: readonly RuntimeCoordinatorProvider[];
  installedSkills?: () => Promise<readonly SkillCandidate[]>;
  coordinatorSession?: CoordinatorSession;
}

export { appendInterviewAnswer, createInterviewSession } from "./agent-suite-nav.ts";

export function interviewSessionFromDraft(draft: CreateDraft): InterviewSession {
  return createInterviewSession(draft);
}

export function appendInterviewTurn(session: InterviewSession, answer: string): InterviewSession {
  return appendInterviewAnswer(session, answer);
}

export function reenterInterviewFromPreview(session: InterviewSession, draft: CreateDraft): InterviewSession {
  return {
    ...session,
    checkpoint: {
      ...session.checkpoint,
      draft: { ...draft, skills: [...draft.skills] },
      pendingSkills: [...session.checkpoint.pendingSkills],
      ...(session.checkpoint.recommendation ? { recommendation: { ...session.checkpoint.recommendation } } : {}),
    },
    error: undefined,
    canceled: false,
  };
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
  if (screen.kind === "ai-interview") {
    dispatch({ type: "INTERVIEW_CANCEL" });
    return true;
  }
  dispatch({ type: "BACK" });
  return true;
}

export function suiteScreenKeybar(screen: AppScreen, hasRenderError = false, capability?: { canDelete?: boolean; canDeactivate?: boolean; canReactivate?: boolean }): string {
  return hasRenderError ? screenKeyHints("error") : screen.kind === "info" ? screenKeyHints("info", capability) : screenKeyHintsForScreen(screen);
}

function validateApprovedDraft(draft: CreateDraft): string | undefined {
  try {
    if (!draft.id.trim()) return "El identificador es obligatorio.";
    if (!draft.description.trim()) return "La descripción es obligatoria.";
    if (!draft.model.trim()) return "El modelo es obligatorio.";
    if (!draft.effort.trim()) return "El esfuerzo es obligatorio.";
    validateAgentId(draft.id.trim());
    validateModelId(draft.model);
    validateVariantId(draft.effort);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function modifyOptionAtFocus(row: Pick<import("../core/types.ts").AgentCatalogRow, "membership"> | undefined, focus: number, fullBaseEditing = false): EditorField | "back" {
  if (row) return editorFields({ ...row, fullBaseEditing })[focus] ?? "back";
  return focus === 0 ? "model" : focus === 1 ? "effort" : "back";
}

function legacyModifyOptionAtFocus(isCustom: boolean | undefined, focus: number): EditorField | "back" {
  const options = isCustom ? ["model", "effort", "skills", "operations", "back"] : ["model", "effort", "back"];
  return (options[focus] as EditorField | "back" | undefined) ?? "back";
}

export async function applyCreateSubmission(controller: AgentSuiteController, draft: CreateDraft, dispatch: (event: NavEvent) => void): Promise<string | undefined> {
  const validationError = validateApprovedDraft(draft);
  if (validationError) return validationError;
  const normalizedDraft = { ...draft, id: draft.id.trim(), skills: [...draft.skills] };
  try {
    await controller.createAgent(normalizedDraft);
    controller.refresh();
    dispatch({ type: "AI_PREVIEW_APPLIED" });
    return undefined;
  } catch (error) {
    return operationErrorMessage(error);
  }
}

export async function finalizeCreateSubmission(controller: AgentSuiteController, draft: CreateDraft, dispatch: (event: NavEvent) => void, close: () => void): Promise<string | undefined> {
  const error = await applyCreateSubmission(controller, draft, dispatch);
  if (!error) close();
  return error;
}

function eventForKey(key: KeyEvent, state: NavState, catalogRowCount = 0, focusedCatalogAgentId?: string, options: { infoActionCount?: number; modifyOptionCount?: number; focusedModel?: string; focusedModelProvider?: string; focusedEffort?: string; models?: readonly string[]; efforts?: readonly string[]; coordinatorOptions?: readonly string[]; skillOptions?: readonly string[]; interviewReplies?: readonly string[]; interviewInputFocus?: number; interviewActionCount?: number; canDelete?: boolean; isCustom?: boolean; isEnabled?: boolean; isDisabled?: boolean } = {}): NavEvent | undefined {
  const screen = state.stack.at(-1);
  if (!screen || state.closing) return undefined;
  if (key.name === "escape") {
    if (screen.kind === "catalog" && screen.searchFocused === true) return undefined;
    if (screen.kind === "modify" && (screen.edit.mode === "text" || screen.edit.mode === "operations" || screen.edit.mode === "skills" && screen.edit.adding)) return undefined;
    if (screen.kind === "ai-interview") return { type: "INTERVIEW_CANCEL" };
    return screen.kind === "landing" ? { type: "REQUEST_CLOSE" } : { type: "BACK" };
  }
  const ownsKeyboardInput = screen.kind === "catalog" && screen.searchFocused === true || screen.kind === "skill-picker"
    || screen.kind === "ai-interview"
    || screen.kind === "modify" && screen.edit.mode !== "menu";
  if (key.name === "f10") return screen.kind === "modify" && screen.edit.mode === "menu" ? { type: "FINALIZE_MODIFY" } : ownsKeyboardInput ? undefined : { type: "REQUEST_CLOSE" };
  if (screen.kind === "catalog" && screen.searchFocused) {
    return undefined;
  }
  if (screen.kind === "skill-picker" || screen.kind === "modify" && (screen.edit.mode === "text" || screen.edit.mode === "operations" || screen.edit.mode === "skills" && screen.edit.adding)) return undefined;
  if (key.name === "/" && screen.kind === "catalog") return { type: "FOCUS_CATALOG_SEARCH" };
  if (key.name === "f2") return { type: "ACTIVATE_LANDING_ITEM", index: 0 };
  if (key.name === "f3") return { type: "ACTIVATE_LANDING_ITEM", index: 1 };
  if (key.name === "f5" && screen.kind === "info") return options.isDisabled === true ? undefined : { type: "OPEN_MODIFY", agentId: screen.agentId, custom: options.isCustom };
  if (key.name === "f8" && screen.kind === "info") return options.isCustom === true ? { type: "REQUEST_DELETE", agentId: screen.agentId } : undefined;
  const maxFocus = screen.kind === "landing" ? 2 : screen.kind === "catalog" ? Math.max(0, Math.min(5, catalogRowCount - screen.page * 6 - 1)) : screen.kind === "info" ? Math.max(0, (options.infoActionCount ?? 1) - 1) : screen.kind === "modify" ? screen.edit.mode === "skills" ? screen.edit.skills.length : Math.max(0, (options.modifyOptionCount ?? 1) - 1) : screen.kind === "model" ? Math.max(0, (options.models?.length ?? 0) - 1) : screen.kind === "effort" ? Math.max(0, (options.efforts?.length ?? 1) - 1) : screen.kind === "coordinator" ? Math.max(0, (options.coordinatorOptions?.length ?? 1) - 1) : screen.kind === "ai-preview" ? 2 : screen.kind === "ai-gate" ? 1 : screen.kind === "ai-interview" ? Math.max(0, (options.interviewActionCount ?? ((options.interviewReplies?.length ?? 0) + 3)) - 1) : screen.kind === "delete" ? 1 : undefined;
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
      const option = legacyMenu
        ? legacyModifyOptionAtFocus(options.isCustom, screen.focus)
        : modifyOptionAtFocus(options.isCustom === undefined ? undefined : { membership: options.isCustom ? "custom" : "seed" }, screen.focus, screen.protectedBase === true);
      return { type: "MODIFY_ACTIVATE", option };
    }
    if (screen.kind === "modify" && screen.edit.mode === "skills") return screen.edit.adding ? undefined : screen.edit.focus >= screen.edit.skills.length ? { type: "EDIT_SKILLS_START_ADD" } : { type: "EDIT_COMMIT" };
    if (screen.kind === "modify" && screen.edit.mode === "operations") return { type: "EDIT_COMMIT" };
    if (screen.kind === "model" && options.focusedModel) return { type: "SELECT_MODEL", model: options.focusedModel };
    if (screen.kind === "effort" && options.focusedEffort) return { type: "SELECT_EFFORT", effort: options.focusedEffort };
    if (screen.kind === "coordinator") {
      if (screen.stage === "settings") return { type: "OPEN_COORDINATOR_SETUP" };
      const value = options.coordinatorOptions?.[screen.focus];
      if (!value) return undefined;
      if (screen.stage === "provider") return { type: "SELECT_COORDINATOR_PROVIDER", provider: value };
      if (screen.stage === "model") return { type: "SELECT_COORDINATOR_MODEL", model: value };
      return { type: "SELECT_COORDINATOR_EFFORT", effort: value };
    }
    if (screen.kind === "ai-gate") return screen.focus === 0 ? { type: "CONFIGURE_AI_GATE" } : { type: "CANCEL_AI_GATE" };
    if (screen.kind === "ai-interview") {
      const replies = options.interviewReplies ?? [];
      if (screen.focus === (options.interviewInputFocus ?? replies.length)) return undefined;
      if (screen.focus < replies.length) return { type: "INTERVIEW_QUICK_REPLY", reply: replies[screen.focus]! };
      if (screen.focus === (options.interviewInputFocus ?? replies.length) + 1) return { type: "INTERVIEW_REVIEW" };
      if (screen.focus === (options.interviewInputFocus ?? replies.length) + 2) return { type: "INTERVIEW_CANCEL" };
    }
    if (screen.kind === "ai-preview") return screen.focus === 0 ? { type: "AI_PREVIEW_APPROVE" } : screen.focus === 1 ? { type: "AI_PREVIEW_REQUEST_CHANGES" } : { type: "AI_PREVIEW_DISCARD" };
    if (screen.kind === "delete") return screen.confirmFocus === 0 ? { type: "CONFIRM_DELETE" } : { type: "CANCEL_DELETE" };
  }
  return undefined;
}

function interviewCheckpointFromDraft(draft: CreateDraft): InterviewCheckpoint {
  return { draft: { ...draft, skills: [...draft.skills] }, pendingSkills: [] };
}

function checkpointDraft(checkpoint: InterviewCheckpoint): CreateDraft {
  return { ...checkpoint.draft, skills: [...checkpoint.draft.skills] };
}

export async function runInterviewSessionTurn(
  session: CoordinatorSession | undefined,
  coordinator: CoordinatorConfigShape | undefined,
  interview: InterviewSession,
  installedSkills: readonly InstalledSkillInput[],
  signal: AbortSignal,
  onProgress?: (text: string) => void,
): Promise<InterviewSession> {
  if (!session || !coordinator) return preserveInterviewError(interview, "El coordinador no está configurado.");
  try {
    const turn = await runInterviewTurn({ session, coordinator, transcript: interview.transcript, checkpoint: interview.checkpoint ?? interviewCheckpointFromDraft(EMPTY_DRAFT), installedSkills, signal, onProgress });
    if (turn.question === "We kept your last checkpoint. Please retry this turn.") return preserveInterviewError(interview, "The coordinator returned an invalid turn. Retry to continue.");
    return applyInterviewTurn(interview, turn);
  } catch (error) {
    if (signal.aborted) return preserveInterviewError(interview, "La respuesta se canceló. El punto de control sigue disponible para reintentar.");
    return preserveInterviewError(interview, operationErrorMessage(error));
  }
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

export async function applyCoordinatorSelection(controller: AgentSuiteController, provider: string, model: string, effort: string, dispatch: (event: NavEvent) => void, setBusy?: (busy: boolean) => void): Promise<void> {
  if (!controller.setCoordinator) throw new Error("La configuración del coordinador no está disponible en este host.");
  setBusy?.(true);
  try {
    await controller.setCoordinator({ provider, model, ...(effort ? { effort } : {}) });
    controller.refresh();
    dispatch({ type: "SELECT_COORDINATOR_EFFORT", effort });
  } finally { setBusy?.(false); }
}

export async function handleCoordinatorSelectionKey(key: KeyEvent, event: NavEvent, state: NavState, controller: AgentSuiteController, dispatch: (event: NavEvent) => void, setError: (error?: string) => void, setBusy?: (busy: boolean) => void): Promise<boolean> {
  const screen = state.stack.at(-1);
  if (!isSubmitKey(key) || event.type !== "SELECT_COORDINATOR_EFFORT" || screen?.kind !== "coordinator" || screen.stage !== "effort" || !screen.provider || !screen.model) return false;
  key.preventDefault();
  key.stopPropagation();
  setError(undefined);
  try {
    await applyCoordinatorSelection(controller, screen.provider, screen.model, event.effort, dispatch, setBusy);
  } catch (error) {
    setError(operationErrorMessage(error));
  }
  return true;
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

export async function finalizeModifySubmission(save: () => Promise<string | undefined>, close: () => void): Promise<string | undefined> {
  const error = await save();
  if (!error) close();
  return error;
}

export async function finalizeModifyController(controller: AgentSuiteController, close: () => void): Promise<string | undefined> {
  try {
    return await finalizeModifySubmission(async () => { controller.refresh(); return undefined; }, close);
  } catch (error) {
    return operationErrorMessage(error);
  }
}

export function AgentSuiteApp(props: AgentSuiteAppProps): JSX.Element {
  const [state, setState] = createSignal(initialNavState());
  const [renderError, setRenderError] = createSignal<string>();
  const [operationError, setOperationError] = createSignal<string>();
  const [busy, setBusy] = createSignal(false);
  const [authoringProgress, setAuthoringProgress] = createSignal<string>();
  const [interviewSession, setInterviewSession] = createSignal<InterviewSession>(createInterviewSession());
  let interviewAbort: AbortController | undefined;
  let catalogSearchDraft = "";
  const catalogRows = () => {
    const snapshot = props.controller.snapshot();
    return [...snapshot.rows, ...(snapshot.disabledRows ?? [])];
  };
  const navigationState = () => normalizeCatalogState(state(), catalogRows());
  const resetInterview = () => {
    interviewAbort?.abort();
    interviewAbort = undefined;
    setBusy(false);
    setInterviewSession(createInterviewSession());
  };
  const dispatch = (event: NavEvent) => {
    const current = navigationState();
    const currentScreen = current.stack.at(-1);
    if (event.type === "INTERVIEW_QUICK_REPLY" && currentScreen?.kind === "ai-interview") {
      submitInterviewAnswer(event.reply);
      return;
    }
    if (event.type === "INTERVIEW_RETRY" && currentScreen?.kind === "ai-interview") {
      retryInterviewTurn();
      return;
    }
    if (event.type === "INTERVIEW_CANCEL" && currentScreen?.kind === "ai-interview") resetInterview();
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
    if (event.type === "INTERVIEW_REVIEW" && currentScreen?.kind === "ai-interview") {
      const session = interviewSession();
      setState(normalizeCatalogState(reduceNav(current, { type: "OPEN_AI_PREVIEW", draft: checkpointDraft(session.checkpoint), source: currentScreen.request?.source ?? "create", agentId: currentScreen.request?.agentId, rationale: session.checkpoint.recommendation?.rationale, pendingSkills: session.checkpoint.pendingSkills, recommendation: session.checkpoint.recommendation }), catalogRows()));
      return;
    }
    if (event.type === "AI_PREVIEW_EDIT_FIELD" && currentScreen?.kind === "ai-preview") {
      setState(normalizeCatalogState(reduceNav(current, event), catalogRows()));
      return;
    }
    if (event.type === "AI_PREVIEW_REQUEST_CHANGES" && currentScreen?.kind === "ai-preview") {
      const source = current.stack.at(-2);
      if (source?.kind === "ai-interview") {
        setInterviewSession((session) => reenterInterviewFromPreview(session, currentScreen.draft));
        setState(normalizeCatalogState(reduceNav(current, event), catalogRows()));
        return;
      }
    }
    const routedEvent: NavEvent = event.type === "ACTIVATE_LANDING_ITEM" && event.index === 1
      ? { ...event, coordinatorConfigured: Boolean(props.controller.coordinator?.()) }
      : event.type === "CREATE_START"
        ? { ...event, coordinatorConfigured: Boolean(props.controller.coordinator?.()) }
        : event;
    const next = normalizeCatalogState(reduceNav(current, routedEvent), catalogRows());
    const nextScreen = next.stack.at(-1);
    if (nextScreen?.kind === "ai-interview" && currentScreen?.kind !== "ai-interview") setInterviewSession(createInterviewSession(nextScreen.request?.draft));
    setState(next);
    if (routedEvent.type === "REQUEST_CLOSE" && next.closing) props.onClose();
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
    void applyInlineEdit(props.controller, "agentId" in target ? target.agentId ?? "" : "", target, dispatch).then((error) => setOperationError(error)).finally(() => setBusy(false));
  };
  const loadInstalledSkills = () => {
    if (!props.installedSkills) return Promise.resolve<readonly SkillCandidate[]>([]);
    return props.installedSkills();
  };
  const submitInterviewAnswer = (answer: string) => {
    if (busy() || !answer.trim()) return;
    const nextSession = appendInterviewAnswer(interviewSession(), answer);
    const requestSignal = new AbortController();
    interviewAbort?.abort();
    interviewAbort = requestSignal;
    setInterviewSession(nextSession);
    const coordinator = props.controller.coordinator?.();
    if (!coordinator || !props.coordinatorSession) {
      setInterviewSession((session) => preserveInterviewError(session, "Configura el coordinador para continuar."));
      return;
    }
    setBusy(true);
    setOperationError(undefined);
    void loadInstalledSkills().then((skills) => runInterviewSessionTurn(props.coordinatorSession, coordinator, nextSession, skills, requestSignal.signal, setAuthoringProgress))
      .then(setInterviewSession)
      .finally(() => { interviewAbort = undefined; setBusy(false); });
  };
  const retryInterviewTurn = () => {
    if (busy()) return;
    const coordinator = props.controller.coordinator?.();
    if (!coordinator || !props.coordinatorSession) {
      setInterviewSession((session) => preserveInterviewError(session, "Configura el coordinador para reintentar."));
      return;
    }
    interviewAbort?.abort();
    interviewAbort = new AbortController();
    setBusy(true);
    setOperationError(undefined);
    void loadInstalledSkills().then((skills) => runInterviewSessionTurn(props.coordinatorSession, coordinator, interviewSession(), skills, interviewAbort!.signal, setAuthoringProgress))
      .then(setInterviewSession)
      .finally(() => { interviewAbort = undefined; setBusy(false); });
  };
  const cancelInterview = () => {
    dispatch({ type: "INTERVIEW_CANCEL" });
  };
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
    if (key.name === "escape" && interviewAbort) {
      interviewAbort.abort();
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
    const coordinatorOptions = current?.kind === "coordinator" && current.stage !== "settings"
      ? coordinatorSelectionOptions(current.stage, props.coordinatorProviders ?? [], current.provider, current.model).map((option) => option.value)
      : [];
    const event = eventForKey(key, currentNavigation, catalogRowCount, focusedCatalogAgentId, (() => {
      const screen = currentNavigation.stack.at(-1);
      const row = screen && "agentId" in screen ? [...snapshot.rows, ...(snapshot.disabledRows ?? [])].find((item) => item.id === screen.agentId) : undefined;
      const interview = screen?.kind === "ai-interview" ? interviewSession() : undefined;
      return {
        infoActionCount: row ? row.disabled ? 2 : 3 : undefined,
        modifyOptionCount: row ? editorFields({ ...row, fullBaseEditing: row.membership === "seed" }).length : undefined,
        focusedModel: modelOptions[current?.kind === "model" ? current.focus : 0]?.value,
        focusedEffort: effortOptions[current?.kind === "effort" ? current.focus : 0],
        models: modelOptions.map((option) => option.value),
        efforts: effortOptions,
        coordinatorOptions,
        interviewReplies: interview?.turn?.quickReplies,
        interviewInputFocus: interview?.turn?.quickReplies.length ?? 0,
        interviewActionCount: (interview?.turn?.quickReplies.length ?? 0) + 3,
        canDelete: row?.membership === "custom",
        isCustom: row?.membership === "custom",
        isEnabled: row?.enabled,
        isDisabled: row?.disabled === true,
      };
    })());
    if (!event) return;
    if (event.type === "SELECT_COORDINATOR_EFFORT") {
      void handleCoordinatorSelectionKey(key, event, currentNavigation, props.controller, dispatch, setOperationError, setBusy);
      return;
    }
    if (event.type === "FINALIZE_MODIFY" && current?.kind === "modify") {
      key.preventDefault();
      key.stopPropagation();
      setBusy(true);
      void finalizeModifyController(props.controller, () => { dispatch({ type: "FINALIZE_MODIFY" }); props.onClose(); }).then((error) => setOperationError(error)).finally(() => setBusy(false));
      return;
    }
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
      {busy() ? <StatusBadge theme={props.theme} status="info">{authoringProgress() ?? "Guardando cambios…"}</StatusBadge> : null}
      {renderError() ? <ErrorPanel theme={props.theme} message={renderError()!} onRetry={() => setRenderError(undefined)} onClose={props.onClose} /> : (() => {
        const current = screen();
        if (current.kind === "landing") return <Landing theme={props.theme} focus={current.focus} coordinator={props.controller.coordinator?.()} onActivate={(index) => dispatch({ type: "ACTIVATE_LANDING_ITEM", index })} />;
        if (current.kind === "catalog") {
          const catalogRows = [...snapshot().rows, ...(snapshot().disabledRows ?? [])];
          return <Catalog theme={props.theme} rows={catalogRows} page={current.page} focus={current.focus} query={current.query} searchFocused={current.searchFocused} onDraftChange={(value) => { catalogSearchDraft = value; }} onFocusResults={(query) => dispatch({ type: "FOCUS_CATALOG_RESULTS", query })} onFocusSearch={() => { catalogSearchDraft = current.query; dispatch({ type: "FOCUS_CATALOG_SEARCH" }); }} onMoveFocus={(delta, maxFocus) => dispatch({ type: "MOVE_FOCUS", delta, maxFocus })} onActivate={(identity) => dispatch({ type: "ACTIVATE_AGENT", agentId: identity.agentId })} onPage={(delta) => dispatch({ type: "PAGE", delta, maxPage: Math.max(0, Math.ceil(filterCatalogRows(catalogRows, current.searchFocused ? catalogSearchDraft : current.query).length / 6) - 1) })} />;
        }
        if (current.kind === "coordinator") {
          const providers = props.coordinatorProviders ?? [];
          const values = current.stage === "settings" ? [] : coordinatorSelectionOptions(current.stage, providers, current.provider, current.model).map((option) => option.value);
          return <CoordinatorConfig theme={props.theme} stage={current.stage} focus={current.focus} coordinator={props.controller.coordinator?.()} providers={providers} provider={current.provider} model={current.model} onSetup={() => dispatch({ type: "OPEN_COORDINATOR_SETUP" })} onProvider={(provider) => dispatch({ type: "SELECT_COORDINATOR_PROVIDER", provider })} onModel={(model) => dispatch({ type: "SELECT_COORDINATOR_MODEL", model })} onEffort={(effort) => { if (!current.provider || !current.model) return; setOperationError(undefined); void applyCoordinatorSelection(props.controller, current.provider, current.model, effort, dispatch, setBusy).catch((caught) => setOperationError(operationErrorMessage(caught))); }} />;
        }
        if (current.kind === "skill-picker") return <SkillPicker theme={props.theme} installed={current.installed} selected={current.selected} query={current.query} focus={current.focus} onQuery={(value) => dispatch({ type: "SKILL_PICKER_QUERY", value })} onToggle={(skill) => dispatch({ type: "SKILL_PICKER_TOGGLE", skill })} />;
        if (current.kind === "ai-gate") return <box flexDirection="column" gap={1}><text fg={props.theme.current.error}>Configura un coordinador para continuar.</text><SelectableRow theme={props.theme} selected={current.focus === 0} onActivate={() => dispatch({ type: "CONFIGURE_AI_GATE" })}>Configurar ahora</SelectableRow><SelectableRow theme={props.theme} selected={current.focus === 1} onActivate={() => dispatch({ type: "CANCEL_AI_GATE" })}>Cancelar</SelectableRow></box>;
        if (current.kind === "ai-interview") return <AiInterview theme={props.theme} session={interviewSession()} turn={interviewSession().turn} focus={current.focus} busy={busy()} error={interviewSession().error ?? operationError()} onInput={(value) => { setInterviewSession((session) => ({ ...session, input: value, error: undefined })); }} onQuickReply={(reply) => submitInterviewAnswer(reply)} onSubmit={(value) => submitInterviewAnswer(value)} onReview={() => dispatch({ type: "INTERVIEW_REVIEW" })} onRetry={retryInterviewTurn} onCancel={cancelInterview} />;
        if (current.kind === "ai-preview") return <AiPreview theme={props.theme} draft={current.draft} focus={current.focus} recommendation={current.recommendation} pendingSkills={current.pendingSkills} onEdit={(field, value) => dispatch({ type: "AI_PREVIEW_EDIT_FIELD", field, value })} onAction={(action: AiPreviewAction) => dispatch({ type: action === "Approve" ? "AI_PREVIEW_APPROVE" : action === "Request changes" ? "AI_PREVIEW_REQUEST_CHANGES" : "AI_PREVIEW_DISCARD" })} />;
        const catalogSource = current.kind === "info" || current.kind === "modify" || current.kind === "model" || current.kind === "effort" || current.kind === "delete" ? (current as { agentId: string }).agentId : undefined;
        const row = catalogSource ? [...snapshot().rows, ...(snapshot().disabledRows ?? [])].find((item) => item.id === catalogSource) : undefined;
        if (current.kind === "info") return row ? <AgentInfo theme={props.theme} row={row} operations={props.controller.operations?.(row.id)} focus={current.focus} onModify={() => dispatch({ type: "OPEN_MODIFY", agentId: row.id, custom: row.membership === "custom" })} onDelete={() => { if (row.membership === "custom") dispatch({ type: "REQUEST_DELETE", agentId: row.id }); }} onDeactivate={() => dispatch({ type: "DEACTIVATE_AGENT", agentId: row.id })} onReactivate={() => dispatch({ type: "REACTIVATE_AGENT", agentId: row.id })} onBack={() => dispatch({ type: "BACK" })} /> : <text fg={props.theme.current.textMuted}>Agente no encontrado.</text>;
        if (current.kind === "modify") return row ? <ModifyPanel theme={props.theme} row={row} protectedBase={current.protectedBase} operations={props.controller.operations?.(row.id)} focus={current.focus} edit={current.edit} busy={busy()} error={operationError()} onActivate={(option) => { setOperationError(undefined); dispatch({ type: "MODIFY_ACTIVATE", option, skills: row.skills, operations: props.controller.operations?.(row.id) ?? "", value: option === "id" ? row.id : option === "description" ? row.description ?? "" : undefined }); }} onToggleSkill={(index, skill) => dispatch({ type: "EDIT_SKILLS_TOGGLE", index, skill })} onStartSkillAdd={() => { if (!props.installedSkills) return dispatch({ type: "EDIT_SKILLS_START_ADD" }); setOperationError(undefined); setBusy(true); void props.installedSkills().then((installed) => dispatch({ type: "OPEN_SKILL_PICKER", installed })).catch((error) => setOperationError(operationErrorMessage(error))).finally(() => setBusy(false)); }} onSkillAdd={(value?: string) => runInlineEdit(current, value)} onCommit={(value?: string) => runInlineEdit(current, value)} onCancel={() => { setOperationError(undefined); dispatch({ type: "EDIT_CANCEL" }); }} onBack={() => { setOperationError(undefined); dispatch({ type: "BACK" }); }} /> : <text fg={props.theme.current.textMuted}>Agente no encontrado.</text>;
        if (current.kind === "model") { const options = row ? props.modelOptions?.(row) ?? [] : []; const error = selectionErrorPresentation(operationError()); return row ? <ModelSelect theme={props.theme} row={row} models={options.map((option) => option.value)} modelOptions={options} currentValue={row.model} focus={current.focus} error={error?.message} onSelect={(model) => { setOperationError(undefined); void applyModelSelection(props.controller, row.id, model, dispatch, setBusy).catch((caught) => setOperationError(operationErrorMessage(caught))); }} /> : <text fg={props.theme.current.textMuted}>Agente no encontrado.</text>; }
        if (current.kind === "effort") { const options = row ? (props.variantOptions?.(row, row.model ?? "") ?? [{ title: "default", value: "" }]).map((option) => option.value || "default") : []; const error = selectionErrorPresentation(operationError()); return row ? <EffortSelect theme={props.theme} row={row} variants={options} focus={current.focus} error={error?.message} onSelect={(effort) => { setOperationError(undefined); void applyEffortSelection(props.controller, row.id, effort, dispatch, setBusy).catch((caught) => setOperationError(operationErrorMessage(caught))); }} /> : <text fg={props.theme.current.textMuted}>Agente no encontrado.</text>; }
        if (current.kind === "delete") return row ? <DeleteWarning theme={props.theme} row={row} focus={current.confirmFocus} error={operationError()} onConfirm={() => { setOperationError(undefined); setBusy(true); void confirmDelete(props.controller, row.id, dispatch).then((error) => setOperationError(error)).finally(() => setBusy(false)); }} onCancel={() => { setOperationError(undefined); void cancelDelete(props.controller, row.id, dispatch); }} /> : <text fg={props.theme.current.textMuted}>Agente no encontrado.</text>;
        return <text fg={props.theme.current.textMuted}>{operationError() ?? "Pantalla en preparación"}</text>;
      })()}
    </SuiteShell>
  );
}

export { eventForKey };
