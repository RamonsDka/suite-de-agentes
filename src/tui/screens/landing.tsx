import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import { focusMarker } from "../agent-suite-vm.ts";

export interface LandingProps {
  theme: TuiTheme;
  focus: 0 | 1;
  onActivate: (index: 0 | 1) => void;
}

export function Landing(props: LandingProps): JSX.Element {
  const colors = () => props.theme.current;
  const item = (index: 0 | 1, label: string) => (
    <text fg={props.focus === index ? colors().selectedListItemText : colors().text}>
      {focusMarker(index, props.focus)} {label}
    </text>
  );
  return (
    <box flexDirection="column" gap={1}>
      {item(0, "CATALOGO")}
      {item(1, "CREAR AGENTE")}
    </box>
  );
}
