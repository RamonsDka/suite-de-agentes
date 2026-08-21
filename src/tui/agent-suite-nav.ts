import type { AgentCatalogRow } from "../core/types.ts";
import type { ModelRecommendation, PendingSkill } from "../core/types.ts";
import type { SkillCandidate } from "../core/skill-catalog.ts";
import { editorFields } from "./agent-suite-vm.ts";
import type { InterviewCheckpoint, InterviewTranscript, InterviewTurn } from "../core/coordinator.ts";

export type ModifyEdit =
  | { mode: "menu" }
  | { mode: "text"; field: "id" | "description" | "operations"; value: string }
  | { mode: "skills"; skills: string[]; selected?: string[]; focus: number; adding: boolean; input: string }
  | { mode: "operations"; prompt: string };

export type CreateDraft = {
  id: string;
  description: string;
  skills: string[];
  operations: string;
  model: string;
  effort: string;
};

export type CoordinatorStage = "settings" | "provider" | "model" | "effort";
export type AiIntent = "assisted-authoring" | "agent-creation-interview";
export type InterviewSource = "create" | "modify";

export type InterviewRequest = {
  source: InterviewSource;
  draft: CreateDraft;
  agentId?: string;
};

export type AppScreen =
  | { kind: "landing"; focus: 0 | 1 | 2 }
  | { kind: "catalog"; page: number; focus: number; query: string; searchFocused: boolean }
  | { kind: "info"; agentId: string; focus: number }
  | { kind: "model"; agentId: string; focus: number }
  | { kind: "effort"; agentId: string; focus: number }
  | { kind: "modify"; agentId: string; focus: number; edit: ModifyEdit; editable?: boolean; protectedBase?: boolean }
  | { kind: "delete"; agentId: string; confirmFocus: 0 | 1 }
  | { kind: "ai-interview"; focus: number; request?: InterviewRequest }
  | { kind: "coordinator"; stage: CoordinatorStage; focus: number; provider?: string; model?: string; returnIntent?: AiIntent }
  | { kind: "ai-gate"; intent: AiIntent; focus: 0 | 1; request?: InterviewRequest }
  | { kind: "ai-preview"; draft: CreateDraft; focus: 0 | 1 | 2; source: InterviewSource | "interview"; agentId?: string; rationale?: string; pendingSkills?: readonly PendingSkill[]; recommendation?: ModelRecommendation }
  | { kind: "skill-picker"; agentId: string; installed: readonly SkillCandidate[]; selected: string[]; query: string; focus: number };

export type NavState = {
  stack: AppScreen[];
  busy: boolean;
  closing: boolean;
  error?: string;
};

export type NavEvent =
  | { type: "ACTIVATE_LANDING_ITEM"; index: number; coordinatorConfigured?: boolean }
  | { type: "OPEN_COORDINATOR_SETUP" }
  | { type: "SELECT_COORDINATOR_PROVIDER"; provider: string }
  | { type: "SELECT_COORDINATOR_MODEL"; model: string }
  | { type: "SELECT_COORDINATOR_EFFORT"; effort: string }
  | { type: "REQUEST_AI_ACTION"; intent: AiIntent; request?: InterviewRequest }
  | { type: "CONFIGURE_AI_GATE" }
  | { type: "CANCEL_AI_GATE" }
  | { type: "OPEN_AI_INTERVIEW"; request: InterviewRequest }
  | { type: "OPEN_AI_PREVIEW"; draft: CreateDraft; source?: InterviewSource | "interview"; agentId?: string; rationale?: string; pendingSkills?: readonly PendingSkill[]; recommendation?: ModelRecommendation }
  | { type: "AI_PREVIEW_APPROVE" }
  | { type: "AI_PREVIEW_APPLIED" }
  | { type: "AI_PREVIEW_REQUEST_CHANGES" }
  | { type: "AI_PREVIEW_DISCARD" }
  | { type: "FINALIZE_MODIFY" }
  | { type: "ACTIVATE_AGENT"; agentId: string }
  | { type: "CATALOG_QUERY"; value: string }
  | { type: "FOCUS_CATALOG_RESULTS"; query?: string }
  | { type: "FOCUS_CATALOG_SEARCH" }
  | { type: "MOVE_FOCUS"; delta: -1 | 1; maxFocus?: number }
  | { type: "PAGE"; delta: -1 | 1; maxPage?: number }
  | { type: "OPEN_MODIFY"; agentId?: string; custom?: boolean }
  | { type: "DEACTIVATE_AGENT"; agentId: string }
  | { type: "REACTIVATE_AGENT"; agentId: string }
  | { type: "MODIFY_ACTIVATE"; option: "ai" | "id" | "description" | "model" | "effort" | "skills" | "operations" | "delete" | "back"; skills?: string[]; operations?: string; value?: string }
  | { type: "SELECT_MODEL"; model: string }
  | { type: "SELECT_EFFORT"; effort: string }
  | { type: "EDIT_SKILLS_TOGGLE"; index: number; skill?: string }
  | { type: "EDIT_SKILLS_START_ADD" }
  | { type: "EDIT_SKILLS_INPUT"; value: string }
  | { type: "EDIT_SKILLS_ADD" }
  | { type: "OPEN_SKILL_PICKER"; installed: readonly SkillCandidate[] }
  | { type: "SKILL_PICKER_QUERY"; value: string }
  | { type: "SKILL_PICKER_TOGGLE"; skill: string }
  | { type: "EDIT_TEXT_INPUT"; value: string }
  | { type: "EDIT_OPERATIONS_INPUT"; value: string }
  | { type: "EDIT_COMMIT"; agentId?: string }
  | { type: "EDIT_CANCEL" }
  | { type: "REQUEST_DELETE"; agentId?: string }
  | { type: "CONFIRM_DELETE" }
  | { type: "CANCEL_DELETE" }
  | { type: "CREATE_START"; coordinatorConfigured?: boolean }
  | { type: "INTERVIEW_QUICK_REPLY"; reply: string }
  | { type: "INTERVIEW_INPUT"; value: string }
  | { type: "INTERVIEW_SUBMIT"; value?: string }
  | { type: "INTERVIEW_TURN_STARTED" }
  | { type: "INTERVIEW_TURN_RECEIVED"; turn: InterviewTurn }
  | { type: "INTERVIEW_RETRY" }
  | { type: "INTERVIEW_CANCEL" }
  | { type: "INTERVIEW_REVIEW"; draft?: CreateDraft; rationale?: string; pendingSkills?: readonly PendingSkill[]; recommendation?: ModelRecommendation }
  | { type: "AI_PREVIEW_EDIT_FIELD"; field: "id" | "description" | "operations" | "skills" | "model" | "effort"; value: string }
  | { type: "INTERVIEW_CONTINUE" }
  | { type: "BACK" }
  | { type: "REQUEST_CLOSE" }
  | { type: "SET_BUSY"; busy: boolean }
  | { type: "SET_ERROR"; error?: string };

export const EMPTY_DRAFT: CreateDraft = { id: "", description: "", skills: [], operations: "", model: "", effort: "" };
export const AI_GATE_ACTIONS = ["Configurar ahora", "Cancelar"] as const;

export interface InterviewSession {
  transcript: InterviewTranscript;
  checkpoint: InterviewCheckpoint;
  turn?: InterviewTurn;
  input: string;
  error?: string;
  canceled?: boolean;
}

export function createInterviewSession(draft: CreateDraft = EMPTY_DRAFT): InterviewSession {
  const checkpoint: InterviewCheckpoint = { draft: { ...draft, skills: [...draft.skills] }, pendingSkills: [] };
  return {
    transcript: [],
    checkpoint,
    turn: { question: "¿Qué debe hacer este agente?", quickReplies: ["Describir el objetivo", "Partir de una idea existente"], checkpoint },
    input: "",
  };
}

export function appendInterviewAnswer(session: InterviewSession, answer: string): InterviewSession {
  const text = answer.trim();
  if (!text) return session;
  return { ...session, transcript: [...session.transcript, { role: "user", text }], input: "", error: undefined, canceled: false };
}

export function applyInterviewTurn(session: InterviewSession, turn: InterviewTurn): InterviewSession {
  return {
    ...session,
    transcript: [...session.transcript, { role: "assistant", text: turn.question }],
    turn,
    checkpoint: { ...turn.checkpoint, draft: { ...turn.checkpoint.draft, skills: [...turn.checkpoint.draft.skills] }, pendingSkills: [...turn.checkpoint.pendingSkills] },
    error: undefined,
    canceled: false,
  };
}

export function preserveInterviewError(session: InterviewSession, error: string): InterviewSession {
  return { ...session, error, canceled: false };
}

export function initialNavState(): NavState {
  return { stack: [{ kind: "landing", focus: 0 }], busy: false, closing: false };
}

function top(state: NavState): AppScreen {
  return state.stack[state.stack.length - 1] ?? { kind: "landing", focus: 0 };
}

function replaceTop(state: NavState, screen: AppScreen): NavState {
  return { ...state, stack: [...state.stack.slice(0, -1), screen] };
}

function push(state: NavState, screen: AppScreen): NavState {
  return { ...state, stack: [...state.stack, screen] };
}

function pop(state: NavState): NavState {
  return state.stack.length > 1 ? { ...state, stack: state.stack.slice(0, -1) } : state;
}

function clamp(value: number, max: number): number {
  return Math.max(0, Math.min(Math.max(0, max), value));
}

function modifyMaxFocus(screen: Extract<AppScreen, { kind: "modify" }>): number {
  return editorFields({ membership: screen.editable === true ? "custom" : "seed", fullBaseEditing: screen.protectedBase === true }).length - 1;
}

function skillDraft(skills: string[], focus = 0, adding = false, input = ""): Extract<ModifyEdit, { mode: "skills" }> {
  return { mode: "skills", skills: [...skills], selected: [...skills], focus, adding, input };
}

function cloneInterviewRequest(request: InterviewRequest): InterviewRequest {
  return { ...request, draft: { ...request.draft, skills: [...request.draft.skills] } };
}

function interviewScreen(request?: InterviewRequest): Extract<AppScreen, { kind: "ai-interview" }> {
  return request ? { kind: "ai-interview", focus: 0, request: cloneInterviewRequest(request) } : { kind: "ai-interview", focus: 0 };
}

export function reduceNav(state: NavState, event: NavEvent): NavState {
  if (event.type === "REQUEST_CLOSE") return state.closing ? state : { ...state, closing: true };
  if (event.type === "SET_BUSY") return { ...state, busy: event.busy };
  if (event.type === "SET_ERROR") return event.error === undefined ? { ...state, error: undefined } : { ...state, error: event.error };
  if (state.closing) return state;

  const screen = top(state);
  switch (event.type) {
    case "ACTIVATE_LANDING_ITEM":
      if (screen.kind !== "landing") return state;
      return event.index === 0
        ? push(state, { kind: "catalog", page: 0, focus: 0, query: "", searchFocused: false })
        : event.index === 1 ? push(state, event.coordinatorConfigured === true ? interviewScreen() : { kind: "ai-gate", intent: "agent-creation-interview", focus: 0 })
          : event.index === 2 ? push(state, { kind: "coordinator", stage: "settings", focus: 0 }) : state;
    case "OPEN_COORDINATOR_SETUP":
      return screen.kind === "coordinator" && screen.stage === "settings" ? replaceTop(state, { kind: "coordinator", stage: "provider", focus: 0, ...(screen.returnIntent === undefined ? {} : { returnIntent: screen.returnIntent }) }) : state;
    case "SELECT_COORDINATOR_PROVIDER":
      return screen.kind === "coordinator" && screen.stage === "provider" ? replaceTop(state, { kind: "coordinator", stage: "model", focus: 0, provider: event.provider, ...(screen.returnIntent === undefined ? {} : { returnIntent: screen.returnIntent }) }) : state;
    case "SELECT_COORDINATOR_MODEL":
      return screen.kind === "coordinator" && screen.stage === "model" && screen.provider ? replaceTop(state, { kind: "coordinator", stage: "effort", focus: 0, provider: screen.provider, model: event.model, ...(screen.returnIntent === undefined ? {} : { returnIntent: screen.returnIntent }) }) : state;
    case "SELECT_COORDINATOR_EFFORT":
      if (screen.kind !== "coordinator" || screen.stage !== "effort") return state;
      if (screen.returnIntent !== undefined) {
        const parent = state.stack.at(-2);
        if (parent?.kind === "ai-gate" && parent.intent === "agent-creation-interview") return { ...state, stack: [...state.stack.slice(0, -2), interviewScreen(parent.request)] };
        if (parent?.kind === "ai-gate" && parent.request) return { ...state, stack: [...state.stack.slice(0, -2), interviewScreen(parent.request)] };
        return pop(state);
      }
      return replaceTop(state, { kind: "coordinator", stage: "settings", focus: 0 });
    case "REQUEST_AI_ACTION":
      return push(state, { kind: "ai-gate", intent: event.intent, focus: 0, ...(event.request ? { request: { ...event.request, draft: { ...event.request.draft, skills: [...event.request.draft.skills] } } } : {}) });
    case "OPEN_AI_INTERVIEW":
      return screen.kind === "modify" || screen.kind === "info" ? push(state, interviewScreen(event.request)) : state;
    case "INTERVIEW_QUICK_REPLY":
      return screen.kind === "ai-interview" ? replaceTop(state, { ...screen, focus: 0 }) : state;
    case "INTERVIEW_INPUT":
      return screen.kind === "ai-interview" ? replaceTop(state, { ...screen, focus: 0 }) : state;
    case "INTERVIEW_SUBMIT":
      return screen.kind === "ai-interview" ? replaceTop(state, { ...screen, focus: 0 }) : state;
    case "INTERVIEW_TURN_STARTED":
      return screen.kind === "ai-interview" ? replaceTop(state, { ...screen, focus: 0 }) : state;
    case "INTERVIEW_TURN_RECEIVED":
      return screen.kind === "ai-interview" ? replaceTop(state, { ...screen, focus: 0 }) : state;
    case "INTERVIEW_RETRY":
      return screen.kind === "ai-interview" ? replaceTop(state, { ...screen, focus: 0 }) : state;
    case "INTERVIEW_CANCEL":
      return screen.kind === "ai-interview" ? pop(state) : state;
    case "INTERVIEW_REVIEW":
      return screen.kind === "ai-interview" && event.draft
        ? push(state, { kind: "ai-preview", draft: { ...event.draft, skills: [...event.draft.skills] }, focus: 0, source: screen.request?.source ?? "create", ...(screen.request?.agentId ? { agentId: screen.request.agentId } : {}), ...(event.rationale ? { rationale: event.rationale } : {}), ...(event.pendingSkills ? { pendingSkills: [...event.pendingSkills] } : {}), ...(event.recommendation ? { recommendation: { ...event.recommendation } } : {}) })
        : screen.kind === "ai-interview" ? replaceTop(state, { ...screen, focus: 0 }) : state;
    case "INTERVIEW_CONTINUE":
      return screen.kind === "ai-interview" ? replaceTop(state, { ...screen, focus: 0 }) : state;
    case "CONFIGURE_AI_GATE":
      return screen.kind === "ai-gate" ? push(state, { kind: "coordinator", stage: "provider", focus: 0, returnIntent: screen.intent }) : state;
    case "CANCEL_AI_GATE":
      return screen.kind === "ai-gate" ? pop(state) : state;
    case "OPEN_AI_PREVIEW":
      if (screen.kind !== "modify" && screen.kind !== "ai-interview") return state;
      {
        const source = event.source ?? (screen.kind === "modify" ? "modify" : screen.kind === "ai-interview" && screen.request?.source === "modify" ? "modify" : "interview");
        const agentId = event.agentId ?? (screen.kind === "ai-interview" ? screen.request?.agentId : undefined);
        return push(state, { kind: "ai-preview", draft: { ...event.draft, skills: [...event.draft.skills] }, focus: 0, source, ...(agentId ? { agentId } : {}), ...(event.rationale ? { rationale: event.rationale } : {}), ...(event.pendingSkills ? { pendingSkills: [...event.pendingSkills] } : {}), ...(event.recommendation ? { recommendation: { ...event.recommendation } } : {}) });
      }
    case "AI_PREVIEW_APPROVE": {
      if (screen.kind !== "ai-preview") return state;
      return state;
    }
    case "AI_PREVIEW_EDIT_FIELD":
      if (screen.kind !== "ai-preview") return state;
      return replaceTop(state, { ...screen, draft: { ...screen.draft, [event.field]: event.field === "skills" ? event.value.split(",").map((skill) => skill.trim()).filter(Boolean) : event.value } });
    case "AI_PREVIEW_APPLIED":
      return screen.kind === "ai-preview" && (state.stack.at(-2)?.kind === "ai-interview" || state.stack.at(-2)?.kind === "modify") ? { ...state, stack: state.stack.slice(0, -2) } : state;
    case "AI_PREVIEW_REQUEST_CHANGES": {
      const request = state.stack.at(-2);
      if (screen.kind !== "ai-preview") return state;
      if (request?.kind === "ai-interview") return replaceTop(pop(state), request);
      return pop(state);
    }
    case "AI_PREVIEW_DISCARD":
      return screen.kind === "ai-preview" && state.stack.at(-2)?.kind === "ai-interview" ? { ...state, stack: state.stack.slice(0, -2) } : screen.kind === "ai-preview" ? pop(state) : state;
    case "FINALIZE_MODIFY":
      return state;
    case "ACTIVATE_AGENT":
      return screen.kind === "catalog" ? push(state, { kind: "info", agentId: event.agentId, focus: 0 }) : state;
    case "CATALOG_QUERY":
      return screen.kind === "catalog" ? replaceTop(state, { ...screen, page: 0, focus: 0, query: event.value, searchFocused: true }) : state;
    case "FOCUS_CATALOG_RESULTS":
      return screen.kind === "catalog" ? replaceTop(state, { ...screen, query: event.query ?? screen.query, searchFocused: false }) : state;
    case "FOCUS_CATALOG_SEARCH":
      return screen.kind === "catalog" ? replaceTop(state, { ...screen, searchFocused: true }) : state;
    case "MOVE_FOCUS": {
      const max = event.maxFocus ?? (screen.kind === "landing" ? 2 : screen.kind === "coordinator" ? 0 : screen.kind === "ai-gate" ? 1 : screen.kind === "ai-preview" ? 2 : screen.kind === "ai-interview" ? 0 : screen.kind === "modify" && screen.edit.mode === "menu" ? modifyMaxFocus(screen) : screen.kind === "modify" && screen.edit.mode === "skills" ? screen.edit.skills.length : screen.kind === "delete" ? 1 : 0);
      if (screen.kind === "landing") return replaceTop(state, { ...screen, focus: clamp(screen.focus + event.delta, max) as 0 | 1 | 2 });
      if (screen.kind === "catalog") return replaceTop(state, { ...screen, searchFocused: false, focus: clamp(screen.focus + event.delta, max) });
      if (screen.kind === "info" || screen.kind === "model" || screen.kind === "effort" || screen.kind === "ai-interview") return replaceTop(state, { ...screen, focus: clamp(screen.focus + event.delta, max) });
      if (screen.kind === "modify" && screen.edit.mode === "menu") return replaceTop(state, { ...screen, focus: clamp(screen.focus + event.delta, max) });
      if (screen.kind === "modify" && screen.edit.mode === "skills") return replaceTop(state, { ...screen, edit: { ...screen.edit, focus: clamp(screen.edit.focus + event.delta, max) } });
      if (screen.kind === "delete") return replaceTop(state, { ...screen, confirmFocus: clamp(screen.confirmFocus + event.delta, 1) as 0 | 1 });
      if (screen.kind === "coordinator") return replaceTop(state, { ...screen, focus: clamp(screen.focus + event.delta, max) });
      if (screen.kind === "ai-gate") return replaceTop(state, { ...screen, focus: clamp(screen.focus + event.delta, 1) as 0 | 1 });
      if (screen.kind === "ai-preview") return replaceTop(state, { ...screen, focus: clamp(screen.focus + event.delta, 2) as 0 | 1 | 2 });
      return state;
    }
    case "PAGE":
      if (screen.kind !== "catalog") return state;
      return replaceTop(state, { ...screen, page: Math.max(0, Math.min(event.maxPage ?? Number.MAX_SAFE_INTEGER, screen.page + event.delta)), focus: 0, searchFocused: false });
    case "OPEN_MODIFY":
      if (screen.kind !== "info") return state;
      return push(state, event.custom === true
        ? { kind: "modify", agentId: event.agentId ?? screen.agentId, focus: 0, edit: { mode: "menu" }, editable: true }
        : { kind: "modify", agentId: event.agentId ?? screen.agentId, focus: 0, edit: { mode: "menu" }, protectedBase: true });
    case "MODIFY_ACTIVATE":
      if (screen.kind !== "modify" || screen.edit.mode !== "menu") return state;
      if (event.option === "ai") return state;
      if (event.option === "model") return push(state, { kind: "model", agentId: screen.agentId, focus: 0 });
      if (event.option === "effort") return push(state, { kind: "effort", agentId: screen.agentId, focus: 0 });
      if (screen.editable !== true && screen.protectedBase !== true && event.option !== "back") return state;
      if (screen.protectedBase === true && (event.option === "id" || event.option === "delete")) return state;
      if (event.option === "id" || event.option === "description") return replaceTop(state, { ...screen, edit: { mode: "text", field: event.option, value: event.value ?? "" } });
      if (event.option === "skills") return replaceTop(state, { ...screen, edit: skillDraft(event.skills ?? []) });
      if (event.option === "operations") return replaceTop(state, { ...screen, edit: { mode: "text", field: "operations", value: event.operations ?? event.value ?? "" } });
      if (event.option === "delete") return push(state, { kind: "delete", agentId: screen.agentId, confirmFocus: 1 });
      return pop(state);
    case "SELECT_MODEL":
      return screen.kind === "model" ? push(pop(state), { kind: "effort", agentId: screen.agentId, focus: 0 }) : state;
    case "SELECT_EFFORT":
      return screen.kind === "effort" ? pop(state) : state;
    case "EDIT_SKILLS_TOGGLE": {
      if (screen.kind !== "modify" || screen.edit.mode !== "skills") return state;
      const skill = event.skill ?? screen.edit.skills[event.index];
      if (!skill) return state;
      const skills = screen.edit.skills.includes(skill) ? screen.edit.skills.filter((item) => item !== skill) : [...screen.edit.skills, skill];
      return replaceTop(state, { ...screen, edit: skillDraft(skills, clamp(screen.edit.focus, skills.length), screen.edit.adding, screen.edit.input) });
    }
    case "EDIT_SKILLS_START_ADD":
      return screen.kind === "modify" && screen.edit.mode === "skills" ? replaceTop(state, { ...screen, edit: skillDraft(screen.edit.skills, screen.edit.focus, true) }) : state;
    case "EDIT_SKILLS_INPUT":
      return screen.kind === "modify" && screen.edit.mode === "skills" && screen.edit.adding ? replaceTop(state, { ...screen, edit: skillDraft(screen.edit.skills, screen.edit.focus, true, event.value) }) : state;
    case "EDIT_SKILLS_ADD": {
      if (screen.kind !== "modify" || screen.edit.mode !== "skills" || !screen.edit.adding) return state;
      const skill = screen.edit.input.trim();
      const skills = skill && !screen.edit.skills.includes(skill) ? [...screen.edit.skills, skill] : [...screen.edit.skills];
      return replaceTop(state, { ...screen, edit: skillDraft(skills, clamp(screen.edit.focus, skills.length)) });
    }
    case "OPEN_SKILL_PICKER":
      return screen.kind === "modify" && screen.edit.mode === "skills" ? push(state, { kind: "skill-picker", agentId: screen.agentId, installed: event.installed, selected: [...screen.edit.skills], query: "", focus: 0 }) : state;
    case "SKILL_PICKER_QUERY":
      return screen.kind === "skill-picker" ? replaceTop(state, { ...screen, query: event.value, focus: 0 }) : state;
    case "SKILL_PICKER_TOGGLE": {
      if (screen.kind !== "skill-picker") return state;
      const selected = screen.selected.includes(event.skill) ? screen.selected.filter((skill) => skill !== event.skill) : [...screen.selected, event.skill];
      const parent = state.stack.at(-2);
      if (parent?.kind !== "modify" || parent.edit.mode !== "skills") return state;
      return { ...state, stack: [...state.stack.slice(0, -2), { ...parent, edit: skillDraft(selected) }] };
    }
    case "EDIT_TEXT_INPUT":
      return screen.kind === "modify" && screen.edit.mode === "text" ? replaceTop(state, { ...screen, edit: { ...screen.edit, value: event.value } }) : state;
    case "EDIT_OPERATIONS_INPUT":
      if (screen.kind !== "modify") return state;
      return screen.edit.mode === "text" && screen.edit.field === "operations" ? replaceTop(state, { ...screen, edit: { ...screen.edit, value: event.value } }) : state;
    case "EDIT_COMMIT":
      if (screen.kind !== "modify" || screen.edit.mode === "menu") return state;
      if (!event.agentId) return replaceTop(state, { ...screen, edit: { mode: "menu" } });
      return {
        ...state,
        stack: state.stack.map((item) => {
          if (!(item.kind === "info" || item.kind === "modify" || item.kind === "model" || item.kind === "effort" || item.kind === "delete")) return item;
          return item.agentId === screen.agentId
            ? item.kind === "modify" ? { ...item, agentId: event.agentId!, edit: { mode: "menu" } } : { ...item, agentId: event.agentId! }
            : item;
        }),
      };
    case "EDIT_CANCEL":
      return screen.kind === "modify" && screen.edit.mode !== "menu" ? replaceTop(state, { ...screen, edit: { mode: "menu" } }) : state;
    case "REQUEST_DELETE":
      if (screen.kind === "modify" && screen.editable === true) return push(state, { kind: "delete", agentId: screen.agentId, confirmFocus: 1 });
      return screen.kind === "info" ? push(state, { kind: "delete", agentId: event.agentId ?? screen.agentId, confirmFocus: 1 }) : state;
    case "CONFIRM_DELETE":
    case "CANCEL_DELETE":
      return screen.kind === "delete" ? pop(state) : state;
    case "CREATE_START":
      return push(state, event.coordinatorConfigured === true ? interviewScreen() : { kind: "ai-gate", intent: "agent-creation-interview", focus: 0 });
    case "BACK":
      if (screen.kind === "modify" && screen.edit.mode !== "menu") return replaceTop(state, { ...screen, edit: { mode: "menu" } });
      if (screen.kind === "ai-interview") return pop(state);
      return pop(state);
    default:
      return state;
  }
}

export type { AgentCatalogRow };
