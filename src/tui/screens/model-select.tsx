import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { AgentCatalogRow } from "../../core/types.ts";
import { focusMarker, truncate } from "../agent-suite-vm.ts";

export interface ModelSelectProps {
  theme: TuiTheme;
  row: AgentCatalogRow;
  models: readonly string[];
  modelOptions?: readonly { title: string; value: string }[];
  focus: number;
  onSelect: (model: string) => void;
}

export function modelSelectionOptions(models: readonly string[]): Array<{ title: string; value: string }> {
  return models.map((model) => ({ title: model, value: model }));
}

export function ModelSelect(props: ModelSelectProps): JSX.Element {
  const colors = () => props.theme.current;
  const options = () => props.modelOptions ?? modelSelectionOptions(props.models);
  return (
    <box flexDirection="column" gap={1}>
      <text fg={colors().textMuted}>Actual: {props.row.model ?? "modelo pendiente"}</text>
      {options().map((option, index) => <box backgroundColor={props.focus === index ? colors().backgroundMenu : colors().backgroundPanel} onMouseDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        props.onSelect(option.value);
      }}><text fg={props.focus === index ? colors().selectedListItemText : colors().text}>{focusMarker(index, props.focus)} {truncate(option.title, 72)}</text></box>)}
      {options().length === 0 ? <text fg={colors().textMuted}>No hay modelos disponibles.</text> : null}
    </box>
  );
}
