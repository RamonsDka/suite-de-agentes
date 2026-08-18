import type { AgentCatalogRow } from "../core/types.ts";
import { editorFields } from "./agent-suite-vm.ts";

export type ModifyEdit =
  | { mode: "menu" }
  | { mode: "text"; field: "id" | "description" | "operations"; value: string }
  | { mode: "skills"; skills: string[]; selected: string[]; focus: number; adding: boolean; input: string }
  | { mode: "operations"; prompt: string };

export type CreateDraft = {
  id: string;
  description: string;
  skills: string[];
  operations: string;
  model: string;
  effort: string;
};

export type AppScreen =
  | { kind: "landing"; focus: 0 | 1 }
  | { kind: "catalog"; page: number; focus: number }
  | { kind: "info"; agentId: string; focus: number }
  | { kind: "model"; agentId: string; focus: number }
  | { kind: "effort"; agentId: string; focus: number }
  | { kind: "modify"; agentId: string; focus: number; edit: ModifyEdit; editable?: boolean }
  | { kind: "delete"; agentId: string; confirmFocus: 0 | 1 }
  | { kind: "create"; step: 0 | 1 | 2 | 3 | 4 | 5; draft: CreateDraft; focus: number };

export type NavState = {
  stack: AppScreen[];
  busy: boolean;
  closing: boolean;
  error?: string;
};

export type NavEvent =
  | { type: "ACTIVATE_LANDING_ITEM"; index: number }
  | { type: "ACTIVATE_AGENT"; agentId: string }
  | { type: "MOVE_FOCUS"; delta: -1 | 1; maxFocus?: number }
  | { type: "PAGE"; delta: -1 | 1; maxPage?: number }
  | { type: "OPEN_MODIFY"; agentId?: string; custom?: boolean }
  | { type: "MODIFY_ACTIVATE"; option: "id" | "description" | "model" | "effort" | "skills" | "operations" | "delete" | "back"; skills?: string[]; operations?: string; value?: string }
  | { type: "SELECT_MODEL"; model: string }
  | { type: "SELECT_EFFORT"; effort: string }
  | { type: "EDIT_SKILLS_TOGGLE"; index: number; skill?: string }
  | { type: "EDIT_SKILLS_START_ADD" }
  | { type: "EDIT_SKILLS_INPUT"; value: string }
  | { type: "EDIT_SKILLS_ADD" }
  | { type: "EDIT_TEXT_INPUT"; value: string }
  | { type: "EDIT_OPERATIONS_INPUT"; value: string }
  | { type: "EDIT_COMMIT"; agentId?: string }
  | { type: "EDIT_CANCEL" }
  | { type: "REQUEST_DELETE"; agentId?: string }
  | { type: "CONFIRM_DELETE" }
  | { type: "CANCEL_DELETE" }
  | { type: "CREATE_START" }
  | { type: "CREATE_INPUT"; field: keyof CreateDraft; value: string | string[] }
  | { type: "CREATE_NEXT" }
  | { type: "CREATE_PREV" }
  | { type: "CREATE_SUBMIT" }
  | { type: "BACK" }
  | { type: "REQUEST_CLOSE" }
  | { type: "SET_BUSY"; busy: boolean }
  | { type: "SET_ERROR"; error?: string };

export const EMPTY_DRAFT: CreateDraft = { id: "", description: "", skills: [], operations: "", model: "", effort: "" };

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

function stepCreate(screen: Extract<AppScreen, { kind: "create" }>, delta: -1 | 1): Extract<AppScreen, { kind: "create" }> {
  const step = Math.max(0, Math.min(5, screen.step + delta)) as Extract<AppScreen, { kind: "create" }>["step"];
  return { ...screen, step };
}

function modifyMaxFocus(screen: Extract<AppScreen, { kind: "modify" }>): number {
  return editorFields({ membership: screen.editable === true ? "custom" : "seed" }).length - 1;
}

function skillDraft(skills: string[], focus = 0, adding = false, input = ""): Extract<ModifyEdit, { mode: "skills" }> {
  return { mode: "skills", skills: [...skills], selected: [...skills], focus, adding, input };
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
        ? push(state, { kind: "catalog", page: 0, focus: 0 })
        : event.index === 1 ? push(state, { kind: "create", step: 0, draft: { ...EMPTY_DRAFT, skills: [] }, focus: 0 }) : state;
    case "ACTIVATE_AGENT":
      return screen.kind === "catalog" ? push(state, { kind: "info", agentId: event.agentId, focus: 0 }) : state;
    case "MOVE_FOCUS": {
      const max = event.maxFocus ?? (screen.kind === "landing" ? 1 : screen.kind === "modify" && screen.edit.mode === "menu" ? modifyMaxFocus(screen) : screen.kind === "modify" && screen.edit.mode === "skills" ? screen.edit.skills.length : screen.kind === "delete" ? 1 : 0);
      if (screen.kind === "landing") return replaceTop(state, { ...screen, focus: clamp(screen.focus + event.delta, max) as 0 | 1 });
      if (screen.kind === "catalog" || screen.kind === "info" || screen.kind === "model" || screen.kind === "effort" || screen.kind === "create") return replaceTop(state, { ...screen, focus: clamp(screen.focus + event.delta, max) });
      if (screen.kind === "modify" && screen.edit.mode === "menu") return replaceTop(state, { ...screen, focus: clamp(screen.focus + event.delta, max) });
      if (screen.kind === "modify" && screen.edit.mode === "skills") return replaceTop(state, { ...screen, edit: { ...screen.edit, focus: clamp(screen.edit.focus + event.delta, max) } });
      if (screen.kind === "delete") return replaceTop(state, { ...screen, confirmFocus: clamp(screen.confirmFocus + event.delta, 1) as 0 | 1 });
      return state;
    }
    case "PAGE":
      if (screen.kind !== "catalog") return state;
      return replaceTop(state, { ...screen, page: Math.max(0, Math.min(event.maxPage ?? Number.MAX_SAFE_INTEGER, screen.page + event.delta)), focus: 0 });
    case "OPEN_MODIFY":
      if (screen.kind !== "info") return state;
      return push(state, event.custom === true
        ? { kind: "modify", agentId: event.agentId ?? screen.agentId, focus: 0, edit: { mode: "menu" }, editable: true }
        : { kind: "modify", agentId: event.agentId ?? screen.agentId, focus: 0, edit: { mode: "menu" } });
    case "MODIFY_ACTIVATE":
      if (screen.kind !== "modify" || screen.edit.mode !== "menu") return state;
      if (event.option === "model") return push(state, { kind: "model", agentId: screen.agentId, focus: 0 });
      if (event.option === "effort") return push(state, { kind: "effort", agentId: screen.agentId, focus: 0 });
      if (screen.editable !== true) return event.option === "back" ? pop(state) : state;
      if (event.option === "id" || event.option === "description") return replaceTop(state, { ...screen, edit: { mode: "text", field: event.option, value: event.value ?? "" } });
      if (event.option === "skills") return replaceTop(state, { ...screen, edit: skillDraft(event.skills ?? []) });
      if (event.option === "operations") return replaceTop(state, { ...screen, edit: { mode: "text", field: "operations", value: event.operations ?? event.value ?? "" } });
      if (event.option === "delete") return push(state, { kind: "delete", agentId: screen.agentId, confirmFocus: 1 });
      return pop(state);
    case "SELECT_MODEL":
    case "SELECT_EFFORT":
      return screen.kind === "model" || screen.kind === "effort" ? pop(state) : state;
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
      return push(state, { kind: "create", step: 0, draft: { ...EMPTY_DRAFT, skills: [] }, focus: 0 });
    case "CREATE_INPUT":
      return screen.kind === "create" ? replaceTop(state, { ...screen, draft: { ...screen.draft, [event.field]: event.field === "skills" && typeof event.value === "string" ? [event.value] : event.value } }) : state;
    case "CREATE_NEXT":
      return screen.kind === "create" ? replaceTop(state, stepCreate(screen, 1)) : state;
    case "CREATE_PREV":
      return screen.kind === "create" ? replaceTop(state, stepCreate(screen, -1)) : state;
    case "CREATE_SUBMIT":
      return state;
    case "BACK":
      if (screen.kind === "modify" && screen.edit.mode !== "menu") return replaceTop(state, { ...screen, edit: { mode: "menu" } });
      if (screen.kind === "create" && screen.step > 0) return replaceTop(state, stepCreate(screen, -1));
      return pop(state);
    default:
      return state;
  }
}

export type { AgentCatalogRow };
