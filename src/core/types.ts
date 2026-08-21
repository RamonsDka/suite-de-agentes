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

export interface BaseAgentOverride {
  description?: string;
  skills?: string[];
  operations?: string;
}

export interface CoordinatorConfig {
  provider: string;
  model: string;
  effort?: string;
}

export interface PendingSkill {
  id: string;
  rationale: string;
}

export interface ModelRecommendation {
  model: string;
  effort: string;
  rationale: string;
}

export interface InterviewTurn {
  question: string;
  quickReplies: readonly string[];
  checkpoint: InterviewCheckpoint;
}

export interface InterviewTranscriptEntry {
  role: "user" | "assistant";
  text: string;
}

export type InterviewTranscript = readonly InterviewTranscriptEntry[];

export interface InterviewCheckpoint {
  draft: {
    id: string;
    description: string;
    operations: string;
    model: string;
    effort: string;
    skills: string[];
  };
  pendingSkills: readonly PendingSkill[];
  recommendation?: ModelRecommendation;
}

export interface SuiteConfig {
  version: 1;
  customAgents: Record<string, CustomAgent>;
  modelAssignments: Record<string, string>;
  variantAssignments: Record<string, string>;
  baseOverrides?: Record<string, BaseAgentOverride>;
  disabledAgents?: string[];
  coordinator?: CoordinatorConfig;
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
  disabled?: boolean;
  operations?: string;
}

export interface RuntimeMessage { sessionID: string; messageID: string; role?: string; parts?: unknown[]; text?: string; }
export interface TaskGateInput { sessionAgent?: string; target: string; sessionID: string; messageID: string; ledger?: { has(sessionID: string, messageID: string, target: string): boolean }; }
export interface TaskGateDecision { allowed: boolean; reason?: string; }
