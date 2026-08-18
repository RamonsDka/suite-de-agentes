import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { MouseEvent } from "@opentui/core";
import type { CoordinatorConfig } from "../../core/types.ts";
import { coordinatorStatus } from "./coordinator-config.tsx";
import { SelectableRow } from "../visual-primitives.tsx";

export interface LandingProps {
  theme: TuiTheme;
  focus: 0 | 1 | 2;
  coordinator?: CoordinatorConfig;
  onActivate: (index: 0 | 1 | 2) => void;
}

export interface LandingRow {
  label: string;
  selected: boolean;
  status?: string;
}

export function landingRows(focus: 0 | 1 | 2, coordinator?: CoordinatorConfig): readonly LandingRow[] {
  return [
    { label: "Catálogo", selected: focus === 0 },
    { label: "Crear agente", selected: focus === 1 },
    { label: "⚙ Configuración", selected: focus === 2, status: coordinatorStatus(coordinator).label },
  ];
}

export function landingMouseActivation(event: MouseEvent, index: 0 | 1 | 2, activate: (index: 0 | 1 | 2) => void): boolean {
  if (event.button !== 0) return false;
  event.preventDefault();
  event.stopPropagation();
  activate(index);
  return true;
}

export function Landing(props: LandingProps): JSX.Element {
  const item = (row: LandingRow, index: number) => (
      <SelectableRow theme={props.theme} selected={row.selected} status={row.status === "Configurado" ? "success" : row.status === "No configurado" ? "error" : undefined} onActivate={() => props.onActivate(index as 0 | 1 | 2)}>
      {row.label}{row.status ? ` · ${row.status}` : ""}
    </SelectableRow>
  );
  return (
    <box flexDirection="column" gap={1}>
      {landingRows(props.focus, props.coordinator).map(item)}
    </box>
  );
}
