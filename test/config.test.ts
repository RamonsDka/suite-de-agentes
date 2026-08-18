import { describe, expect, it } from "vitest";
import { parseSuiteConfig, patchCustomAgent, setAgentModelAssignment, validateAgentId, validateSkillId, validateVariantId } from "../src/core/config.ts";

const customAgent = {
  id: "local-helper",
  description: "A local helper",
  model: "openai/gpt-5.6-luna",
  prompt: "Help locally",
  permissions: { "*:read": "allow" as const },
  skills: ["testing"],
};

describe("suite config", () => {
  it("patches a custom agent without mutating input and re-keys assignments in the v1 shape", () => {
    const config = parseSuiteConfig({
      version: 1,
      customAgents: {
        "local-helper": customAgent,
        "other-agent": { ...customAgent, id: "other-agent" },
      },
      modelAssignments: { "local-helper": "openai/assigned", "other-agent": "openai/other" },
      variantAssignments: { "local-helper": "high", "other-agent": "low" },
    });

    const patched = patchCustomAgent(config, "local-helper", {
      newId: "renamed-helper",
      description: "Updated helper",
      skills: ["testing", "linting"],
      operations: "Help better locally",
    });

    expect(patched).toEqual({
      version: 1,
      customAgents: {
        "renamed-helper": {
          ...customAgent,
          id: "renamed-helper",
          description: "Updated helper",
          skills: ["testing", "linting"],
          prompt: "Help better locally",
        },
        "other-agent": { ...customAgent, id: "other-agent" },
      },
      modelAssignments: { "renamed-helper": "openai/assigned", "other-agent": "openai/other" },
      variantAssignments: { "renamed-helper": "high", "other-agent": "low" },
    });
    expect(config).toEqual(parseSuiteConfig({
      version: 1,
      customAgents: {
        "local-helper": customAgent,
        "other-agent": { ...customAgent, id: "other-agent" },
      },
      modelAssignments: { "local-helper": "openai/assigned", "other-agent": "openai/other" },
      variantAssignments: { "local-helper": "high", "other-agent": "low" },
    }));
  });

  it("rejects invalid and colliding patch IDs before changing the registry", () => {
    const config = parseSuiteConfig({ version: 1, customAgents: { "local-helper": customAgent }, modelAssignments: {}, variantAssignments: {} });
    const before = structuredClone(config);
    expect(() => patchCustomAgent(config, "local-helper", { newId: "../escape" })).toThrow(/invalid|identificador|id/i);
    expect(() => patchCustomAgent(config, "local-helper", { newId: "general" })).toThrow(/collision|colisi[oó]n|seed|existe|exists/i);
    expect(() => patchCustomAgent(config, "local-helper", { newId: "local-helper" })).not.toThrow();
    expect(config).toEqual(before);
  });

  it("rejects patch IDs reserved by either assignment map", () => {
    const config = parseSuiteConfig({
      version: 1,
      customAgents: { "local-helper": customAgent },
      modelAssignments: { "model-reserved": "openai/reserved" },
      variantAssignments: { "variant-reserved": "high" },
    });

    expect(() => patchCustomAgent(config, "local-helper", { newId: "model-reserved" })).toThrow(/collision|colisi[oó]n|assignment|asignaci[oó]n/i);
    expect(() => patchCustomAgent(config, "local-helper", { newId: "variant-reserved" })).toThrow(/collision|colisi[oó]n|assignment|asignaci[oó]n/i);
    expect(config.customAgents["local-helper"]).toEqual(customAgent);
  });

  it("validates skill IDs using the same safe slug rules", () => {
    expect(validateSkillId("testing")).toBe("testing");
    expect(validateSkillId("linting-tools")).toBe("linting-tools");
    expect(() => validateSkillId("")).toThrow(/skill|habilidad|invalid/i);
    expect(() => validateSkillId("bad value")).toThrow(/skill|habilidad|invalid/i);
    expect(() => validateSkillId("../escape")).toThrow(/skill|habilidad|invalid/i);
  });

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

  it("normalizes validated base overrides and disabled agent ids without changing legacy output", () => {
    expect(parseSuiteConfig({
      version: 1,
      customAgents: { "local-helper": customAgent },
      modelAssignments: { general: "openai/assigned" },
      variantAssignments: { general: "high" },
      baseOverrides: {
        general: { description: "A safer general agent", skills: ["testing"], operations: "Use the requested tools." },
      },
      disabledAgents: ["general", "general"],
    })).toEqual({
      version: 1,
      customAgents: { "local-helper": customAgent },
      modelAssignments: { general: "openai/assigned" },
      variantAssignments: { general: "high" },
      baseOverrides: {
        general: { description: "A safer general agent", skills: ["testing"], operations: "Use the requested tools." },
      },
      disabledAgents: ["general"],
    });
  });

  it("validates override ownership and rejects prototype-pollution keys", () => {
    expect(() => parseSuiteConfig({
      version: 1,
      customAgents: { "local-helper": customAgent },
      baseOverrides: { "local-helper": { description: "not a base agent" } },
    })).toThrow(/base|seed|sistema|agent/i);
    expect(() => parseSuiteConfig({
      version: 1,
      customAgents: {},
      disabledAgents: ["__proto__"],
    })).toThrow(/id|identificador|invalid/i);
    expect(() => parseSuiteConfig({
      version: 1,
      customAgents: {},
      baseOverrides: { general: { skills: ["bad value"] } },
    })).toThrow(/skill|habilidad|invalid/i);
  });
});
