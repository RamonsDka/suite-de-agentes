export type PermissionValue = "allow" | "deny" | "ask";
export type AgentPermissions = Record<string, PermissionValue>;

export interface CustomAgent {
  id: string;
  description: string;
  model: string;
  variant?: string;
  prompt: string;
  permissions: AgentPermissions;
  skills: string[];
  materializeGlobal?: boolean;
}

export interface SuiteConfig {
  version: 1;
  customAgents: Record<string, CustomAgent>;
  modelAssignments: Record<string, string>;
  variantAssignments: Record<string, string>;
}

export interface AgentCatalogRow {
  id: string;
  membership: "seed" | "custom";
  enabled: boolean;
  model?: string;
  skills: string[];
  consent: "explicit-current-turn";
  description?: string;
  variant?: string;
}

export interface RuntimeMessage { sessionID: string; messageID: string; role?: string; parts?: unknown[]; text?: string; }
export interface TaskGateInput { sessionAgent?: string; target: string; sessionID: string; messageID: string; ledger?: { has(sessionID: string, messageID: string, target: string): boolean }; }
export interface TaskGateDecision { allowed: boolean; reason?: string; }
