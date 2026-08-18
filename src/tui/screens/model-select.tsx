import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { AgentCatalogRow } from "../../core/types.ts";
import { truncate } from "../agent-suite-vm.ts";
import { Divider, FieldRow, KeyHintBar, SectionPanel, SelectableRow } from "../visual-primitives.tsx";

export interface ModelSelectProps {
  theme: TuiTheme;
  row: AgentCatalogRow;
  models: readonly string[];
  modelOptions?: readonly { title: string; value: string }[];
  focus: number;
  onSelect: (model: string) => void;
}

export const MODEL_EMPTY_MESSAGE = "No hay modelos disponibles.";

export function modelSelectionOptions(models: readonly string[]): Array<{ title: string; value: string }> {
  return models.map((model) => ({ title: model, value: model }));
}

export function modelSelectionRows(options: readonly { title: string; value: string }[], focus: number): Array<{ title: string; value: string; selected: boolean }> {
  return options.map((option, index) => ({ ...option, selected: focus === index }));
}

export function ModelSelect(props: ModelSelectProps): JSX.Element {
  const colors = () => props.theme.current;
  const options = () => props.modelOptions ?? modelSelectionOptions(props.models);
  return (
    <box flexDirection="column" gap={1}>
      <SectionPanel theme={props.theme} title="Modelo">
      <FieldRow theme={props.theme} label="Actual" value={props.row.model ?? "modelo pendiente"} />
      <Divider theme={props.theme} />
      {modelSelectionRows(options(), props.focus).map((option) => <SelectableRow theme={props.theme} selected={option.selected} onMouseDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        props.onSelect(option.value);
      }}>{truncate(option.title, 72)}</SelectableRow>)}
      {options().length === 0 ? <text fg={colors().textMuted}>{MODEL_EMPTY_MESSAGE}</text> : null}
      </SectionPanel>
      <KeyHintBar theme={props.theme} hints="↑↓ navega · Enter selecciona · Esc volver" />
    </box>
  );
}
