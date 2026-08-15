import type { AgentCatalogRow, CustomAgent, SuiteConfig } from "../core/types.ts";
import { buildSuiteDeAgentesCatalog, SUITE_DE_AGENTES_SEED } from "../core/suites.ts";
import { setAgentModelAssignment } from "../core/config.ts";
import { loadSuiteConfig, saveSuiteConfig } from "../core/persistence.ts";
import { materializeGlobalAgent } from "../core/agents.ts";
import type { CreateDraft } from "./agent-suite-nav.ts";

export interface AgentSuiteController {
  snapshot(): { rows: AgentCatalogRow[]; version: string };
  refresh(): void;
  createAgent(draft: CreateDraft): Promise<void>;
  deleteAgent(id: string): Promise<void>;
  materialize(id: string): Promise<void>;
  setModel(id: string, model: string): Promise<void>;
  setEffort(id: string, variant: string): Promise<void>;
  setSkills(id: string, skills: string[]): Promise<void>;
  setOperations(id: string, prompt: string): Promise<void>;
  operations?(id: string): string | undefined;
}

type ControllerOptions = {
  path?: string;
  runtime?: Record<string, { model?: string; variant?: string; description?: string }>;
  custom?: Record<string, CustomAgent>;
  seed?: readonly string[];
};

export function createAgentSuiteController(
  rows: readonly AgentCatalogRow[] = [],
  version = "1.0.1",
  options: ControllerOptions = {},
): AgentSuiteController {
  const seed = options.seed ?? SUITE_DE_AGENTES_SEED;
  let currentRows = rows.map((row) => ({ ...row, skills: [...row.skills] }));
  const rowCustomAgents = Object.fromEntries(rows.filter((row) => row.membership === "custom").map((row) => [row.id, {
    id: row.id,
    description: row.description ?? row.id,
    model: row.model ?? "openai/gpt-5",
    variant: row.variant,
    prompt: "",
    permissions: { read: "allow" as const },
    skills: [...row.skills],
  }]));
  let config: SuiteConfig = options.path ? loadSuiteConfig(options.path) : { version: 1, customAgents: { ...rowCustomAgents, ...(options.custom ?? {}) }, modelAssignments: {}, variantAssignments: {} };
  const runtime = options.runtime ?? Object.fromEntries(currentRows.map((row) => [row.id, { model: row.model, variant: row.variant, description: row.description }]));
  const rebuild = () => { currentRows = buildSuiteDeAgentesCatalog(runtime, config.customAgents, seed, config.modelAssignments, config.variantAssignments); };
  const persist = () => { if (options.path) saveSuiteConfig(options.path, config); };
  const find = (id: string) => currentRows.find((row) => row.id === id);
  const mutation = async (operation: () => void) => { operation(); persist(); rebuild(); };
  return {
    snapshot: () => ({ rows: currentRows.map((row) => ({ ...row, skills: [...row.skills] })), version }),
    refresh: () => rebuild(),
    createAgent: async (draft) => mutation(() => {
      if (config.customAgents[draft.id] || seed.includes(draft.id)) throw new Error(`Agent already exists: ${draft.id}`);
      config.customAgents[draft.id] = { id: draft.id, description: draft.description, model: draft.model, variant: draft.effort || undefined, prompt: draft.operations, permissions: { read: "allow", edit: "ask" }, skills: [...draft.skills] };
    }),
    deleteAgent: async (id) => mutation(() => { delete config.customAgents[id]; delete config.modelAssignments[id]; delete config.variantAssignments[id]; }),
    materialize: async (id) => mutation(() => {
      const agent = config.customAgents[id];
      if (!agent) throw new Error(`Unknown custom agent: ${id}`);
      materializeGlobalAgent({ ...agent, model: config.modelAssignments[id] ?? agent.model, variant: config.variantAssignments[id] ?? agent.variant }, () => true);
    }),
    setModel: async (id, model) => mutation(() => { config = setAgentModelAssignment(config, id, model, config.variantAssignments[id]); }),
    setEffort: async (id, variant) => mutation(() => { config = setAgentModelAssignment(config, id, config.modelAssignments[id] ?? find(id)?.model ?? "openai/gpt-5", variant || undefined); }),
    setSkills: async (id, skills) => mutation(() => { const agent = config.customAgents[id]; if (!agent) throw new Error(`Unknown custom agent: ${id}`); agent.skills = [...skills]; }),
    setOperations: async (id, prompt) => mutation(() => { const agent = config.customAgents[id]; if (!agent) throw new Error(`Unknown custom agent: ${id}`); agent.prompt = prompt; }),
    operations: (id) => config.customAgents[id]?.prompt,
  };
}
