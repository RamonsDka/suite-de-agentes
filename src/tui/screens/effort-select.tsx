import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { AgentCatalogRow } from "../../core/types.ts";
import { normalizeEffortOptions } from "../../core/effort.ts";
import { focusMarker } from "../agent-suite-vm.ts";

export interface EffortSelectProps {
  theme: TuiTheme;
  row: AgentCatalogRow;
  variants: readonly string[];
  focus: number;
  onSelect: (effort: string) => void;
}

export function effortSelectionOptions(variants: readonly string[]): string[] {
  return normalizeEffortOptions(variants);
}

export function EffortSelect(props: EffortSelectProps): JSX.Element {
  const colors = () => props.theme.current;
  const options = () => effortSelectionOptions(props.variants);
  return (
    <box flexDirection="column" gap={1}>
      <text fg={colors().textMuted}>Actual: {props.row.variant ?? "default"}</text>
      {options().map((option, index) => <box backgroundColor={props.focus === index ? colors().backgroundMenu : colors().backgroundPanel} onMouseDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        props.onSelect(option);
      }}><text fg={props.focus === index ? colors().selectedListItemText : colors().text}>{focusMarker(index, props.focus)} {option}</text></box>)}
    </box>
  );
}
