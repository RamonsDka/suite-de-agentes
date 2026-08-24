import type { PermissionValue, TaskGateDecision, TaskGateInput } from "./types.ts";
export { ConsentLedger } from "./grants.ts";

export const SDD_AGENT_ALLOWLIST = [
  "sdd-init", "sdd-explore", "sdd-onboard", "sdd-propose", "sdd-spec",
  "sdd-design", "sdd-tasks", "sdd-apply", "sdd-verify", "sdd-archive",
] as const;

const SDD_FALLBACK_AGENT_ALLOWLIST = [
  "sdd-init-fallback", "sdd-explore-fallback", "sdd-onboard-fallback", "sdd-propose-fallback", "sdd-spec-fallback",
  "sdd-design-fallback", "sdd-tasks-fallback", "sdd-apply-fallback", "sdd-verify-fallback", "sdd-archive-fallback",
] as const;

const REVIEW_AGENT_ALLOWLIST = [
  "review-readability", "review-readability-fallback",
  "review-refuter", "review-refuter-fallback",
  "review-reliability", "review-reliability-fallback",
  "review-resilience", "review-resilience-fallback",
  "review-risk", "review-risk-fallback",
] as const;

const JUDGMENT_DAY_AGENT_ALLOWLIST = [
  "jd-fix-agent", "jd-fix-agent-fallback",
  "jd-judge-a", "jd-judge-a-fallback",
  "jd-judge-b", "jd-judge-b-fallback",
] as const;

/** Exact names owned by the internal Gentle-AI orchestration system. */
export const INTERNAL_AGENT_ALLOWLIST = [
  ...SDD_AGENT_ALLOWLIST,
  ...SDD_FALLBACK_AGENT_ALLOWLIST,
  ...REVIEW_AGENT_ALLOWLIST,
  ...JUDGMENT_DAY_AGENT_ALLOWLIST,
] as const;
export const SDD_ORCHESTRATOR = "gentle-orchestrator";

export function isAuthorizedInternalAgent(target: string): boolean {
  return (INTERNAL_AGENT_ALLOWLIST as readonly string[]).includes(target);
}

export function decideTaskGate(input: TaskGateInput & { disabledAgents?: readonly string[] }): TaskGateDecision {
  if (input.disabledAgents?.includes(input.target)) return { allowed: false, reason: `Disabled agent '${input.target}' cannot be dispatched.` };
  if (isAuthorizedInternalAgent(input.target)) return { allowed: true, reason: "exact internal allowlist" };
  if (!input.sessionAgent || (input.sessionAgent !== SDD_ORCHESTRATOR && !input.knownAgents?.includes(input.sessionAgent))) return { allowed: false, reason: "Blocked dispatch from an unknown requester." };
  if (!input.knownAgents?.includes(input.target)) return { allowed: false, reason: `Blocked agent '${input.target}': target is unknown.` };
  if (input.ledger?.has(input.sessionID, input.sessionAgent, input.target)) return { allowed: true, reason: "active session grant" };
  return { allowed: false, reason: `Blocked agent '${input.target}': an active session grant is required.` };
}

export function transformTaskPermission(disabledAgents: readonly string[] = []): Record<string, PermissionValue> {
  const disabled = new Set(disabledAgents);
  return {
    "*": "deny",
    ...Object.fromEntries(INTERNAL_AGENT_ALLOWLIST.filter((agent) => !disabled.has(agent)).map((agent): [string, PermissionValue] => [agent, agent.endsWith("-fallback") ? "ask" : "allow"])),
    "general": "deny",
  };
}
