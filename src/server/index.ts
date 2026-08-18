import { ConsentLedger, registerMessageGrant } from "../core/grants.ts";
import { messageText, parseCanonicalConsent } from "../core/grants.ts";
import { decideTaskGate, SDD_ORCHESTRATOR, transformTaskPermission } from "../core/policy.ts";
import { defaultSuitePath, loadSuiteConfig } from "../core/persistence.ts";
import type { Config as PluginConfig, Plugin, PluginInput, PluginModule } from "@opencode-ai/plugin";
import type { Part } from "@opencode-ai/sdk";
import { randomBytes } from "node:crypto";

type RuntimePermission = NonNullable<PluginConfig["permission"]> & {
  task?: Record<string, "allow" | "deny" | "ask">;
};

type RuntimeAgentConfig = {
  permission?: RuntimePermission;
  [key: string]: unknown;
};

type RuntimePluginConfig = PluginConfig & {
  permission?: RuntimePermission;
  agent?: Record<string, RuntimeAgentConfig | undefined>;
};

function applyRuntimeTaskPermission(config: PluginConfig, disabledAgents: readonly string[] = []): void {
  const runtimeConfig = config as RuntimePluginConfig;
  const taskPermission = transformTaskPermission(disabledAgents);
  runtimeConfig.permission = {
    ...(runtimeConfig.permission ?? {}),
    task: taskPermission,
  };

  const orchestrator = runtimeConfig.agent?.[SDD_ORCHESTRATOR];
  if (!orchestrator || typeof orchestrator !== "object") return;
  const permission = orchestrator.permission;
  orchestrator.permission = {
    ...(permission && typeof permission === "object" ? permission : {}),
    task: taskPermission,
  };
}

export function applyRuntimeModelAssignments(config: PluginConfig, assignments: Record<string, string>, variants: Record<string, string> = {}): void {
  const runtimeConfig = config as RuntimePluginConfig;
  for (const [agentID, model] of Object.entries(assignments)) {
    const agent = runtimeConfig.agent?.[agentID];
    if (!agent || typeof agent !== "object") continue;
    agent.model = model;
    const variant = variants[agentID];
    if (variant === undefined) delete agent.variant;
    else agent.variant = variant;
  }
}

export function applyRuntimeBaseOverrides(config: PluginConfig, overrides: Record<string, { description?: string; skills?: string[]; operations?: string }>): void {
  const runtimeConfig = config as RuntimePluginConfig;
  for (const [agentID, override] of Object.entries(overrides)) {
    const agent = runtimeConfig.agent?.[agentID];
    if (!agent || typeof agent !== "object") continue;
    if (override.description !== undefined) agent.description = override.description;
    if (override.skills !== undefined) agent.skills = [...override.skills];
    if (override.operations !== undefined) agent.prompt = override.operations;
  }
}

export function applyRuntimeDisabledAgents(config: PluginConfig, disabledAgents: readonly string[]): void {
  const runtimeConfig = config as RuntimePluginConfig;
  for (const agentID of disabledAgents) if (runtimeConfig.agent && Object.prototype.hasOwnProperty.call(runtimeConfig.agent, agentID)) delete runtimeConfig.agent[agentID];
}

export interface AgentSuiteServerOptions {
  knownAgents?: () => string[];
  sessionAgent?: (sessionID: string) => string | undefined | Promise<string | undefined>;
  ledger?: ConsentLedger;
  disabledAgents?: () => readonly string[];
}

interface ChatMessageInput { sessionID: string; agent?: string; messageID?: string; }
interface ChatMessageOutput { message?: { id?: string; agent?: string }; parts: Part[]; }
interface ToolBeforeInput { tool: string; sessionID: string; callID: string; }
interface ToolBeforeOutput { args: Record<string, unknown>; }

export function createAgentSuiteServer(options: AgentSuiteServerOptions = {}) {
  const ledger = options.ledger ?? new ConsentLedger();
  const knownAgents = options.knownAgents ?? (() => []);
  const currentTurns = new Map<string, { messageID: string; agent?: string }>();
  return {
    "chat.message": async (input: ChatMessageInput, output: ChatMessageOutput) => {
      const messageID = input.messageID ?? output.message?.id;
      if (!messageID) {
        currentTurns.delete(input.sessionID);
        return;
      }
      currentTurns.set(input.sessionID, { messageID, agent: input.agent ?? output.message?.agent });
      const disabled = new Set(options.disabledAgents?.() ?? []);
      const known = knownAgents().filter((agent) => !disabled.has(agent));
      registerMessageGrant(ledger, { sessionID: input.sessionID, messageID, parts: output.parts }, known);
      const sessionAgent = input.agent ?? output.message?.agent;
      if (sessionAgent === SDD_ORCHESTRATOR) {
        const text = messageText({ sessionID: input.sessionID, messageID, parts: output.parts });
        const existing = new Set(output.parts.flatMap((part) => part.type === "agent" ? [part.name] : []));
        for (const agent of parseCanonicalConsent(text, known)) {
          if (existing.has(agent)) continue;
          output.parts.push({
            id: `prt_agent_suite_${randomBytes(8).toString("hex")}`,
            sessionID: input.sessionID,
            messageID,
            type: "agent",
            name: agent,
            source: { value: text, start: 0, end: text.length },
          });
        }
      }
    },
    "tool.execute.before": async (input: ToolBeforeInput, output: ToolBeforeOutput) => {
      if (input.tool !== "task") return;
      const turn = currentTurns.get(input.sessionID);
      if (!turn) throw new Error("Suite de Agentes: cannot resolve the current turn for this task");
      const sessionAgent = turn.agent ?? await options.sessionAgent?.(input.sessionID);
      if (!sessionAgent) throw new Error("Suite de Agentes: cannot resolve the session agent for the current turn");
      const target = typeof output.args.subagent_type === "string" ? output.args.subagent_type : "";
      if (!target && sessionAgent === SDD_ORCHESTRATOR) throw new Error("Suite de Agentes: task target subagent_type is missing");
      const decision = decideTaskGate({ sessionAgent, target, sessionID: input.sessionID, messageID: turn.messageID, ledger, disabledAgents: options.disabledAgents?.() });
      if (!decision.allowed && sessionAgent === SDD_ORCHESTRATOR) throw new Error(`Suite de Agentes: ${decision.reason}`);
    },
    "tool.execute.after": async () => undefined,
  };
}

async function resolveSessionAgent(input: PluginInput, sessionID: string): Promise<string | undefined> {
  try {
    const response = await input.client.session.messages({ path: { id: sessionID }, query: { limit: 20 } });
    const messages = response.data ?? [];
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const info = messages[index]?.info;
      if (info?.role === "user") return info.agent;
    }
  } catch { return undefined; }
  return undefined;
}

export const serverPlugin: Plugin = async (input) => {
  const registeredAgents = new Set<string>();
  let disabledAgents: string[] = [];
  const hooks = createAgentSuiteServer({
    knownAgents: () => [...registeredAgents],
    sessionAgent: (sessionID) => resolveSessionAgent(input, sessionID),
    disabledAgents: () => disabledAgents,
  });
  return {
    ...hooks,
    config: async (config: PluginConfig) => {
      try {
        const suite = loadSuiteConfig(defaultSuitePath());
        disabledAgents = [...(suite.disabledAgents ?? [])];
        applyRuntimeDisabledAgents(config, disabledAgents);
        applyRuntimeBaseOverrides(config, suite.baseOverrides ?? {});
        applyRuntimeTaskPermission(config, disabledAgents);
        applyRuntimeModelAssignments(config, suite.modelAssignments, suite.variantAssignments);
      } catch { disabledAgents = []; applyRuntimeTaskPermission(config); /* TUI reports malformed suite config. */ }
      registeredAgents.clear();
      for (const agentID of Object.keys(config.agent ?? {})) registeredAgents.add(agentID);
    },
  };
};
const plugin: PluginModule = { id: "agent-suite", server: serverPlugin };
export default plugin;
export { ConsentLedger };
