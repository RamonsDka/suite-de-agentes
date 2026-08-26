import { describe, expect, it } from "vitest";
import {
  CANONICAL_BUILT_IN_AGENTS,
  discoverBuiltInAgents,
} from "../src/core/built-in-agents.ts";

describe("built-in agent registry", () => {
  it("defines eight canonical agents with lowercase runtime IDs, Spanish metadata, protected internal tiers, and canonical GitHub visibility", () => {
    expect(CANONICAL_BUILT_IN_AGENTS.map((agent) => agent.id)).toEqual([
      "general",
      "build",
      "plan",
      "explore",
      "compaction",
      "title",
      "summary",
      "agent-github",
    ]);

    expect(CANONICAL_BUILT_IN_AGENTS).toHaveLength(8);
    expect(CANONICAL_BUILT_IN_AGENTS.map((agent) => agent.displayName)).toContain("agent-github");
    expect(CANONICAL_BUILT_IN_AGENTS.map((agent) => agent.id)).not.toContain("agent-especialit-github");
    expect(CANONICAL_BUILT_IN_AGENTS.map((agent) => agent.displayName)).not.toContain("agent-especialit-github");

    expect(CANONICAL_BUILT_IN_AGENTS.find((agent) => agent.id === "plan")).toMatchObject({
      displayName: "Plan",
      classification: "public",
      curation: "curated",
      baseline: {
        description: expect.stringMatching(/[áéíóúñ]/i),
        model: expect.any(String),
        effort: expect.any(String),
        operations: expect.any(String),
        skills: expect.any(Array),
      },
    });
    expect(CANONICAL_BUILT_IN_AGENTS.filter((agent) => agent.classification === "internal").map((agent) => agent.id)).toEqual([
      "compaction",
      "title",
      "summary",
    ]);
  });

  it("keeps curated baselines immutable when consumers attempt to modify a definition", () => {
    const plan = CANONICAL_BUILT_IN_AGENTS.find((agent) => agent.id === "plan");
    if (!plan) throw new Error("Missing plan built-in");

    const originalDescription = plan.baseline.description;
    expect(Object.isFrozen(plan.baseline)).toBe(true);
    expect(Object.isFrozen(plan.baseline.skills)).toBe(true);
    expect(() => (plan.baseline.skills as string[]).push("unsafe-skill")).toThrow();
    expect(plan.baseline.description).toBe(originalDescription);
    expect(plan.baseline.skills).not.toContain("unsafe-skill");
  });

  it("discovers only unclassified runtime built-ins as pending curation with generic Spanish warnings", () => {
    const discovered = discoverBuiltInAgents({
      indexer: { model: "opencode/indexer" },
      "agent-especialit-github": { model: "openai/custom" },
      "gentle-orchestrator": { model: "openai/orchestrator" },
      "sdd-builder": { model: "openai/sdd" },
      "review-risk": { model: "openai/review" },
      "jd-judge": { model: "openai/jd" },
      "build-fallback": { model: "openai/fallback" },
      "local-helper": { model: "openai/custom" },
    }, ["local-helper"]);

    expect(discovered).toEqual([
      expect.objectContaining({
        id: "indexer",
        displayName: "Indexer",
        classification: "public",
        curation: "pending-curation",
        baseline: expect.objectContaining({
          description: expect.stringMatching(/[áéíóúñ]/i),
        }),
        warnings: expect.arrayContaining([expect.stringMatching(/pendiente/i)]),
      }),
    ]);
  });
});
