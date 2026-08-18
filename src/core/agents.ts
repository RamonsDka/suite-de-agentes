import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { validateAgentId } from "./config.ts";
import { generateAgentMarkdown } from "./agent-markdown.ts";
import type { CustomAgent } from "./types.ts";

export function globalAgentPath(agentID: string, home = process.env.HOME || process.env.USERPROFILE || "."): string {
  validateAgentId(agentID);
  return join(home, ".config", "opencode", "agent", `${agentID}.md`);
}

export function materializeGlobalAgent(agent: CustomAgent, confirm: () => boolean, home?: string): string {
  if (!confirm()) throw new Error("Global agent materialization was not confirmed");
  const target = globalAgentPath(agent.id, home);
  mkdirSync(dirname(target), { recursive: true });
  const temporary = `${target}.tmp-${randomBytes(6).toString("hex")}`;
  try { writeFileSync(temporary, generateAgentMarkdown(agent), { mode: 0o600 }); renameSync(temporary, target); } finally { if (existsSync(temporary)) unlinkSync(temporary); }
  return target;
}

export function renameMaterializedAgent(oldId: string, newId: string, agent: CustomAgent, home?: string): string {
  validateAgentId(oldId);
  validateAgentId(newId);
  if (oldId === newId) return globalAgentPath(newId, home);
  const oldPath = globalAgentPath(oldId, home);
  const newPath = globalAgentPath(newId, home);
  if (existsSync(newPath)) throw new Error(`Materialized agent already exists: ${newId}`);
  if (!existsSync(oldPath)) return newPath;

  mkdirSync(dirname(newPath), { recursive: true });
  const temporary = `${newPath}.tmp-${randomBytes(6).toString("hex")}`;
  let promoted = false;
  try {
    writeFileSync(temporary, generateAgentMarkdown({ ...agent, id: newId }), { mode: 0o600 });
    renameSync(temporary, newPath);
    promoted = true;
    unlinkSync(oldPath);
    return newPath;
  } catch (error) {
    if (promoted && existsSync(newPath)) unlinkSync(newPath);
    throw error;
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
}

export function listRuntimeModels(state: unknown): string[] {
  if (!state || typeof state !== "object") return [];
  const providers = (state as Record<string, unknown>).provider;
  if (!Array.isArray(providers)) return [];
  return providers.flatMap((provider) => {
    if (!provider || typeof provider !== "object") return [];
    const item = provider as Record<string, unknown>;
    const id = typeof item.id === "string" ? item.id : typeof item.name === "string" ? item.name : "";
    const models = item.models && typeof item.models === "object" ? Object.keys(item.models as object) : [];
    return id ? models.map((model) => `${id}/${model}`) : [];
  });
}
