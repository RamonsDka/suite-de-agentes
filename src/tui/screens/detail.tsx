import type { JSX } from "@opentui/solid";
import { createSignal } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import type { TuiThemeCurrent } from "@opencode-ai/plugin/tui";
import type { AgentCatalogRow, CustomAgent } from "../../core/types.ts";
import { RING_STYLE } from "../layout.ts";
export type DetailAction = "Materializar" | "Modificar" | "Eliminar" | "Volver";
export interface DetailView {
  name: string;
  description: string;
  skills: string[];
  operations: string[];
  materialization: string;
  actions: DetailAction[];
}
export function materializationState(row: AgentCatalogRow): string {
  if (row.enabled) return "Disponible";
  return row.membership === "custom" ? "Creado · no materializado" : "No materializado";
}
export function buildDetailView(row: AgentCatalogRow, customAgent?: CustomAgent): DetailView {
  const operations = customAgent
    ? [customAgent.prompt, `Permisos: ${Object.entries(customAgent.permissions).map(([name, value]) => `${name}: ${value}`).join(", ") || "ninguno"}`]
    : ["Usa las instrucciones del agente disponible.", `Consentimiento: turno actual (usa también agente: ${row.id})`];
  return {
    name: row.id,
    description: row.description ?? "Sin descripción disponible.",
    skills: [...row.skills],
    operations,
    materialization: materializationState(row),
    actions: row.membership === "custom"
      ? row.enabled ? ["Modificar", "Eliminar", "Volver"] : ["Materializar", "Modificar", "Eliminar", "Volver"]
      : ["Modificar", "Volver"],
  };
}
export function confirmDeleteAction(focused: number): "cancel" | "confirm" {
  return focused === 1 ? "confirm" : "cancel";
}
export interface DetailProps {
  row: AgentCatalogRow;
  customAgent?: CustomAgent;
  theme: TuiThemeCurrent;
  onModify: () => void;
  onMaterialize?: () => void;
  onDelete: () => void;
  onBack: () => void;
}
function DetailChip(props: { label: string; theme: TuiThemeCurrent }): JSX.Element {
  return <box backgroundColor={props.theme.backgroundElement} paddingLeft={1} paddingRight={1}><text fg={props.theme.text}>{props.label}</text></box>;
}
function DetailActionButton(props: { label: string; focused: boolean; theme: TuiThemeCurrent; onSelect: () => void }): JSX.Element {
  return (
    <box
      border
      focusable
      focused={props.focused}
      {...RING_STYLE(props.theme)}
      borderColor={props.focused ? props.theme.borderActive : props.theme.border}
      backgroundColor={props.theme.backgroundPanel}
      paddingLeft={1}
      paddingRight={1}
      onMouseDown={props.onSelect}
    >
      <text fg={props.focused ? props.theme.selectedListItemText : props.theme.text}>{props.label}</text>
    </box>
  );
}
export function Detail(props: DetailProps): JSX.Element {
  const view = buildDetailView(props.row, props.customAgent);
  const [confirming, setConfirming] = createSignal(false);
  const [focused, setFocused] = createSignal(0);
  const actionCount = () => view.actions.length;
  const selectAction = (index: number) => {
    const action = view.actions[index];
    if (action === "Materializar") props.onMaterialize?.();
    else if (action === "Modificar") props.onModify();
    else if (action === "Eliminar") {
      setFocused(0);
      setConfirming(true);
    }
    else if (action === "Volver") props.onBack();
  };
  const selectConfirmation = () => {
    if (confirmDeleteAction(focused()) === "confirm") props.onDelete();
    else setConfirming(false);
  };
  useKeyboard((key) => {
    if (key.name === "escape") {
      key.preventDefault();
      if (confirming()) setConfirming(false);
      else props.onBack();
      return;
    }
    if (key.name === "left" || key.name === "up") {
      key.preventDefault();
      setFocused(Math.max(0, focused() - 1));
      return;
    }
    if (key.name === "right" || key.name === "down") {
      key.preventDefault();
      setFocused(Math.min((confirming() ? 2 : actionCount()) - 1, focused() + 1));
      return;
    }
    if (key.name === "return" || key.name === "linefeed") {
      key.preventDefault();
      if (confirming()) selectConfirmation();
      else selectAction(focused());
    }
  });
  const renderActions = () => confirming()
    ? (
      <box border borderColor={props.theme.error} backgroundColor={props.theme.backgroundPanel} padding={1} flexDirection="column" gap={1}>
        <text fg={props.theme.error}>¿Eliminar agente personalizado?</text>
        <text fg={props.theme.text}>Se quitará el registro privado; no se borrarán archivos globales.</text>
        <box flexDirection="row" gap={1}>
          <DetailActionButton label="No" focused={focused() === 0} theme={props.theme} onSelect={() => setConfirming(false)} />
          <DetailActionButton label="Sí" focused={focused() === 1} theme={props.theme} onSelect={props.onDelete} />
        </box>
      </box>
    )
    : (
      <box flexDirection="row" gap={1}>
        {view.actions.map((action, index) => <DetailActionButton label={action} focused={focused() === index} theme={props.theme} onSelect={() => selectAction(index)} />)}
      </box>
    );
  return (
    <box border title="INFO DEL AGENTE" borderColor={props.theme.border} {...RING_STYLE(props.theme)} backgroundColor={props.theme.background} flexDirection="column" padding={1} gap={1}>
      <text fg={props.theme.primary}>{view.name}</text>
      <text fg={props.theme.text}>{view.description}</text>
      <text fg={props.theme.textMuted}>Estado de materialización: {view.materialization}</text>
      <text fg={props.theme.textMuted}>Habilidades</text>
      <box flexDirection="row" gap={1}>
        {view.skills.length ? view.skills.map((skill) => <DetailChip label={skill} theme={props.theme} />) : <text fg={props.theme.textMuted}>Ninguna</text>}
      </box>
      <text fg={props.theme.textMuted}>Operaciones e instrucciones</text>
      {view.operations.map((operation) => <text fg={props.theme.text}>{operation}</text>)}
      {renderActions()}
      <text fg={props.theme.textMuted}>←→ navegar · Enter seleccionar · Esc volver</text>
    </box>
  );
}
