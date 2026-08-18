import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { AgentCatalogRow } from "../../core/types.ts";
import { truncate } from "../agent-suite-vm.ts";
import { agentInfoSections, Divider, FieldRow, KeyHintBar, SectionPanel, SelectableRow, StatusBadge, type AgentInfoSection, type StatusBadgeProps } from "../visual-primitives.tsx";

export interface AgentInfoProps {
  theme: TuiTheme;
  row: AgentCatalogRow;
  operations?: string;
  focus: number;
  onModify: () => void;
  onDelete: () => void;
  onBack: () => void;
}

export const AGENT_INFO_DETAIL_LAYOUT = { flexGrow: 1, flexShrink: 1, minHeight: 0, maxHeight: 8, overflow: "scroll" as const };

export function agentInfoDisplaySections(row: AgentCatalogRow, operations?: string, maxLength = 72): readonly AgentInfoSection[] {
  return agentInfoSections(row, operations).map(({ title, fields }) => ({
    title,
    fields: fields.map(([label, value]) => [label, truncate(value, Math.max(0, maxLength - label.length - 2))] as const),
  }));
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

export function infoActionKeys(row: Pick<AgentCatalogRow, "membership">): string[] {
  return row.membership === "custom" ? ["F5 Modificar", "F8 Eliminar", "Esc Volver"] : ["F5 Modificar", "Esc Volver"];
}

export function AgentInfo(props: AgentInfoProps): JSX.Element {
  const actions = () => props.row.membership === "custom" ? ["Modificar", "Eliminar", "Volver"] : ["Modificar", "Volver"];
  const action = (index: number) => {
    if (actions()[index] === "Modificar") props.onModify();
    else if (actions()[index] === "Eliminar") props.onDelete();
    else props.onBack();
  };
  return (
    <box flexDirection="column" gap={1}>
      <scrollbox {...AGENT_INFO_DETAIL_LAYOUT}>
        {agentInfoDisplaySections(props.row, props.operations).map((section) => (
          <SectionPanel theme={props.theme} title={section.title}>
            {section.fields.map(([label, value]) => label === "Estado"
              ? <box flexDirection="row"><text fg={props.theme.current.textMuted}>{label}: </text><StatusBadge theme={props.theme} status={agentInfoStatus(props.row)}>{value}</StatusBadge></box>
              : <FieldRow theme={props.theme} label={label} value={value} />)}
          </SectionPanel>
        ))}
      </scrollbox>
      <Divider theme={props.theme} />
      <box flexDirection="column">
        {actions().map((label, index) => <SelectableRow theme={props.theme} selected={props.focus === index} onMouseDown={(event) => { if (event.button !== 0) return; event.preventDefault(); event.stopPropagation(); action(index); }}>{label}</SelectableRow>)}
      </box>
      <KeyHintBar theme={props.theme} hints={infoActionKeys(props.row).join(" · ")} />
    </box>
  );
}
