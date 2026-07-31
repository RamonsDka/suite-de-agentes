import type { CustomAgent } from "../../core/types.ts";

export function safeScreenMount(label: string, mount: () => unknown): boolean {
  try {
    mount();
    return true;
  } catch (error) {
    const text = error instanceof Error ? `${error.message} ${error.cause instanceof Error ? error.cause.message : ""}` : String(error);
    if (!text.includes("No renderer found")) console.error(`Suite de Agentes: screen '${label}' disabled; OpenCode will continue.`, error);
    return false;
  }
}

export type CreateStep = "id" | "description" | "model" | "prompt" | "skills" | "confirm";

export type ScreenState =
  | { screen: "landing" }
  | { screen: "catalog"; page: number }
  | { screen: "detail"; agentId: string }
  | { screen: "modify-model"; agentId: string }
  | { screen: "modify-effort"; agentId: string; model: string }
  | { screen: "confirm-delete"; agentId: string }
  | { screen: "create"; step: CreateStep; draft: Partial<CustomAgent> }
  | { screen: "closed" };

export type ScreenEvent =
  | { type: "open-catalog" }
  | { type: "open-create" }
  | { type: "select-agent"; agentId: string }
  | { type: "modify"; agentId: string }
  | { type: "delete"; agentId: string }
  | { type: "model-chosen"; agentId: string; model: string }
  | { type: "effort-chosen"; agentId: string; model: string; variant?: string }
  | { type: "delete-confirmed"; agentId: string; confirmed: boolean }
  | { type: "page"; delta: -1 | 1 }
  | { type: "back" }
  | { type: "cancel" };

function previousScreen(state: ScreenState): ScreenState {
  switch (state.screen) {
    case "landing": return { screen: "closed" };
    case "catalog": return { screen: "landing" };
    case "detail": return { screen: "catalog", page: 0 };
    case "modify-model": return { screen: "detail", agentId: state.agentId };
    case "modify-effort": return { screen: "detail", agentId: state.agentId };
    case "confirm-delete": return { screen: "detail", agentId: state.agentId };
    case "create": return { screen: "landing" };
    case "closed": return state;
  }
}

export function reduceScreen(state: ScreenState, event: ScreenEvent): ScreenState {
  switch (event.type) {
    case "open-catalog": return { screen: "catalog", page: 0 };
    case "open-create": return { screen: "create", step: "id", draft: {} };
    case "select-agent": return { screen: "detail", agentId: event.agentId };
    case "modify": return { screen: "modify-model", agentId: event.agentId };
    case "delete": return { screen: "confirm-delete", agentId: event.agentId };
    case "model-chosen": return { screen: "modify-effort", agentId: event.agentId, model: event.model };
    case "effort-chosen": return { screen: "detail", agentId: event.agentId };
    case "delete-confirmed": return event.confirmed ? { screen: "catalog", page: 0 } : { screen: "detail", agentId: event.agentId };
    case "page": return state.screen === "catalog" ? { screen: "catalog", page: Math.max(0, state.page + event.delta) } : state;
    case "back":
    case "cancel": return previousScreen(state);
  }
}

