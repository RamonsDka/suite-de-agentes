import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import { filterSkills, type SkillCandidate, type SkillConflict } from "../../core/skill-catalog.ts";
import { searchInputPresentation, SelectableRow, SectionPanel } from "../visual-primitives.tsx";

export type SkillPickerRow = { id: string; label: string; description: string; attached: boolean };

export function skillPickerRows(installed: readonly SkillCandidate[], query: string, selected: readonly string[]): SkillPickerRow[] {
  return filterSkills(installed, query).map((skill) => ({ id: skill.id, label: skill.name, description: skill.description, attached: selected.includes(skill.id) }));
}

export function conflictDialogRows(conflict: SkillConflict): readonly string[] {
  return [conflict.id, conflict.existing, conflict.incoming, "Replace", "Keep existing", "Rename"];
}

export function SkillConflictDialog(props: { theme: TuiTheme; conflict: SkillConflict; focus: number; onResolve(action: SkillConflict["actions"][number]): void }): JSX.Element {
  const [id, existing, incoming, ...actions] = conflictDialogRows(props.conflict);
  return <SectionPanel theme={props.theme} title={`Conflicto: ${id}`}>
    <text>Actual: {existing}</text><text>Nuevo: {incoming}</text>
    {actions.map((label, index) => <SelectableRow theme={props.theme} selected={props.focus === index} onActivate={() => props.onResolve(props.conflict.actions[index]!)}>{label}</SelectableRow>)}
  </SectionPanel>;
}

export function SkillPicker(props: { theme: TuiTheme; installed: readonly SkillCandidate[]; selected: readonly string[]; query: string; focus: number; onQuery(value: string): void; onToggle(id: string): void }): JSX.Element {
  const search = () => searchInputPresentation(props.theme, true);
  const rows = () => skillPickerRows(props.installed, props.query, props.selected);
  return <box flexDirection="column" gap={1}><SectionPanel theme={props.theme} title="Skills instalados">
    <box backgroundColor={search().background} borderStyle="single" borderColor={search().border}><input focused value={props.query} placeholder="Buscar skill…" onInput={props.onQuery} onSubmit={() => { const skill = rows()[props.focus]; if (skill) props.onToggle(skill.id); }} /></box>
    {rows().map((skill, index) => <SelectableRow theme={props.theme} selected={props.focus === index} onActivate={() => props.onToggle(skill.id)}>{skill.attached ? "✓ " : "+ "}{skill.label}{skill.description ? ` · ${skill.description}` : ""}</SelectableRow>)}
  </SectionPanel></box>;
}
