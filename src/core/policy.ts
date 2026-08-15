import type { PermissionValue, TaskGateDecision, TaskGateInput } from "./types.ts";

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

export function decideTaskGate(input: TaskGateInput): TaskGateDecision {
  if (input.sessionAgent !== SDD_ORCHESTRATOR) return { allowed: true, reason: "suite policy is scoped to gentle-orchestrator" };
  if (isAuthorizedInternalAgent(input.target)) return { allowed: true, reason: "exact internal allowlist" };
  if (input.ledger?.has(input.sessionID, input.messageID, input.target)) return { allowed: true, reason: "explicit current-message grant" };
  return { allowed: false, reason: `Blocked agent '${input.target}'. Add exactly 'usa también agente: ${input.target}' to the current message.` };
}

export function transformTaskPermission(): Record<string, PermissionValue> {
  return {
    "*": "deny",
    ...Object.fromEntries(INTERNAL_AGENT_ALLOWLIST.map((agent): [string, PermissionValue] => [agent, agent.endsWith("-fallback") ? "ask" : "allow"])),
    "general": "deny",
  };
}
