import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { AgentCatalogRow } from "../../core/types.ts";
import { modifyOptions, truncate } from "../agent-suite-vm.ts";
import type { ModifyEdit } from "../agent-suite-nav.ts";
import { FieldRow, KeyHintBar, SectionPanel, SelectableRow } from "../visual-primitives.tsx";

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

export interface ModifyMenuRow {
  label: string;
  option: ModifyOption;
  selected: boolean;
}

export function modifyMenuRows(row: Pick<AgentCatalogRow, "membership">, focus: number): readonly ModifyMenuRow[] {
  return modifyOptions(row).map((label, index) => ({ label, option: modifyOptionKey(label)!, selected: focus === index }));
}

export function ModifyPanel(props: ModifyPanelProps): JSX.Element {
  const colors = () => props.theme.current;
  const edit = () => props.edit ?? { mode: "menu" as const };
  if (edit().mode === "skills") {
    const skillsEdit = edit() as Extract<ModifyEdit, { mode: "skills" }>;
    return (
    <box flexDirection="column" gap={1}>
      <SectionPanel theme={props.theme} title="Skills pendientes">
      {props.row.skills.map((skill, index) => <SelectableRow theme={props.theme} selected={skillsEdit.focus === index} onMouseDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        props.onToggleSkill?.(index, skill);
      }}>{skillsEdit.selected.includes(skill) ? "✓ " : ""}{skill}</SelectableRow>)}
      </SectionPanel>
      {props.error ? <text fg={colors().error}>{props.error}</text> : null}
      <KeyHintBar theme={props.theme} hints="Enter guardar · Esc cancelar" />
    </box>
  );
  }
  if (edit().mode === "operations") {
    const operationsEdit = edit() as Extract<ModifyEdit, { mode: "operations" }>;
    return (
    <box flexDirection="column" gap={1}>
      <SectionPanel theme={props.theme} title="Operaciones pendientes">
      <input focused value={operationsEdit.prompt} onInput={(value) => props.onOperationsInput?.(value)} onSubmit={() => props.onCommit?.()} />
      </SectionPanel>
      {props.error ? <text fg={colors().error}>{props.error}</text> : null}
      <KeyHintBar theme={props.theme} hints="Enter guardar · Esc cancelar" />
    </box>
    );
  }
  return (
    <box flexDirection="column" gap={1}>
      <SectionPanel theme={props.theme} title="Configuración">
      <FieldRow theme={props.theme} label="Agente" value={truncate(props.row.id, 72)} />
      {modifyMenuRows(props.row, props.focus).map((row) => <SelectableRow theme={props.theme} selected={row.selected} onMouseDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        props.onActivate(row.option);
      }}>{row.label}</SelectableRow>)}
      </SectionPanel>
      <KeyHintBar theme={props.theme} hints="Enter selecciona · Esc vuelve a Info" />
    </box>
  );
}
