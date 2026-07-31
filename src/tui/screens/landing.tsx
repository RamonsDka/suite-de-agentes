import type { JSX } from "@opentui/solid";
import { createSignal } from "solid-js";
import { useKeyboard, useTerminalDimensions } from "@opentui/solid";
import type { TuiThemeCurrent } from "@opencode-ai/plugin/tui";
import { PLUGIN_VERSION } from "../../version.ts";

export type LandingAction = "catalog" | "create-agent";
export const LANDING_ACTIONS = ["Catálogo", "Crear agente"] as const;

export interface LandingProps {
  theme: TuiThemeCurrent;
  onSelect: (action: LandingAction) => void;
  onClose: () => void;
}

export function Landing(props: LandingProps): JSX.Element {
  const dimensions = useTerminalDimensions();
  const [focused, setFocused] = createSignal(0);
  const actions: LandingAction[] = ["catalog", "create-agent"];
  const labels = LANDING_ACTIONS;
  const select = () => props.onSelect(actions[focused()] ?? "catalog");

  useKeyboard((key) => {
    if (key.name === "escape") {
      key.preventDefault();
      props.onClose();
    } else if (key.name === "up" || key.name === "left" || key.name === "down" || key.name === "right") {
      setFocused(focused() === 0 ? 1 : 0);
    } else if (key.name === "return" || key.name === "linefeed") {
      select();
    }
  });

  const compact = () => dimensions().height < 20;
  const panel = (index: number) => (
    <box
      border
      focusable
      focused={focused() === index}
      borderColor={props.theme.border}
      focusedBorderColor={props.theme.borderActive}
      backgroundColor={props.theme.backgroundPanel}
      paddingLeft={1}
      paddingRight={1}
      width={compact() ? "100%" : 24}
      height={3}
    >
      <text fg={focused() === index ? props.theme.selectedListItemText : props.theme.text}>{labels[index]}</text>
    </box>
  );

  return (
    <box
      border
      title="Suite de Agentes"
      borderColor={props.theme.border}
      focusedBorderColor={props.theme.borderActive}
      backgroundColor={props.theme.background}
      flexDirection="column"
      padding={1}
      gap={1}
    >
      <text fg={props.theme.primary}>SUITE DE AGENTES</text>
      <text fg={props.theme.textMuted}>v{PLUGIN_VERSION}</text>
      <box flexDirection={compact() ? "column" : "row"} gap={1}>
        {panel(0)}
        {panel(1)}
      </box>
      <text fg={props.theme.textMuted}>↑↓ navegar · Enter · Esc</text>
    </box>
  );
}
