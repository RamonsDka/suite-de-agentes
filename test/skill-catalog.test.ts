import { describe, expect, it } from "vitest";
import { conflictForSkill, filterSkills, recommendSkill, renameSkill, resolveSkillConflict, variantForSkill, type SkillCandidate } from "../src/core/skill-catalog.ts";
import { adaptInstalledSkills, discoverInstalledSkills } from "../src/tui/ai/skill-sources.ts";
import { conflictDialogRows } from "../src/tui/screens/skill-picker.tsx";

const installed: SkillCandidate = { id: "testing", name: "Testing", description: "Run and write tests", source: "installed" };
const remote: SkillCandidate = { id: "test-expert", name: "Test Expert", description: "Testing workflows", source: "remote", registry: "skills.sh" };

describe("Skill catalog", () => {
  it("adapts installed runtime skills and filters their visible name or description", () => {
    const skills = adaptInstalledSkills([
      { name: "testing", description: "Run and write tests", location: "/skills/testing", content: "" },
      { name: "github", location: "/skills/github", content: "" },
    ]);

    expect(skills).toEqual([
      { id: "github", name: "Github", description: "", source: "installed" },
      installed,
    ]);
    expect(filterSkills(skills, "write")).toEqual([installed]);
    expect(filterSkills(skills, "git")).toEqual([{ id: "github", name: "Github", description: "", source: "installed" }]);
  });

  it("discovers installed runtime skills through the SDK adapter without accepting malformed results", async () => {
    await expect(discoverInstalledSkills({ app: { skills: async () => ({ data: [{ name: "github", description: "Git hosting", location: "/skills/github", content: "" }] }) } })).resolves.toEqual([
      { id: "github", name: "Github", description: "Git hosting", source: "installed" },
    ]);
    await expect(discoverInstalledSkills({ app: { skills: async () => ({ data: {} }) } })).rejects.toThrow(/invalid response/i);
  });

  it("recommends exactly one installed match before remote and generation", () => {
    expect(recommendSkill("testing", [installed], [remote])).toEqual({ candidate: installed, rationale: "Installed skill matches “testing”." });
    expect(recommendSkill("testing", [], [remote])).toEqual({ candidate: remote, rationale: "Verified skills.sh skill matches “testing”." });
    expect(recommendSkill("testing", [], [])).toEqual({ source: "generate", rationale: "No installed or verified remote skill matches “testing”." });
  });

  it("uses a deterministic skills.sh then verified GitHub ordering within the remote tier", () => {
    const github = { ...remote, id: "github-testing", registry: "github" as const };
    expect(recommendSkill("testing", [], [github, remote])).toEqual({ candidate: remote, rationale: "Verified skills.sh skill matches “testing”." });
  });

  it("describes collisions and preserves explicit Replace, Keep existing, and Rename actions", () => {
    const conflict = conflictForSkill({ ...installed, description: "Existing" }, { ...installed, description: "Incoming" });
    expect(conflict).toEqual({ id: "testing", existing: "Existing", incoming: "Incoming", actions: ["replace", "keep", "rename"] });
    expect(conflictForSkill(installed, remote)).toBeUndefined();
  });

  it("applies only the requested conflict outcome and renames without overwriting", () => {
    const existing = { ...installed, description: "Existing" };
    const incoming = { ...installed, description: "Incoming" };
    expect(resolveSkillConflict("keep", existing, incoming, ["testing"])).toEqual(existing);
    expect(resolveSkillConflict("replace", existing, incoming, ["testing"])).toEqual(incoming);
    expect(resolveSkillConflict("rename", existing, incoming, ["testing", "testing-2"])).toEqual({ ...incoming, id: "testing-3", name: "testing-3" });
  });

  it("presents the conflict diff with the three explicit action labels", () => {
    expect(conflictDialogRows({ id: "testing", existing: "Existing", incoming: "Incoming", actions: ["replace", "keep", "rename"] })).toEqual([
      "testing", "Existing", "Incoming", "Replace", "Keep existing", "Rename",
    ]);
  });

  it("creates safe unique renamed identifiers and labels close matches as distinct variants", () => {
    expect(renameSkill("Testing Helper", ["testing-helper", "testing-helper-2"])).toBe("testing-helper-3");
    expect(renameSkill("!!!", [])).toBe("skill");
    expect(variantForSkill({ ...installed, description: "Existing" }, { ...installed, description: "Adapted" }, ["testing-variant"])).toEqual({ id: "testing-variant-2", label: "Testing variant 2", baseId: "testing" });
    expect(variantForSkill(installed, remote, [])).toBeUndefined();
  });
});
