import type { AgentCatalogRow, BuiltInOverride, CustomAgent } from "./types.ts";
import { CANONICAL_BUILT_IN_AGENTS, getBuiltInDefinition, restoreBuiltInBaseline } from "./built-in-agents.ts";

export const SUITE_DE_AGENTES_SEED = ["general", "build", "plan", "explore", "compaction", "title", "summary", "agent-especialit-github"] as const;

export function restoreBuiltInAgentOverride(
  id: string,
  overrides: Record<string, BuiltInOverride> = {},
): Record<string, BuiltInOverride> {
  return restoreBuiltInBaseline(id, overrides);
}

export function buildSuiteDeAgentesCatalog(
  runtime: Record<string, { model?: string; variant?: string; description?: string }>,
  custom: Record<string, CustomAgent>,
  seed: readonly string[] = SUITE_DE_AGENTES_SEED,
  modelAssignments: Record<string, string> = {},
  variantAssignments: Record<string, string> = {},
  builtInOverrides: Record<string, BuiltInOverride> = {},
  disabledAgents: readonly string[] = [],
): AgentCatalogRow[] {
  const seedIDs = new Set(seed);
  const disabledIDs = new Set(disabledAgents);
  const memberIDs = new Set([...seed, ...Object.keys(custom)]);
  return [...memberIDs].map((id): AgentCatalogRow => {
    const runtimeAgent = runtime[id];
    const customAgent = custom[id];
    const definition = getBuiltInDefinition(id);
    const override = builtInOverrides[id] ?? {};
    const row: AgentCatalogRow = {
      id,
      membership: seedIDs.has(id) ? "seed" : "custom",
      enabled: runtimeAgent !== undefined && !disabledIDs.has(id),
      disabled: disabledIDs.has(id),
      skills: override.skills ? [...override.skills] : customAgent ? [...customAgent.skills] : definition ? [...definition.baseline.skills] : [],
      consent: "explicit-current-turn",
    };
    const model = modelAssignments[id] ?? runtimeAgent?.model ?? customAgent?.model ?? definition?.baseline.model;
    const description = override.description ?? runtimeAgent?.description ?? customAgent?.description ?? definition?.baseline.description;
    const variant = variantAssignments[id] ?? runtimeAgent?.variant ?? definition?.baseline.effort;
    const operations = override.operations ?? customAgent?.prompt ?? definition?.baseline.operations;
    if (model !== undefined) row.model = model;
    if (description !== undefined) row.description = description;
    if (variant !== undefined) row.variant = variant;
    if (operations !== undefined) row.operations = operations;
    return row;
  }).sort((a, b) => a.id.localeCompare(b.id));
}
