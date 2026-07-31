import { describe, expect, it } from "vitest";
import { parseSuiteConfig, setAgentModelAssignment, validateAgentId, validateVariantId } from "../src/core/config.ts";

const customAgent = {
  id: "local-helper",
  description: "A local helper",
  model: "openai/gpt-5.6-luna",
  prompt: "Help locally",
  permissions: { "*:read": "allow" as const },
  skills: ["testing"],
};

describe("suite config", () => {
  it("parses the minimal registry without suite or profile state", () => {
    expect(() => validateAgentId("../escape")).toThrow();
    expect(parseSuiteConfig({ version: 1, customAgents: {} })).toEqual({ version: 1, customAgents: {}, modelAssignments: {}, variantAssignments: {} });
    expect(parseSuiteConfig({ version: 1, customAgents: { "local-helper": customAgent } })).toEqual({
      version: 1,
      customAgents: { "local-helper": customAgent },
      modelAssignments: {},
      variantAssignments: {},
    });
  });

  it("parses independent per-agent model assignments and rejects invalid IDs", () => {
    const parsed = parseSuiteConfig({
      version: 1,
      customAgents: {},
      modelAssignments: {
        general: "openai/gpt-5.6-luna",
        "agent-especialit-github": "anthropic/claude-sonnet",
      },
      variantAssignments: {
        general: "high",
      },
    });

    expect(parsed.modelAssignments).toEqual({
      general: "openai/gpt-5.6-luna",
      "agent-especialit-github": "anthropic/claude-sonnet",
    });
    expect(parsed.variantAssignments).toEqual({ general: "high" });
    expect(() => parseSuiteConfig({ version: 1, customAgents: {}, modelAssignments: { "../escape": "openai/x" } })).toThrow();
    expect(() => parseSuiteConfig({ version: 1, customAgents: {}, modelAssignments: { general: "invalid-model" } })).toThrow(/model/i);
    expect(() => validateVariantId("bad value")).toThrow(/variant/i);
    expect(() => validateVariantId("unsafe:key")).toThrow(/variant/i);
    expect(() => parseSuiteConfig({ version: 1, customAgents: {}, variantAssignments: { general: "../escape" } })).toThrow(/variant/i);
  });

  it("changes one assignment without replacing the other agents", () => {
    const config = parseSuiteConfig({
      version: 1,
      customAgents: {},
      modelAssignments: { general: "openai/old", "agent-especialit-github": "openai/keep" },
      variantAssignments: { general: "high", "agent-especialit-github": "medium" },
    });

    expect(setAgentModelAssignment(config, "general", "openai/new")).toEqual({
      version: 1,
      customAgents: {},
      modelAssignments: { general: "openai/new", "agent-especialit-github": "openai/keep" },
      variantAssignments: { "agent-especialit-github": "medium" },
    });

    expect(setAgentModelAssignment(config, "general", "openai/new", "low").variantAssignments).toEqual({
      general: "low",
      "agent-especialit-github": "medium",
    });
  });

  it("rejects invalid and seed-duplicate custom identifiers", () => {
    expect(() => parseSuiteConfig({ version: 1, customAgents: { "../escape": customAgent } })).toThrow();
    expect(() => parseSuiteConfig({ version: 1, customAgents: { general: { ...customAgent, id: "general" } } })).toThrow(/duplicate|duplic|seed|Suite/i);
  });

  it("rejects non-empty legacy assignments in Spanish", () => {
    const legacy = {
      version: 1,
      activeSuite: "default",
      suites: { default: { agents: { general: "openai/gpt-5.6-luna" } } },
      customAgents: {},
    };
    expect(() => parseSuiteConfig(legacy)).toThrow(/asignaciones|migraci[oó]n/i);
  });

  it("accepts the current empty legacy shape as the minimal registry", () => {
    expect(parseSuiteConfig({
      version: 1,
      activeSuite: "default",
      suites: { default: { agents: {} } },
      customAgents: {},
    })).toEqual({ version: 1, customAgents: {}, modelAssignments: {}, variantAssignments: {} });
  });
});
