import { describe, expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { globalAgentPath, materializeGlobalAgent } from "../src/core/agents.ts";

describe("agent materialization", () => {
  it("requires confirmation and writes only a validated global markdown path", () => {
    const home = mkdtempSync(join(tmpdir(), "agent-suite-home-"));
    const agent = { id: "safe-agent", description: "Safe", model: "openai/x", variant: "high", prompt: "Do work.", permissions: { read: "allow" as const }, skills: ["skill-one"] };
    expect(() => materializeGlobalAgent(agent, () => false, home)).toThrow("not confirmed");
    const path = materializeGlobalAgent(agent, () => true, home);
    expect(path).toBe(globalAgentPath("safe-agent", home));
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, "utf8")).toContain("skill: allow");
    expect(readFileSync(path, "utf8")).toContain("variant: high");
  });
});
