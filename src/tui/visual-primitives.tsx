import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { RGBA } from "@opentui/core";
import type { AgentCatalogRow } from "../core/types.ts";
import type { AppScreen } from "./agent-suite-nav.ts";
import { createVisualTokens } from "./visual-tokens.ts";

export type VisualScreenKind = "landing" | "catalog" | "info" | "modify" | "model" | "effort" | "delete" | "create" | "error";

export interface AgentInfoSection {
  title: string;
  fields: readonly (readonly [string, string])[];
}

export function screenKeyHints(kind: VisualScreenKind, capability?: { canDelete?: boolean; canDeactivate?: boolean; canReactivate?: boolean }): string {
  switch (kind) {
    case "landing": return "↑↓ elige Catálogo o Crear agente · Enter abre · F10 cierra";
    case "catalog": return "↑↓ foco · Página ↑↓ cambia página · Enter abre Info · Esc volver";
    case "info": return capability?.canDelete ? "F5 modifica · F8 elimina · Enter selecciona · Esc volver" : capability?.canDeactivate ? "F5 modifica · Desactivar · Enter selecciona · Esc volver" : capability?.canReactivate ? "Reactivar · Enter selecciona · Esc volver" : "F5 modifica · Enter selecciona · Esc volver";
    case "modify": return "↑↓ navega · Enter selecciona · Esc volver";
    case "model":
    case "effort": return "↑↓ navega · Enter selecciona · Esc volver";
    case "delete": return "↑↓ elige · Enter confirma · Esc cancela";
    case "create": return "Enter continúa · Esc volver";
    case "error": return "Enter reintenta · Esc cierra";
  }
}

export function screenKeyHintsForScreen(screen: AppScreen): string {
  return screen.kind === "modify" && screen.edit?.mode !== undefined && screen.edit.mode !== "menu"
    ? "Enter guardar · Esc cancelar"
    : screenKeyHints(screen.kind);
}

export function agentInfoSections(row: AgentCatalogRow, operations?: string): readonly AgentInfoSection[] {
  const state = row.enabled ? "Disponible" : row.membership === "custom" ? "Creado · no materializado" : "No materializado";
  return [
    { title: "Identidad y estado", fields: [["Agente", row.id], ["Estado", state]] },
    { title: "Descripción", fields: [["Descripción", row.description || "ninguna"]] },
    { title: "Modelo y esfuerzo", fields: [["Modelo", row.model ?? "modelo pendiente"], ["Esfuerzo", row.variant ?? "predeterminado"]] },
    { title: "Skills y operaciones", fields: [["Skills", row.skills.join(", ") || "ninguna"], ["Operaciones", operations || "ninguna"]] },
  ];
}

export interface SelectionErrorPresentation {
  status: "error";
  message: string;
}

export function selectionErrorPresentation(message?: string): SelectionErrorPresentation | undefined {
  return message ? { status: "error", message } : undefined;
}

export function currentValueCue(value: string): string {
  return `${value} · Modelo actual`;
}

export interface SelectableRowProps {
  theme: TuiTheme;
  selected: boolean;
  status?: StatusBadgeProps["status"];
  children?: JSX.Element;
  onMouseDown?: (event: import("@opentui/core").MouseEvent) => void;
  onActivate?: () => void;
}

export interface SelectableRowPresentation {
  marker: string;
  background: RGBA;
  foreground: RGBA;
  border: RGBA;
}

export function selectableRowPresentation(theme: Pick<TuiTheme, "current">, selected: boolean, status?: StatusBadgeProps["status"]): SelectableRowPresentation {
  const tokens = createVisualTokens(theme.current);
  return {
    marker: selected ? "► " : "  ",
    background: selected ? tokens.selected.background : tokens.surface.panel,
    foreground: status ? tokens.status[status] : selected ? tokens.selected.foreground : tokens.surface.text,
    border: status ? tokens.status[status] : tokens.indicator,
  };
}

export function SelectableRow(props: SelectableRowProps): JSX.Element {
  const presentation = () => selectableRowPresentation(props.theme, props.selected, props.status);
  const activate = (event: import("@opentui/core").MouseEvent) => {
    if (props.onMouseDown) return props.onMouseDown(event);
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    props.onActivate?.();
  };
  return (
    <box border={props.selected ? ["left"] : false} borderColor={presentation().border} backgroundColor={presentation().background} onMouseDown={activate}>
      <text fg={presentation().foreground}>{presentation().marker}{props.children}</text>
    </box>
  );
}

export interface SectionPanelProps {
  theme: TuiTheme;
  title: string;
  children?: JSX.Element;
}

export function SectionPanel(props: SectionPanelProps): JSX.Element {
  const tokens = () => createVisualTokens(props.theme.current);
  return <box flexDirection="column" border={["left"]} borderColor={tokens().indicator} backgroundColor={tokens().surface.panel} paddingLeft={1}><text fg={tokens().indicator}>{props.title}</text>{props.children}</box>;
}

export interface FieldRowProps {
  theme: TuiTheme;
  label: string;
  value: string;
  wrap?: boolean;
}

export function FieldRow(props: FieldRowProps): JSX.Element {
  const tokens = () => createVisualTokens(props.theme.current);
  return <box flexDirection={props.wrap ? "column" : "row"} flexWrap={props.wrap ? "wrap" : undefined} minWidth={0}><text fg={tokens().surface.mutedText}>{props.label}: </text><text flexGrow={props.wrap ? 1 : undefined} flexShrink={props.wrap ? 1 : undefined} minWidth={props.wrap ? 0 : undefined} fg={tokens().surface.text} wrapMode={props.wrap ? "word" : "none"}>{props.value}</text></box>;
}

export interface StatusBadgeProps {
  theme: TuiTheme;
  status: "success" | "warning" | "error" | "info";
  children?: JSX.Element;
}

export function StatusBadge(props: StatusBadgeProps): JSX.Element {
  const tokens = () => createVisualTokens(props.theme.current);
  return <text fg={tokens().status[props.status]}>● {props.children}</text>;
}

export function Divider(props: { theme: TuiTheme }): JSX.Element {
  const tokens = () => createVisualTokens(props.theme.current);
  return <box border={["top"]} borderColor={tokens().surface.border} />;
}

export function KeyHintBar(props: { theme: TuiTheme; hints: string }): JSX.Element {
  const tokens = () => createVisualTokens(props.theme.current);
  return <box flexShrink={0} overflow="hidden" justifyContent="center"><text fg={tokens().surface.mutedText}>{props.hints}</text></box>;
}
