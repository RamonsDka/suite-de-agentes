import type { RuntimeMessage } from "./types.ts";

const CANONICAL = /^usa también agente: ([a-z][a-z0-9]*(?:-[a-z0-9]+)*)$/u;

export function parseConsent(text: string, knownAgents: string[] = []): string[] {
  return parseCanonicalConsent(text, knownAgents);
}

export function parseCanonicalConsent(text: string, knownAgents: string[] = []): string[] {
  const canonical = CANONICAL.exec(text.trim());
  return canonical && knownAgents.includes(canonical[1]) ? [canonical[1]] : [];
}

export function messageText(message: RuntimeMessage): string {
  if (typeof message.text === "string") return message.text;
  return (message.parts ?? []).flatMap((part) => {
    if (!part || typeof part !== "object") return [];
    const value = part as Record<string, unknown>;
    return value.type === "text" && typeof value.text === "string" ? [value.text] : [];
  }).join("\n");
}

function nativeAgentNames(message: RuntimeMessage, knownAgents: string[]): string[] {
  return (message.parts ?? []).flatMap((part) => {
    if (!part || typeof part !== "object") return [];
    const value = part as Record<string, unknown>;
    if (value.type !== "agent" || typeof value.name !== "string") return [];
    return knownAgents.includes(value.name) ? [value.name] : [];
  });
}

export class ConsentLedger {
  private readonly grants = new Map<string, Map<string, Set<string>>>();
  grant(sessionID: string, messageID: string, agents: string[]): void {
    let session = this.grants.get(sessionID);
    if (!session) { session = new Map(); this.grants.set(sessionID, session); }
    session.set(messageID, new Set(agents));
  }
  has(sessionID: string, messageID: string, agent: string): boolean { return this.grants.get(sessionID)?.get(messageID)?.has(agent) === true; }
  clearSession(sessionID: string): void { this.grants.delete(sessionID); }
}

export function registerMessageGrant(ledger: ConsentLedger, message: RuntimeMessage, knownAgents: string[]): string[] {
  const agents = [...new Set([...parseConsent(messageText(message), knownAgents), ...nativeAgentNames(message, knownAgents)])];
  ledger.grant(message.sessionID, message.messageID, agents);
  return agents;
}
