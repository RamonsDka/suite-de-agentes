import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { MouseEvent } from "@opentui/core";
import { SelectableRow } from "../visual-primitives.tsx";

export interface LandingProps {
  theme: TuiTheme;
  focus: 0 | 1;
  onActivate: (index: 0 | 1) => void;
}

export interface LandingRow {
  label: string;
  selected: boolean;
}

export function landingRows(focus: 0 | 1): readonly LandingRow[] {
  return [
    { label: "CATALOGO", selected: focus === 0 },
    { label: "CREAR AGENTE", selected: focus === 1 },
  ];
}

export function landingMouseActivation(event: MouseEvent, index: 0 | 1, activate: (index: 0 | 1) => void): boolean {
  if (event.button !== 0) return false;
  event.preventDefault();
  event.stopPropagation();
  activate(index);
  return true;
}

export function Landing(props: LandingProps): JSX.Element {
  const item = (row: LandingRow, index: number) => (
    <SelectableRow theme={props.theme} selected={row.selected} onMouseDown={(event) => landingMouseActivation(event, index === 0 ? 0 : 1, props.onActivate)}>
      {row.label}
    </SelectableRow>
  );
  return (
    <box flexDirection="column" gap={1}>
      {landingRows(props.focus).map(item)}
    </box>
  );
}
