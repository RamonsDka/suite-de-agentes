import type { BuiltInDefinition, BuiltInOverride, BuiltInRuntimeAgent } from "./types.ts";

const PUBLIC_IDS = ["general", "build", "plan", "explore"] as const;
const INTERNAL_IDS = ["compaction", "title", "summary"] as const;
const EXCLUDED_PREFIXES = ["sdd-", "review-", "jd-"];
const EXCLUDED_IDS = new Set(["gentle-orchestrator", "agent-especialit-github"]);

function baseline(description: string, operations: string, skills: string[], model = "opencode/default", effort = "medium") {
  return Object.freeze({ description, model, effort, operations, skills: Object.freeze([...skills]) });
}

function definition(
  id: string,
  displayName: string,
  classification: "public" | "internal",
  description: string,
  operations: string,
  skills: string[],
): BuiltInDefinition {
  return Object.freeze({
    id,
    displayName,
    classification,
    curation: "curated",
    baseline: baseline(description, operations, skills),
  });
}

export const CANONICAL_BUILT_IN_AGENTS: readonly BuiltInDefinition[] = Object.freeze([
  definition("general", "General", "public", "Agente general para coordinar tareas de desarrollo.", "Analiza la solicitud y ejecuta el trabajo necesario.", ["planning"]),
  definition("build", "Build", "public", "Agente especializado en implementar cambios de código.", "Implementa cambios verificables con el menor alcance posible.", ["testing"]),
  definition("plan", "Plan", "public", "Agente especializado en planificar cambios técnicos.", "Propón un plan técnico claro antes de modificar código.", ["planning"]),
  definition("explore", "Explore", "public", "Agente especializado en explorar y comprender el código.", "Investiga el código existente y comunica hallazgos verificables.", ["research"]),
  definition("compaction", "Compaction", "internal", "Agente interno para compactar el contexto de la sesión.", "Conserva el contexto esencial de forma segura.", []),
  definition("title", "Title", "internal", "Agente interno para generar títulos de sesión.", "Genera un título breve y descriptivo.", []),
  definition("summary", "Summary", "internal", "Agente interno para resumir la sesión.", "Resume los resultados relevantes de la sesión.", []),
]);

export const CANONICAL_BUILT_IN_AGENT_IDS = Object.freeze(CANONICAL_BUILT_IN_AGENTS.map((agent) => agent.id));

const canonicalByID = new Map(CANONICAL_BUILT_IN_AGENTS.map((agent) => [agent.id, agent]));

export function getBuiltInDefinition(id: string): BuiltInDefinition | undefined {
  return canonicalByID.get(id);
}

export function isCanonicalBuiltInAgent(id: string): boolean {
  return canonicalByID.has(id);
}

export function isInternalBuiltInAgent(id: string): boolean {
  return (INTERNAL_IDS as readonly string[]).includes(id);
}

export function createPendingBuiltInDefinition(id: string): BuiltInDefinition {
  const displayName = id.replace(/(?:^|-)([a-z0-9])/g, (_, character: string) => character.toUpperCase());
  return Object.freeze({
    id,
    displayName,
    classification: "public",
    curation: "pending-curation",
    baseline: baseline(
      "Agente integrado detectado pendiente de curación.",
      "No se han definido operaciones curadas para este agente.",
      [],
    ),
    warnings: Object.freeze(["Este agente está pendiente de curación; no se hacen afirmaciones sobre sus capacidades."]),
  });
}

export function isDiscoverableBuiltInAgent(id: string, customIDs: readonly string[] = []): boolean {
  return !canonicalByID.has(id)
    && !EXCLUDED_IDS.has(id)
    && !customIDs.includes(id)
    && !EXCLUDED_PREFIXES.some((prefix) => id.startsWith(prefix))
    && !id.endsWith("-fallback");
}

export function discoverBuiltInAgents(
  runtime: Record<string, BuiltInRuntimeAgent>,
  customIDs: readonly string[] = [],
): BuiltInDefinition[] {
  return Object.keys(runtime)
    .filter((id) => isDiscoverableBuiltInAgent(id, customIDs))
    .sort((left, right) => left.localeCompare(right))
    .map(createPendingBuiltInDefinition);
}

export function restoreBuiltInBaseline(
  id: string,
  overrides: Record<string, BuiltInOverride> = {},
): Record<string, BuiltInOverride> {
  if (!isCanonicalBuiltInAgent(id)) throw new Error(`Unknown built-in agent: ${id}`);
  const restored = { ...overrides };
  delete restored[id];
  return restored;
}

export const BUILT_IN_AGENT_CLASSES = Object.freeze({ public: PUBLIC_IDS, internal: INTERNAL_IDS });
