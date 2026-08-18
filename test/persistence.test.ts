import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setAgentModelAssignment } from "../src/core/config.ts";
import { loadSuiteConfig, saveSuiteConfig } from "../src/core/persistence.ts";

const minimal = { version: 1 as const, customAgents: {}, modelAssignments: {}, variantAssignments: {} };
const customAgent = {
  id: "local-helper",
  description: "A local helper",
  model: "openai/gpt-5.6-luna",
  prompt: "Help locally",
  permissions: { "*:read": "allow" as const },
  skills: ["testing"],
};

function suitePath(): string {
  return join(mkdtempSync(join(tmpdir(), "agent-suite-")), "suite.json");
}

describe("namespace persistence", () => {
  it("returns the minimal registry when the configuration file is missing", () => {
    expect(loadSuiteConfig(suitePath())).toEqual(minimal);
  });

  it("replaces an empty legacy file only after a successful minimal write", () => {
    const path = suitePath();
    const legacy = JSON.stringify({ version: 1, activeSuite: "default", suites: { default: { agents: {} } }, customAgents: {} }, null, 2) + "\n";
    writeFileSync(path, legacy);

    expect(loadSuiteConfig(path)).toEqual(minimal);
    expect(readFileSync(path, "utf8")).toBe(legacy);

    saveSuiteConfig(path, loadSuiteConfig(path));
    expect(loadSuiteConfig(path)).toEqual(minimal);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual(minimal);
    expect(readFileSync(path, "utf8")).not.toContain("activeSuite");
  });

  it("writes and reads the complete minimal registry atomically", () => {
    const path = suitePath();
    const value = { version: 1 as const, customAgents: { "local-helper": customAgent }, modelAssignments: {}, variantAssignments: {} };

    saveSuiteConfig(path, value);

    expect(loadSuiteConfig(path)).toEqual(value);
    expect(readFileSync(path, "utf8")).toContain('"version": 1');
    expect(readFileSync(path, "utf8")).not.toContain("suites");
  });

  it("round-trips a coordinator and preserves prior bytes when its validation fails", () => {
    const path = suitePath();
    const existing = { version: 1 as const, customAgents: {}, modelAssignments: {}, variantAssignments: {} };
    saveSuiteConfig(path, existing);
    const savedBytes = readFileSync(path, "utf8");

    expect(() => saveSuiteConfig(path, {
      ...existing,
      coordinator: { provider: "", model: "claude-sonnet-4-5" },
    })).toThrow(/coordinator/i);
    expect(readFileSync(path, "utf8")).toBe(savedBytes);

    const configured = {
      ...existing,
      coordinator: { provider: "anthropic", model: "claude-sonnet-4-5", effort: "extra-high" },
    };
    saveSuiteConfig(path, configured);
    expect(loadSuiteConfig(path)).toEqual(configured);
  });

  it("preserves persisted bytes after invalid save and rejected legacy load", () => {
    const path = suitePath();
    const value = { version: 1 as const, customAgents: { "local-helper": customAgent }, modelAssignments: {}, variantAssignments: {} };
    saveSuiteConfig(path, value);
    const savedBytes = readFileSync(path, "utf8");

    expect(() => saveSuiteConfig(path, { version: 1, customAgents: { "../escape": customAgent } })).toThrow();
    expect(readFileSync(path, "utf8")).toBe(savedBytes);

    const legacyPath = suitePath();
    const legacy = JSON.stringify({ version: 1, activeSuite: "default", suites: { default: { agents: { general: "openai/gpt-5.6-luna" } } }, customAgents: {} }, null, 2) + "\n";
    writeFileSync(legacyPath, legacy);
    expect(() => loadSuiteConfig(legacyPath)).toThrow(/asignaciones|migraci[oó]n/i);
    expect(readFileSync(legacyPath, "utf8")).toBe(legacy);
  });

  it("persists one changed assignment while retaining every other agent assignment", () => {
    const path = suitePath();
    const initial = {
      ...minimal,
      modelAssignments: { general: "openai/old", "agent-especialit-github": "openai/keep" },
      variantAssignments: { general: "high", "agent-especialit-github": "medium" },
    };
    saveSuiteConfig(path, initial);

    saveSuiteConfig(path, setAgentModelAssignment(loadSuiteConfig(path), "general", "openai/new"));

    expect(loadSuiteConfig(path).modelAssignments).toEqual({
      general: "openai/new",
      "agent-especialit-github": "openai/keep",
    });
    expect(loadSuiteConfig(path).variantAssignments).toEqual({ "agent-especialit-github": "medium" });
  });

  it("round-trips optional base overrides and disabled agents while preserving v1", () => {
    const path = suitePath();
    const value = {
      ...minimal,
      baseOverrides: { general: { description: "Edited", skills: ["testing"], operations: "Be precise." } },
      disabledAgents: ["general"],
    };

    saveSuiteConfig(path, value);

    expect(loadSuiteConfig(path)).toEqual(value);
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual(value);
  });
});
