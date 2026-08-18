import { describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { INTERNAL_AGENT_ALLOWLIST, transformTaskPermission } from "../src/core/policy.ts";
import { defaultSuitePath, saveSuiteConfig } from "../src/core/persistence.ts";
import defaultPlugin, { createAgentSuiteServer, serverPlugin } from "../src/server/index.ts";

describe("server adapter", () => {
  it("gates a non-SDD task using the current chat message only", async () => {
    const hooks = createAgentSuiteServer({ knownAgents: () => ["github-specialist"] });
    await hooks["chat.message"]({ sessionID: "s", agent: "gentle-orchestrator", messageID: "m1" }, { message: { id: "m1", agent: "gentle-orchestrator" } as never, parts: [{ type: "text", text: "usa también agente: github-specialist" }] as never });
    await expect(hooks["tool.execute.before"]({ tool: "task", sessionID: "s", callID: "c1" }, { args: { subagent_type: "github-specialist" } })).resolves.toBeUndefined();
    await hooks["chat.message"]({ sessionID: "s", agent: "gentle-orchestrator", messageID: "m2" }, { message: { id: "m2", agent: "gentle-orchestrator" } as never, parts: [] as never });
    await expect(hooks["tool.execute.before"]({ tool: "task", sessionID: "s", callID: "c2" }, { args: { subagent_type: "github-specialist" } })).rejects.toThrow("current message");
  });

  it("denies and then allows agent-especialit-github only with exact current-turn consent", async () => {
    const hooks = await serverPlugin({} as never);
    await hooks.config?.({ agent: { "agent-especialit-github": {} } } as never);
    await hooks["chat.message"]?.({ sessionID: "github", agent: "gentle-orchestrator", messageID: "m1" }, {
      message: { id: "m1", agent: "gentle-orchestrator" } as never,
      parts: [] as never,
    });
    await expect(hooks["tool.execute.before"]?.({ tool: "task", sessionID: "github", callID: "deny" }, {
      args: { subagent_type: "agent-especialit-github" },
    })).rejects.toThrow("Blocked agent 'agent-especialit-github'");

    const output = {
      message: { id: "m2", agent: "gentle-orchestrator" },
      parts: [{ type: "text", text: "usa también agente: agent-especialit-github" }],
    } as never;
    await hooks["chat.message"]?.({ sessionID: "github", agent: "gentle-orchestrator", messageID: "m2" }, output);
    expect((output as { parts: Array<Record<string, unknown>> }).parts).toContainEqual(expect.objectContaining({ type: "agent", name: "agent-especialit-github" }));
    await expect(hooks["tool.execute.before"]?.({ tool: "task", sessionID: "github", callID: "allow" }, {
      args: { subagent_type: "agent-especialit-github" },
    })).resolves.toBeUndefined();

    await hooks["chat.message"]?.({ sessionID: "github", agent: "gentle-orchestrator", messageID: "m3" }, {
      message: { id: "m3", agent: "gentle-orchestrator" } as never,
      parts: [] as never,
    });
    await expect(hooks["tool.execute.before"]?.({ tool: "task", sessionID: "github", callID: "expired" }, {
      args: { subagent_type: "agent-especialit-github" },
    })).rejects.toThrow("Blocked agent 'agent-especialit-github'");
  });

  it("fails closed when the current message ID or session agent cannot be resolved", async () => {
    const hooks = createAgentSuiteServer({ knownAgents: () => ["github-specialist"] });
    await hooks["chat.message"]({ sessionID: "s", agent: "gentle-orchestrator" }, { message: { agent: "gentle-orchestrator" } as never, parts: [{ type: "text", text: "usa también agente: github-specialist" }] as never });
    await expect(hooks["tool.execute.before"]({ tool: "task", sessionID: "s", callID: "c1" }, { args: { subagent_type: "github-specialist" } })).rejects.toThrow("turn");
    const unknown = createAgentSuiteServer();
    await expect(unknown["tool.execute.before"]({ tool: "task", sessionID: "missing", callID: "c1" }, { args: { subagent_type: "general" } })).rejects.toThrow("turn");
  });

  it("exports the server entry as the real OpenCode server module", () => {
    expect(defaultPlugin).toMatchObject({ id: "agent-suite", server: expect.any(Function) });
  });

  it("fails closed when the registered-agent inventory is unavailable", async () => {
    const hooks = createAgentSuiteServer();
    await hooks["chat.message"]({ sessionID: "s", agent: "gentle-orchestrator", messageID: "m1" }, { message: { agent: "gentle-orchestrator" } as never, parts: [{ type: "text", text: "usa también agente: general" }] as never });
    await expect(hooks["tool.execute.before"]({ tool: "task", sessionID: "s", callID: "c1" }, { args: { subagent_type: "general" } })).rejects.toThrow("Blocked agent");
  });

  it("uses the config inventory and message agent with the real server hook shapes", async () => {
    const hooks = await serverPlugin({} as never);
    await hooks.config?.({ agent: { general: {} }, default_agent: "gentle-orchestrator" } as never);
    await hooks["chat.message"]?.({ sessionID: "s", messageID: "m1" }, { message: { id: "m1", agent: "gentle-orchestrator" } as never, parts: [{ type: "text", text: "usa también agente: general" }] as never });
    await expect(hooks["tool.execute.before"]?.({ tool: "task", sessionID: "s", callID: "c1" }, { args: { subagent_type: "general" } })).resolves.toBeUndefined();
    await hooks["chat.message"]?.({ sessionID: "s", messageID: "m2" }, { message: { id: "m2", agent: "gentle-orchestrator" } as never, parts: [{ type: "text", text: "usa también agente: unknown" }] as never });
    await expect(hooks["tool.execute.before"]?.({ tool: "task", sessionID: "s", callID: "c2" }, { args: { subagent_type: "unknown" } })).rejects.toThrow("Blocked agent");
  });

  it("allows every configured internal agent without a current-turn ledger grant", async () => {
    const hooks = await serverPlugin({} as never);
    const config = {
      model: "openai/test-model",
      share: "manual",
      permission: {
        edit: "deny",
        bash: { "*": "ask" },
        webfetch: "deny",
        task: { "*": "ask", general: "allow", "sdd-evil": "allow" },
      },
      agent: {
        "gentle-orchestrator": {
          model: "openai/orchestrator-model",
          permission: {
            edit: "deny",
            bash: "allow",
            task: { "*": "ask", "sdd-evil": "allow" },
          },
        },
        ...Object.fromEntries(INTERNAL_AGENT_ALLOWLIST.map((agent) => [agent, {}])),
      },
    };
    await hooks.config?.(config as never);

    expect(config.model).toBe("openai/test-model");
    expect(config.share).toBe("manual");
    expect(config.permission.edit).toBe("deny");
    expect(config.permission.bash).toEqual({ "*": "ask" });
    expect(config.permission.webfetch).toBe("deny");
    expect(config.permission.task).toEqual(transformTaskPermission());
    const orchestrator = config.agent["gentle-orchestrator"] as {
      model: string;
      permission: { edit: string; bash: string; task: Record<string, string> };
    };
    expect(orchestrator.model).toBe("openai/orchestrator-model");
    expect(orchestrator.permission.edit).toBe("deny");
    expect(orchestrator.permission.bash).toBe("allow");
    expect(orchestrator.permission.task).toEqual(transformTaskPermission());

    await hooks["chat.message"]?.({ sessionID: "internal", agent: "gentle-orchestrator", messageID: "m1" }, {
      message: { id: "m1", agent: "gentle-orchestrator" } as never,
      parts: [] as never,
    });
    for (const target of INTERNAL_AGENT_ALLOWLIST) {
      await expect(hooks["tool.execute.before"]?.({ tool: "task", sessionID: "internal", callID: target }, {
        args: { subagent_type: target },
      })).resolves.toBeUndefined();
    }
  });

  it("does not invent an orchestrator agent when the runtime config omits it", async () => {
    const hooks = await serverPlugin({} as never);
    const config = { permission: { edit: "deny" } };
    await expect(hooks.config?.(config as never)).resolves.toBeUndefined();
    expect(config.permission).toEqual({ edit: "deny", task: transformTaskPermission() });
    expect((config as { agent?: unknown }).agent).toBeUndefined();
  });

  it("keeps general, explore, GitHub, custom, and lookalike agents blocked without exact consent", async () => {
    const hooks = await serverPlugin({} as never);
    const external = ["general", "explore", "agent-especialit-github", "custom-agent", "sdd-evil"];
    await hooks.config?.({
      agent: Object.fromEntries([...INTERNAL_AGENT_ALLOWLIST, ...external].map((agent) => [agent, {}])),
    } as never);
    await hooks["chat.message"]?.({ sessionID: "external", agent: "gentle-orchestrator", messageID: "m1" }, {
      message: { id: "m1", agent: "gentle-orchestrator" } as never,
      parts: [] as never,
    });

    for (const target of external) {
      await expect(hooks["tool.execute.before"]?.({ tool: "task", sessionID: "external", callID: target }, {
        args: { subagent_type: target },
      })).rejects.toThrow(`Blocked agent '${target}'`);
    }
  });

  it("uses the official session messages API when the chat message omits agent", async () => {
    const input = { client: { session: { messages: async () => ({ data: [{ info: { role: "user", agent: "general" } }] }) } } };
    const hooks = await serverPlugin(input as never);
    await hooks.config?.({ agent: { general: {} } } as never);
    await hooks["chat.message"]?.({ sessionID: "s", messageID: "m1" }, { message: { id: "m1" } as never, parts: [] as never });
    await expect(hooks["tool.execute.before"]?.({ tool: "task", sessionID: "s", callID: "c1" }, { args: { subagent_type: "general" } })).resolves.toBeUndefined();
  });

  it("materializes canonical text consent into a valid AgentPart and keeps the grant agent-exact", async () => {
    const hooks = createAgentSuiteServer({ knownAgents: () => ["general", "explore"] });
    const output = {
      message: { id: "m1", agent: "gentle-orchestrator" },
      parts: [{ type: "text", text: "usa también agente: general" }],
    } as never;
    await hooks["chat.message"]({ sessionID: "s", messageID: "m1" }, output);
    const parts = (output as { parts: Array<Record<string, unknown>> }).parts;
    const agentPart = parts.find((part) => part.type === "agent");
    expect(agentPart).toMatchObject({ type: "agent", name: "general", sessionID: "s", messageID: "m1" });
    expect(String(agentPart?.id)).toMatch(/^prt_/);
    expect(agentPart?.source).toEqual({ value: "usa también agente: general", start: 0, end: 27 });
    await expect(hooks["tool.execute.before"]({ tool: "task", sessionID: "s", callID: "c1" }, { args: { subagent_type: "general" } })).resolves.toBeUndefined();
    await expect(hooks["tool.execute.before"]({ tool: "task", sessionID: "s", callID: "c2" }, { args: { subagent_type: "explore" } })).rejects.toThrow("Blocked agent");
  });

  it("does not materialize an AgentPart for unknown text consent", async () => {
    const hooks = createAgentSuiteServer({ knownAgents: () => ["general"] });
    const output = { message: { id: "m1", agent: "gentle-orchestrator" }, parts: [{ type: "text", text: "usa también agente: unknown" }] } as never;
    await hooks["chat.message"]({ sessionID: "s", messageID: "m1" }, output);
    expect((output as { parts: Array<Record<string, unknown>> }).parts.some((part) => part.type === "agent")).toBe(false);
  });

  it("applies only persisted per-agent model assignments through the config hook", async () => {
    const home = mkdtempSync(join(tmpdir(), "agent-suite-runtime-models-"));
    vi.stubEnv("HOME", home);
    vi.stubEnv("USERPROFILE", home);
    try {
      saveSuiteConfig(defaultSuitePath(), {
        version: 1,
        customAgents: {},
        modelAssignments: {
          general: "openai/assigned-general",
          "agent-especialit-github": "openai/assigned-github",
        },
        variantAssignments: {
          general: "high",
        },
      });
      const config = {
        permission: {},
        model: "openai/root-model",
        agent: {
          general: { model: "openai/old-general", variant: "old" },
          "agent-especialit-github": { model: "openai/old-github", variant: "old-github" },
          untouched: { model: "openai/keep", variant: "keep-variant" },
        },
      };
      const hooks = await serverPlugin({} as never);
      await hooks.config?.(config as never);

      expect(config.model).toBe("openai/root-model");
      expect(config.agent.general.model).toBe("openai/assigned-general");
      expect(config.agent.general.variant).toBe("high");
      expect(config.agent["agent-especialit-github"].model).toBe("openai/assigned-github");
      expect(config.agent["agent-especialit-github"].variant).toBeUndefined();
      expect(config.agent.untouched.model).toBe("openai/keep");
      expect(config.agent.untouched.variant).toBe("keep-variant");
      expect(JSON.parse(readFileSync(defaultSuitePath(), "utf8")).modelAssignments).toEqual({
        general: "openai/assigned-general",
        "agent-especialit-github": "openai/assigned-github",
      });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("removes disabled agents from runtime config and applies safe base overrides", async () => {
    const home = mkdtempSync(join(tmpdir(), "agent-suite-runtime-disabled-"));
    vi.stubEnv("HOME", home);
    vi.stubEnv("USERPROFILE", home);
    try {
      saveSuiteConfig(defaultSuitePath(), {
        version: 1,
        customAgents: {},
        modelAssignments: { "agent-especialit-github": "openai/assigned-github" },
        variantAssignments: { "agent-especialit-github": "high" },
        baseOverrides: { "agent-especialit-github": { description: "Edited GitHub", skills: ["testing"], operations: "Use GitHub safely." } },
        disabledAgents: ["general"],
      });
      const config = {
        permission: {},
        agent: {
          general: { model: "openai/general", description: "General" },
          "agent-especialit-github": { model: "openai/old-github", description: "Old GitHub", prompt: "Old prompt" },
        },
      };
      const hooks = await serverPlugin({} as never);
      await hooks.config?.(config as never);

      expect(config.agent.general).toBeUndefined();
      expect(config.agent["agent-especialit-github"]).toMatchObject({ model: "openai/assigned-github", variant: "high", description: "Edited GitHub", prompt: "Use GitHub safely.", skills: ["testing"] });
      expect((config.permission as { task?: Record<string, string> }).task?.general).toBe("deny");

      await hooks["chat.message"]?.({ sessionID: "disabled", agent: "gentle-orchestrator", messageID: "m1" }, {
        message: { id: "m1", agent: "gentle-orchestrator" } as never,
        parts: [{ type: "text", text: "usa también agente: general" }] as never,
      });
      await expect(hooks["tool.execute.before"]?.({ tool: "task", sessionID: "disabled", callID: "c1" }, { args: { subagent_type: "general" } })).rejects.toThrow(/disabled|desactiv/i);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("rejects explicit current-turn grants for a disabled target even when the ledger contains one", async () => {
    const hooks = createAgentSuiteServer({ knownAgents: () => ["general"], disabledAgents: () => ["general"] });
    await hooks["chat.message"]({ sessionID: "s", agent: "gentle-orchestrator", messageID: "m1" }, { message: { id: "m1", agent: "gentle-orchestrator" } as never, parts: [{ type: "text", text: "usa también agente: general" }] as never });
    await expect(hooks["tool.execute.before"]({ tool: "task", sessionID: "s", callID: "c1" }, { args: { subagent_type: "general" } })).rejects.toThrow(/disabled|desactiv/i);
  });
});
