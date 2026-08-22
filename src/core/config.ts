import type { BaseAgentOverride, CustomAgent, SuiteConfig } from "./types.ts";
import { SUITE_DE_AGENTES_SEED } from "./suites.ts";

const ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const MODEL = /^[^/\s]+\/[^/\s]+$/;
const VARIANT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export interface AgentPatch {
  newId?: string;
  description?: string;
  skills?: string[];
  operations?: string;
  model?: string;
  effort?: string;
}

const PROTECTED_KEYS = new Set(["__proto__", "constructor", "prototype"]);
function safeRecord(value: unknown, label: string): Record<string, unknown> {
  const parsed = record(value, label);
  for (const key of Object.keys(parsed)) if (PROTECTED_KEYS.has(key)) throw new Error(`Invalid ${label} key: ${key}`);
  return parsed;
}

export function validateAgentId(value: string): string {
  if (typeof value !== "string" || !ID.test(value) || value.length > 64) throw new Error("Invalid agent id: use lowercase kebab-case without path separators");
  return value;
}

export function validateModelId(value: string): string {
  const model = typeof value === "string" ? value.trim() : "";
  if (!MODEL.test(model)) throw new Error("Invalid model id: use provider/model without whitespace");
  return model;
}

export function validateVariantId(value: string): string {
  const variant = typeof value === "string" ? value : "";
  if (!VARIANT.test(variant)) throw new Error("Invalid variant id: use a non-empty safe key without whitespace or path separators");
  return variant;
}

export function validateSkillId(value: string): string {
  if (typeof value !== "string" || !ID.test(value) || value.length > 64) throw new Error("Invalid skill id: use lowercase kebab-case without path separators");
  return value;
}

export function patchCustomAgent(config: SuiteConfig, id: string, patch: AgentPatch): SuiteConfig {
  validateAgentId(id);
  const current = config.customAgents[id];
  if (!current) throw new Error(`Unknown custom agent: ${id}`);

  const newId = patch.newId === undefined ? id : validateAgentId(patch.newId);
  const seedIDs = new Set<string>(SUITE_DE_AGENTES_SEED);
  if (newId !== id && (
    seedIDs.has(newId)
    || config.customAgents[newId]
    || Object.prototype.hasOwnProperty.call(config.modelAssignments, newId)
    || Object.prototype.hasOwnProperty.call(config.variantAssignments, newId)
  )) throw new Error(`Agent ID collision: ${newId}`);

  const skills = patch.skills === undefined ? [...current.skills] : patch.skills.map(validateSkillId);
  const updated: CustomAgent = {
    ...current,
    id: newId,
    description: patch.description === undefined ? current.description : patch.description,
    prompt: patch.operations === undefined ? current.prompt : patch.operations,
    skills,
  };
  const customAgents = { ...config.customAgents };
  delete customAgents[id];
  customAgents[newId] = updated;
  const modelAssignments = { ...config.modelAssignments };
  if (newId !== id && Object.prototype.hasOwnProperty.call(modelAssignments, id)) {
    modelAssignments[newId] = modelAssignments[id];
    delete modelAssignments[id];
  }
  const variantAssignments = { ...config.variantAssignments };
  if (newId !== id && Object.prototype.hasOwnProperty.call(variantAssignments, id)) {
    variantAssignments[newId] = variantAssignments[id];
    delete variantAssignments[id];
  }
  return {
    ...config,
    version: 1,
    customAgents,
    modelAssignments,
    variantAssignments,
    ...(config.baseOverrides === undefined ? {} : { baseOverrides: { ...config.baseOverrides } }),
    ...(config.disabledAgents === undefined ? {} : { disabledAgents: [...config.disabledAgents] }),
  };
}

export function patchBaseAgent(config: SuiteConfig, id: string, patch: AgentPatch): SuiteConfig {
  validateAgentId(id);
  if (!SUITE_DE_AGENTES_SEED.includes(id as (typeof SUITE_DE_AGENTES_SEED)[number])) throw new Error(`Unknown base agent: ${id}`);
  if (patch.newId !== undefined && patch.newId !== id) throw new Error(`Protected base agent ID cannot be renamed: ${id}`);
  const prior = config.baseOverrides?.[id] ?? {};
  const next: BaseAgentOverride = { ...prior };
  if (patch.description !== undefined) next.description = patch.description;
  if (patch.skills !== undefined) next.skills = patch.skills.map(validateSkillId);
  if (patch.operations !== undefined) next.operations = patch.operations;
  return { ...config, baseOverrides: { ...(config.baseOverrides ?? {}), [id]: next } };
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

export function parseSuiteConfig(value: unknown): SuiteConfig {
  const root = safeRecord(value, "Suite config");
  if (root.version !== 1) throw new Error("Invalid suite config version");
  for (const key of Object.keys(root)) {
    if (["version", "customAgents", "modelAssignments", "variantAssignments", "activeSuite", "suites", "baseOverrides", "disabledAgents", "coordinator"].includes(key)) continue;
    if (/profile|suite/i.test(key)) throw new Error(`La configuración de suites/perfiles no es compatible: ${key}`);
    throw new Error(`Unknown suite config field: ${key}`);
  }

  const hasLegacyShape = "activeSuite" in root || "suites" in root;
  if ("activeSuite" in root && typeof root.activeSuite !== "string") throw new Error("Invalid legacy active suite");
  if ("suites" in root) {
    const suitesRaw = record(root.suites, "suites");
    for (const [name, suiteValue] of Object.entries(suitesRaw)) {
      const suite = record(suiteValue, `suite ${name}`);
      const agentsRaw = suite.agents === undefined ? {} : record(suite.agents, `agents in ${name}`);
      if (Object.keys(agentsRaw).length > 0) throw new Error("La configuración heredada contiene asignaciones de agentes y no se migrará automáticamente");
    }
  }

  if (root.customAgents === undefined && !hasLegacyShape) throw new Error("customAgents must be an object");
  const customRaw = root.customAgents === undefined ? {} : safeRecord(root.customAgents, "customAgents");
  const customAgents: SuiteConfig["customAgents"] = Object.create(null) as SuiteConfig["customAgents"];
  const seedIDs = new Set<string>(SUITE_DE_AGENTES_SEED);
  for (const [id, raw] of Object.entries(customRaw)) {
    validateAgentId(id);
    if (seedIDs.has(id)) throw new Error(`Custom agent ID '${id}' duplicates a Suite de Agentes seed member`);
    const agent = safeRecord(raw, `custom agent ${id}`);
    if (agent.id !== id || typeof agent.description !== "string" || typeof agent.model !== "string" || typeof agent.prompt !== "string") throw new Error(`Invalid custom agent ${id}`);
    let model: string;
    try { model = validateModelId(agent.model); } catch { throw new Error(`Invalid custom agent ${id}`); }
    const skills = Array.isArray(agent.skills) && agent.skills.every((skill) => typeof skill === "string" && ID.test(skill)) ? agent.skills as string[] : [];
    const permissions = safeRecord(agent.permissions, `permissions for ${id}`) as Record<string, "allow" | "deny" | "ask">;
    for (const permission of Object.values(permissions)) if (!["allow", "deny", "ask"].includes(permission)) throw new Error(`Invalid permission for ${id}`);
    const parsedAgent = { id, description: agent.description, model, prompt: agent.prompt, permissions, skills };
    if (agent.materializeGlobal === true) customAgents[id] = { ...parsedAgent, materializeGlobal: true };
    else customAgents[id] = parsedAgent;
  }
  const assignmentsRaw = root.modelAssignments === undefined ? {} : safeRecord(root.modelAssignments, "modelAssignments");
  const modelAssignments: SuiteConfig["modelAssignments"] = Object.create(null) as SuiteConfig["modelAssignments"];
  for (const [agentID, rawModel] of Object.entries(assignmentsRaw)) {
    validateAgentId(agentID);
    try { modelAssignments[agentID] = validateModelId(rawModel as string); } catch { throw new Error(`Invalid model assignment for ${agentID}`); }
  }
  const variantsRaw = root.variantAssignments === undefined ? {} : safeRecord(root.variantAssignments, "variantAssignments");
  const variantAssignments: SuiteConfig["variantAssignments"] = Object.create(null) as SuiteConfig["variantAssignments"];
  for (const [agentID, rawVariant] of Object.entries(variantsRaw)) {
    validateAgentId(agentID);
    try { variantAssignments[agentID] = validateVariantId(rawVariant as string); } catch { throw new Error(`Invalid variant assignment for ${agentID}`); }
  }
  const hasBaseOverrides = root.baseOverrides !== undefined;
  const baseOverrides: NonNullable<SuiteConfig["baseOverrides"]> = {};
  if (root.baseOverrides !== undefined) {
    const overridesRaw = safeRecord(root.baseOverrides, "baseOverrides");
    for (const [agentID, raw] of Object.entries(overridesRaw)) {
      validateAgentId(agentID);
      if (!seedIDs.has(agentID)) throw new Error(`Base override must target a seed agent: ${agentID}`);
      const override = safeRecord(raw, `base override ${agentID}`);
      const parsed: BaseAgentOverride = {};
      if (override.description !== undefined) {
        if (typeof override.description !== "string") throw new Error(`Invalid base override ${agentID}`);
        parsed.description = override.description;
      }
      if (override.skills !== undefined) {
        if (!Array.isArray(override.skills)) throw new Error(`Invalid skills for base override ${agentID}`);
        parsed.skills = override.skills.map((skill) => validateSkillId(skill as string));
      }
      if (override.operations !== undefined) {
        if (typeof override.operations !== "string") throw new Error(`Invalid operations for base override ${agentID}`);
        parsed.operations = override.operations;
      }
      baseOverrides[agentID] = parsed;
    }
  }
  const hasDisabledAgents = root.disabledAgents !== undefined;
  const disabledAgents = root.disabledAgents === undefined ? [] : [...new Set(Array.isArray(root.disabledAgents) ? root.disabledAgents.map((id) => {
    if (typeof id !== "string") throw new Error("Invalid disabled agent id");
    return validateAgentId(id);
  }) : (() => { throw new Error("disabledAgents must be an array"); })())];
  for (const id of disabledAgents) if (!seedIDs.has(id) && !Object.prototype.hasOwnProperty.call(customAgents, id)) throw new Error(`Unknown disabled agent: ${id}`);
  const result: SuiteConfig = { version: 1, customAgents, modelAssignments, variantAssignments };
  if (hasBaseOverrides) result.baseOverrides = baseOverrides;
  if (hasDisabledAgents) result.disabledAgents = disabledAgents;
  if (root.coordinator !== undefined) result.coordinator = root.coordinator;
  return result;
}

export function setAgentModelAssignment(config: SuiteConfig, agentID: string, model: string, variant?: string): SuiteConfig {
  const validatedAgentID = validateAgentId(agentID);
  const validatedModel = validateModelId(model);
  const variantAssignments = { ...(config.variantAssignments ?? {}) };
  if (variant === undefined) delete variantAssignments[validatedAgentID];
  else variantAssignments[validatedAgentID] = validateVariantId(variant);
  return {
    ...config,
    modelAssignments: {
      ...(config.modelAssignments ?? {}),
      [validatedAgentID]: validatedModel,
    },
    variantAssignments,
  };
}
