import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { AgentCatalogRow } from "../../core/types.ts";
import { focusMarker, modifyOptions, truncate } from "../agent-suite-vm.ts";
import type { ModifyEdit } from "../agent-suite-nav.ts";

export interface ModifyPanelProps {
  theme: TuiTheme;
  row: AgentCatalogRow;
  focus: number;
  edit?: ModifyEdit;
  error?: string;
  onActivate: (option: "model" | "effort" | "skills" | "operations" | "back") => void;
  onToggleSkill?: (index: number, skill: string) => void;
  onOperationsInput?: (value: string) => void;
  onCommit?: () => void;
  onCancel?: () => void;
  onBack: () => void;
}

export type ModifyOption = "model" | "effort" | "skills" | "operations" | "back";

export function modifyOptionKey(label: string): ModifyOption | undefined {
  const labels: Record<string, ModifyOption> = { "Modelo de IA": "model", "Nivel de esfuerzo": "effort", Skills: "skills", Operaciones: "operations", Volver: "back" };
  return labels[label];
}

export function ModifyPanel(props: ModifyPanelProps): JSX.Element {
  const colors = () => props.theme.current;
  const labels = () => modifyOptions(props.row);
  const edit = () => props.edit ?? { mode: "menu" as const };
  if (edit().mode === "skills") {
    const skillsEdit = edit() as Extract<ModifyEdit, { mode: "skills" }>;
    return (
    <box flexDirection="column" gap={1}>
      <text fg={colors().textMuted}>Skills pendientes</text>
      {props.row.skills.map((skill, index) => <box backgroundColor={skillsEdit.selected.includes(skill) ? colors().backgroundMenu : colors().backgroundPanel} onMouseDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        props.onToggleSkill?.(index, skill);
      }}><text fg={skillsEdit.selected.includes(skill) ? colors().selectedListItemText : colors().text}>{focusMarker(index, skillsEdit.focus)} {skill}</text></box>)}
      {props.error ? <text fg={colors().error}>{props.error}</text> : null}
      <text fg={colors().textMuted}>Enter guardar · Esc cancelar</text>
    </box>
  );
  }
  if (edit().mode === "operations") {
    const operationsEdit = edit() as Extract<ModifyEdit, { mode: "operations" }>;
    return (
    <box flexDirection="column" gap={1}>
      <text fg={colors().textMuted}>Operaciones pendientes</text>
      <input focused value={operationsEdit.prompt} onInput={(value) => props.onOperationsInput?.(value)} onSubmit={() => props.onCommit?.()} />
      {props.error ? <text fg={colors().error}>{props.error}</text> : null}
      <text fg={colors().textMuted}>Enter guardar · Esc cancelar</text>
    </box>
    );
  }
  return (
    <box flexDirection="column" gap={1}>
      <text fg={colors().textMuted}>{truncate(`Agente: ${props.row.id}`, 72)}</text>
      {labels().map((label, index) => <box backgroundColor={props.focus === index ? colors().backgroundMenu : colors().backgroundPanel} onMouseDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const option = modifyOptionKey(label);
        if (option) props.onActivate(option);
      }}><text fg={props.focus === index ? colors().selectedListItemText : colors().text}>{focusMarker(index, props.focus)} {label}</text></box>)}
      <text fg={colors().textMuted}>Enter selecciona · Esc vuelve a Info</text>
    </box>
  );
}
