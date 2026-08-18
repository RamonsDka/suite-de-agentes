import { validateAgentId, validateModelId, validateSkillId, validateVariantId } from "./config.ts";
import type { AgentPermissions, CoordinatorConfig } from "./types.ts";

export interface CoordinatorPrompt {
  system: string;
  message: string;
  coordinator: CoordinatorConfig;
  signal: AbortSignal;
  onProgress?: (text: string) => void;
}

export interface CoordinatorSession {
  prompt(input: CoordinatorPrompt): Promise<string>;
}

export interface AgentDraft {
  id: string;
  description: string;
  systemPrompt: string;
  operations: string;
  model: string;
  effort: string;
  skills: string[];
  permissions: AgentPermissions;
}

const DRAFT_KEYS = ["id", "description", "systemPrompt", "operations", "model", "effort", "skills", "permissions"];
const PERMISSION_VALUES = new Set(["allow", "ask", "deny"]);

export function buildAuthoringPrompt(description: string, operations: string): Pick<CoordinatorPrompt, "system" | "message"> {
  return {
    system: "Return only strict JSON with id, description, systemPrompt, operations, model, effort, skills, and permissions. Describe the requested agent only.",
    message: `Intent: ${description}\nDesired operations: ${operations}`,
  };
}

export function parseAgentDraft(response: string): AgentDraft {
  let raw: unknown;
  try { raw = JSON.parse(response); } catch { throw new Error("Coordinator draft must be strict JSON."); }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Coordinator draft must be strict JSON.");
  const draft = raw as Record<string, unknown>;
  if (Object.keys(draft).length !== DRAFT_KEYS.length || Object.keys(draft).some((key) => !DRAFT_KEYS.includes(key))) throw new Error("Coordinator draft must use the strict draft shape.");
  const text = (key: keyof AgentDraft) => {
    const value = draft[key];
    if (typeof value !== "string" || !value.trim()) throw new Error(`Coordinator draft requires ${key}.`);
    return value.trim();
  };
  const permissions = draft.permissions;
  if (!permissions || typeof permissions !== "object" || Array.isArray(permissions) || Object.keys(permissions).some((key) => !key || ["__proto__", "constructor", "prototype"].includes(key) || !PERMISSION_VALUES.has((permissions as Record<string, unknown>)[key] as string))) throw new Error("Coordinator draft has invalid permissions.");
  const skills = draft.skills;
  if (!Array.isArray(skills) || !skills.every((skill) => typeof skill === "string")) throw new Error("Coordinator draft has invalid skills.");
  return {
    id: validateAgentId(text("id")), description: text("description"), systemPrompt: text("systemPrompt"), operations: text("operations"),
    model: validateModelId(text("model")), effort: validateVariantId(text("effort")),
    skills: [...new Set(skills.map((skill) => validateSkillId(skill.trim())))], permissions: { ...(permissions as AgentPermissions) },
  };
}

export async function runAuthoringConversation(input: { session: CoordinatorSession; coordinator: CoordinatorConfig; description: string; operations: string; signal: AbortSignal; onProgress?: (text: string) => void }): Promise<AgentDraft> {
  if (input.signal.aborted) throw new Error("Coordinator authoring was cancelled.");
  const prompt = buildAuthoringPrompt(input.description, input.operations);
  const response = await input.session.prompt({ ...prompt, coordinator: input.coordinator, signal: input.signal, onProgress: input.onProgress });
  if (input.signal.aborted) throw new Error("Coordinator authoring was cancelled.");
  return parseAgentDraft(response);
}
