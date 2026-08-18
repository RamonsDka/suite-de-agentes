import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { AgentCatalogRow } from "../../core/types.ts";
import { agentInfoSections, Divider, FieldRow, SectionPanel, SelectableRow, StatusBadge, type AgentInfoSection, type StatusBadgeProps } from "../visual-primitives.tsx";

export interface AgentInfoProps {
  theme: TuiTheme;
  row: AgentCatalogRow;
  operations?: string;
  focus: number;
  onModify: () => void;
  onDelete: () => void;
  onDeactivate?: () => void;
  onReactivate?: () => void;
  onBack: () => void;
}

export const AGENT_INFO_LAYOUT = { flexGrow: 1, flexShrink: 1, minWidth: 0, minHeight: 0, gap: 1 };
export const AGENT_INFO_DETAIL_LAYOUT = { flexGrow: 1, flexShrink: 1, minWidth: 0, minHeight: 0, gap: 1, overflow: "scroll" as const };
export const AGENT_INFO_ACTIONS_LAYOUT = { flexShrink: 0, minWidth: 0 };

export function agentInfoDisplaySections(row: AgentCatalogRow, operations?: string): readonly AgentInfoSection[] {
  return agentInfoSections(row, operations);
}

export function agentInfoStatus(row: Pick<AgentCatalogRow, "enabled" | "membership">): StatusBadgeProps["status"] {
  return row.enabled ? "success" : row.membership === "custom" ? "warning" : "info";
}

/** Legacy flat formatter retained for public callers; rendering uses sections. */
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

export function infoActionKeys(row: Pick<AgentCatalogRow, "membership" | "enabled"> & { disabled?: boolean }): string[] {
  if (row.disabled === true) return ["Reactivar", "Esc Volver"];
  return row.membership === "custom" ? ["Renombrar", "F8 Eliminar", "Esc Volver"] : ["F5 Modificar", "Desactivar", "Esc Volver"];
}

export function AgentInfo(props: AgentInfoProps): JSX.Element {
  const actions = () => props.row.disabled === true ? ["Reactivar", "Volver"] : props.row.membership === "custom" ? ["Renombrar", "Eliminar", "Volver"] : ["Modificar", "Desactivar", "Volver"];
  const action = (index: number) => {
    if (actions()[index] === "Modificar" || actions()[index] === "Renombrar") props.onModify();
    else if (actions()[index] === "Eliminar") props.onDelete();
    else if (actions()[index] === "Desactivar") props.onDeactivate?.();
    else if (actions()[index] === "Reactivar") props.onReactivate?.();
    else props.onBack();
  };
  return (
    <box {...AGENT_INFO_LAYOUT} flexDirection="column">
      <scrollbox {...AGENT_INFO_DETAIL_LAYOUT}>
        {agentInfoDisplaySections(props.row, props.operations).map((section) => (
          <SectionPanel theme={props.theme} title={section.title}>
            {section.fields.map(([label, value]) => label === "Estado"
              ? <box flexDirection="row"><text fg={props.theme.current.textMuted}>{label}: </text><StatusBadge theme={props.theme} status={agentInfoStatus(props.row)}>{value}</StatusBadge></box>
              : <FieldRow theme={props.theme} label={label} value={value} wrap />)}
          </SectionPanel>
        ))}
      </scrollbox>
      <Divider theme={props.theme} />
      <box {...AGENT_INFO_ACTIONS_LAYOUT} flexDirection="column">
        {actions().map((label, index) => <SelectableRow theme={props.theme} selected={props.focus === index} onActivate={() => action(index)}>{label}</SelectableRow>)}
      </box>
    </box>
  );
}
