import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { MouseEvent, RGBA } from "@opentui/core";
import { createTextAttributes } from "@opentui/core";
import type { AgentCatalogRow } from "../core/types.ts";
import type { AppScreen } from "./agent-suite-nav.ts";
import { createVisualTokens } from "./visual-tokens.ts";

export type VisualScreenKind = "landing" | "catalog" | "info" | "modify" | "model" | "effort" | "delete" | "create" | "coordinator" | "ai-gate" | "ai-interview" | "ai-preview" | "skill-picker" | "error";

export interface AgentInfoSection {
  title: string;
  fields: readonly (readonly [string, string])[];
}

export function screenKeyHints(kind: VisualScreenKind, capability?: { canDelete?: boolean; canDeactivate?: boolean; canReactivate?: boolean }): string {
  switch (kind) {
    case "landing": return "↑↓ elige Catálogo · Crear agente · Configuración · Enter abre · F10 cierra";
    case "catalog": return "/ buscar · click buscar · Enter resultados/Info · ↑↓ foco · Página ↑↓ · Esc volver";
    case "info": return capability?.canDelete ? "F5 modifica/renombra · F8 elimina · Enter selecciona · Esc volver" : capability?.canDeactivate ? "F5 modifica · Desactivar · Enter selecciona · Esc volver" : capability?.canReactivate ? "Reactivar · Enter selecciona · Esc volver" : "F5 modifica · Enter selecciona · Esc volver";
    case "modify": return "↑↓ navega · Enter selecciona · Esc volver";
    case "model":
    case "effort": return "↑↓ navega · Enter selecciona · Esc volver";
    case "delete": return "↑↓ elige · Enter confirma · Esc cancela";
    case "create": return "Enter continúa · Esc volver";
    case "coordinator": return "↑↓ navega · Enter selecciona · Esc volver";
    case "ai-gate": return "Configurar ahora · Cancelar · Enter selecciona · Esc volver";
    case "ai-interview": return "↑↓ navega · Enter responde · Revisar propuesta · Esc cancelar";
    case "ai-preview": return "Approve · Request changes · Discard · Enter selecciona · Esc volver";
    case "skill-picker": return "Escribe para buscar · Enter agrega · Esc volver";
    case "error": return "Enter reintenta · Esc cierra";
  }
}

export function screenKeyHintsForScreen(screen: AppScreen): string {
  if (screen.kind === "create" && screen.step === 5) return "Finalizar · Enter guarda · Esc volver";
  if (screen.kind === "modify" && screen.edit.mode === "menu") return "F10 Finalizar · ↑↓ navega · Enter selecciona · Esc volver";
  return screen.kind === "modify" && screen.edit?.mode !== undefined && screen.edit.mode !== "menu"
    ? "Enter guardar · Esc cancelar"
    : screenKeyHints(screen.kind);
}

export function keyHintPresentation(theme: Pick<TuiTheme, "current">, hints: string): RGBA {
  const tokens = createVisualTokens(theme.current);
  return hints.includes("Finalizar") ? tokens.action.finalize : tokens.surface.mutedText;
}

export interface SearchInputPresentation {
  background: RGBA;
  border: RGBA;
}

export function searchInputPresentation(theme: Pick<TuiTheme, "current">, focused: boolean): SearchInputPresentation {
  const tokens = createVisualTokens(theme.current);
  return { background: tokens.search.background, border: focused ? tokens.search.focus : tokens.surface.border };
}

export function agentInfoSections(row: AgentCatalogRow, operations?: string): readonly AgentInfoSection[] {
  const state = row.disabled ? "Desactivado" : row.enabled ? "Disponible" : row.membership === "custom" ? "Creado · no materializado" : "No materializado";
  const identityLabel = row.membership === "seed" ? "Identificador del sistema (protegido)" : "Agente";
  return [
    { title: "Identidad y estado", fields: [[identityLabel, row.id], ["Estado", state]] },
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
  onActivate?: () => void;
}

export interface SafeMouseActivation {
  onMouseDown: (event: MouseEvent) => void;
  onMouseUp: (event: MouseEvent) => void;
}

let activeMouseActivation: symbol | undefined;

export function createSafeMouseActivation(activate: () => void): SafeMouseActivation {
  const token = Symbol("selectable-row");
  const consume = (event: MouseEvent): boolean => {
    if (event.button !== 0) return false;
    event.preventDefault();
    event.stopPropagation();
    return true;
  };
  return {
    onMouseDown: (event) => {
      if (!consume(event)) return;
      activeMouseActivation = token;
    },
    onMouseUp: (event) => {
      if (!consume(event)) return;
      const shouldActivate = activeMouseActivation === token;
      activeMouseActivation = undefined;
      if (shouldActivate) activate();
    },
  };
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
  const activation = createSafeMouseActivation(() => props.onActivate?.());
  return (
    <box backgroundColor={presentation().background} onMouseDown={activation.onMouseDown} onMouseUp={activation.onMouseUp}>
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
  return <box flexDirection="column" backgroundColor={tokens().surface.panel} borderStyle="single" borderColor={tokens().indicator} padding={1} gap={1}><box justifyContent="center"><text fg={tokens().form.label} attributes={createTextAttributes({ bold: true })}>{props.title}</text></box>{props.children}</box>;
}

export interface FieldRowProps {
  theme: TuiTheme;
  label: string;
  value: string;
  wrap?: boolean;
}

export function FieldRow(props: FieldRowProps): JSX.Element {
  const tokens = () => createVisualTokens(props.theme.current);
  return <box flexDirection={props.wrap ? "column" : "row"} flexWrap={props.wrap ? "wrap" : undefined} minWidth={0}><text fg={tokens().form.label}>{props.label}: </text><text flexGrow={props.wrap ? 1 : undefined} flexShrink={props.wrap ? 1 : undefined} minWidth={props.wrap ? 0 : undefined} fg={tokens().form.value} wrapMode={props.wrap ? "word" : "none"}>{props.value}</text></box>;
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
  return <box height={1}><text fg={tokens().surface.border}> </text></box>;
}

export function KeyHintBar(props: { theme: TuiTheme; hints: string }): JSX.Element {
  return <box flexShrink={0} overflow="hidden" justifyContent="center"><text fg={keyHintPresentation(props.theme, props.hints)}>{props.hints}</text></box>;
}
