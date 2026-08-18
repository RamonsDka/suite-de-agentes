import { describe, expect, it } from "vitest";
import {
  decideTaskGate,
  INTERNAL_AGENT_ALLOWLIST,
  isAuthorizedInternalAgent,
  SDD_AGENT_ALLOWLIST,
  transformTaskPermission,
} from "../src/core/policy.ts";

const CONFIGURED_INTERNAL_AGENTS = [
  "sdd-init", "sdd-explore", "sdd-onboard", "sdd-propose", "sdd-spec",
  "sdd-design", "sdd-tasks", "sdd-apply", "sdd-verify", "sdd-archive",
  "sdd-init-fallback", "sdd-explore-fallback", "sdd-onboard-fallback", "sdd-propose-fallback", "sdd-spec-fallback",
  "sdd-design-fallback", "sdd-tasks-fallback", "sdd-apply-fallback", "sdd-verify-fallback", "sdd-archive-fallback",
  "review-readability", "review-readability-fallback",
  "review-refuter", "review-refuter-fallback",
  "review-reliability", "review-reliability-fallback",
  "review-resilience", "review-resilience-fallback",
  "review-risk", "review-risk-fallback",
  "jd-fix-agent", "jd-fix-agent-fallback",
  "jd-judge-a", "jd-judge-a-fallback",
  "jd-judge-b", "jd-judge-b-fallback",
] as const;

describe("task policy", () => {
  it("allows every configured internal agent without a ledger grant", () => {
    expect([...INTERNAL_AGENT_ALLOWLIST]).toEqual(CONFIGURED_INTERNAL_AGENTS);
    for (const target of CONFIGURED_INTERNAL_AGENTS) {
      expect(isAuthorizedInternalAgent(target), target).toBe(true);
      expect(decideTaskGate({ sessionAgent: "gentle-orchestrator", target, sessionID: "s", messageID: "m" })).toMatchObject({
        allowed: true,
        reason: "exact internal allowlist",
      });
    }
  });

  it("requires an exact current-turn grant for user-facing and lookalike agents", () => {
    for (const target of ["general", "explore", "agent-especialit-github", "custom-agent", "sdd-evil"]) {
      expect(isAuthorizedInternalAgent(target), target).toBe(false);
      expect(decideTaskGate({ sessionAgent: "gentle-orchestrator", target, sessionID: "s", messageID: "m" })).toMatchObject({
        allowed: false,
      });
    }
  });

  it("keeps non-orchestrator sessions outside this task policy", () => {
    expect(decideTaskGate({ sessionAgent: "gentle-orchestrator", target: "general", sessionID: "s", messageID: "m" }).allowed).toBe(false);
    expect(decideTaskGate({ sessionAgent: "general", target: "general", sessionID: "s", messageID: "m" }).allowed).toBe(true);
  });

  it("contains the complete exact SDD allowlist", () => {
    expect([...SDD_AGENT_ALLOWLIST]).toEqual([
      "sdd-init", "sdd-explore", "sdd-onboard", "sdd-propose", "sdd-spec",
      "sdd-design", "sdd-tasks", "sdd-apply", "sdd-verify", "sdd-archive",
    ]);
  });

  it("emits a deny-by-default task configuration with SDD exact allows", () => {
    const result = transformTaskPermission();
    expect(result["*"]).toBe("deny");
    for (const agent of CONFIGURED_INTERNAL_AGENTS) expect(result[agent]).toBe(agent.endsWith("-fallback") ? "ask" : "allow");
    expect(result["sdd-evil"]).toBeUndefined();
    expect(result.general).toBe("deny");
  });

  it("removes disabled internal targets from the task permission allowlist", () => {
    const result = transformTaskPermission(["sdd-apply"]);
    expect(result["*"]).toBe("deny");
    expect(result["sdd-apply"]).toBeUndefined();
    expect(result["sdd-apply-fallback"]).toBe("ask");
  });

  it("retains the primary SDD list as an exact compatibility subset", () => {
    expect([...SDD_AGENT_ALLOWLIST]).toEqual([
      "sdd-init", "sdd-explore", "sdd-onboard", "sdd-propose", "sdd-spec",
      "sdd-design", "sdd-tasks", "sdd-apply", "sdd-verify", "sdd-archive",
    ]);
  });
});
