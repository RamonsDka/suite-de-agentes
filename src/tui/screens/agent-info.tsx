import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { AgentCatalogRow } from "../../core/types.ts";
import { focusMarker, truncate } from "../agent-suite-vm.ts";

export interface AgentInfoProps {
  theme: TuiTheme;
  row: AgentCatalogRow;
  operations?: string;
  focus: number;
  onModify: () => void;
  onDelete: () => void;
  onBack: () => void;
}

export function formatAgentInfo(row: AgentCatalogRow, operations?: string): string[] {
  return [
    row.id,
    row.description === undefined ? "Descripción: ninguna" : row.description,
    `Skills: ${row.skills.join(", ") || "ninguna"}`,
    `Operaciones: ${operations || "ninguna"}`,
    `Modelo: ${row.model ?? "modelo pendiente"}`,
    `Esfuerzo: ${row.variant ?? "predeterminado"}`,
  ];
}

export function infoActionKeys(row: Pick<AgentCatalogRow, "membership">): string[] {
  return row.membership === "custom" ? ["F5 Modificar", "F8 Eliminar", "Esc Volver"] : ["F5 Modificar", "Esc Volver"];
}

export function AgentInfo(props: AgentInfoProps): JSX.Element {
  const colors = () => props.theme.current;
  const actions = () => props.row.membership === "custom" ? ["Modificar", "Eliminar", "Volver"] : ["Modificar", "Volver"];
  const action = (index: number) => {
    if (actions()[index] === "Modificar") props.onModify();
    else if (actions()[index] === "Eliminar") props.onDelete();
    else props.onBack();
  };
  return (
    <box flexDirection="column" gap={1}>
      <scrollbox flexGrow={1} maxHeight={8}>
        {formatAgentInfo(props.row, props.operations).map((line, index) => <text fg={index === 0 ? colors().primary : colors().text}>{truncate(line, 72)}</text>)}
      </scrollbox>
      <box flexDirection="column">
        {actions().map((label, index) => <box backgroundColor={props.focus === index ? colors().backgroundMenu : colors().backgroundPanel} onMouseDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.stopPropagation(); action(index); }}><text fg={props.focus === index ? colors().selectedListItemText : colors().text}>{focusMarker(index, props.focus)} {label}</text></box>)}
      </box>
      <text fg={colors().textMuted}>{infoActionKeys(props.row).join(" · ")}</text>
    </box>
  );
}
