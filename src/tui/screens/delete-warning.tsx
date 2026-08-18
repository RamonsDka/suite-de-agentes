import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { AgentCatalogRow } from "../../core/types.ts";
import { Divider, SelectableRow, StatusBadge } from "../visual-primitives.tsx";

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

export function deleteWarningPresentation(focus: 0 | 1): { status: "warning"; options: Array<{ label: string; selected: boolean }> } {
  return { status: "warning", options: deleteConfirmationOptions().map((label, index) => ({ label, selected: focus === index })) };
}

export function DeleteWarning(props: DeleteWarningProps): JSX.Element {
  return (
    <box flexDirection="column" gap={1}>
      <StatusBadge theme={props.theme} status="warning">¿Eliminar el agente personalizado {props.row.id}?</StatusBadge>
      <text fg={props.theme.current.textMuted}>Esta acción modifica la configuración persistida.</text>
      <Divider theme={props.theme} />
      {deleteWarningPresentation(props.focus).options.map(({ label, selected }, index) => <SelectableRow theme={props.theme} selected={selected} onMouseDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        if (index === 0) props.onConfirm(); else props.onCancel();
      }}>{label}</SelectableRow>)}
      {props.error ? <StatusBadge theme={props.theme} status="error">{props.error}</StatusBadge> : null}
    </box>
  );
}
