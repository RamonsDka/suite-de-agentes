import type { SkillCandidate } from "../../core/skill-catalog.ts";

export type RuntimeSkill = { name: string; description?: string; location: string; content: string };
export type InstalledSkillClient = { app: { skills(): Promise<{ data?: unknown }> } };

function titleCase(value: string): string {
  return value.replace(/(^|[-_\s])([a-z])/g, (_match, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`);
}

export function adaptInstalledSkills(skills: readonly RuntimeSkill[]): SkillCandidate[] {
  return skills.filter((skill) => typeof skill.name === "string" && skill.name.length > 0)
    .map((skill) => ({ id: skill.name, name: titleCase(skill.name), description: skill.description ?? "", source: "installed" as const }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export async function discoverInstalledSkills(client: InstalledSkillClient): Promise<SkillCandidate[]> {
  const response = await client.app.skills();
  if (!Array.isArray(response.data)) throw new Error("Installed skill discovery returned an invalid response.");
  return adaptInstalledSkills(response.data.filter((skill): skill is RuntimeSkill => Boolean(skill) && typeof skill === "object" && "name" in skill && "location" in skill && "content" in skill));
}
