import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { AgentCatalogRow } from "../../core/types.ts";
import { focusMarker } from "../agent-suite-vm.ts";

export interface DeleteWarningProps {
  theme: TuiTheme;
  row: AgentCatalogRow;
  focus: 0 | 1;
  onConfirm: () => void;
  onCancel: () => void;
  error?: string;
}

export function deleteConfirmationOptions(): [string, string] {
  return ["Eliminar", "Cancelar"];
}

export function DeleteWarning(props: DeleteWarningProps): JSX.Element {
  const colors = () => props.theme.current;
  return (
    <box flexDirection="column" gap={1}>
      <text fg={colors().warning}>¿Eliminar el agente personalizado {props.row.id}?</text>
      <text fg={colors().textMuted}>Esta acción modifica la configuración persistida.</text>
      {deleteConfirmationOptions().map((label, index) => <box backgroundColor={props.focus === index ? colors().backgroundMenu : colors().backgroundPanel} onMouseDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        if (index === 0) props.onConfirm(); else props.onCancel();
      }}><text fg={props.focus === index ? colors().selectedListItemText : colors().text}>{focusMarker(index, props.focus)} {label}</text></box>)}
      {props.error ? <text fg={colors().error}>{props.error}</text> : <text fg={colors().textMuted}>Enter confirma · Esc cancela</text>}
    </box>
  );
}
