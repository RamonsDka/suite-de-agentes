import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
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

export function Landing(props: LandingProps): JSX.Element {
  const item = (row: LandingRow) => (
    <SelectableRow theme={props.theme} selected={row.selected}>
      {row.label}
    </SelectableRow>
  );
  return (
    <box flexDirection="column" gap={1}>
      {landingRows(props.focus).map(item)}
    </box>
  );
}
