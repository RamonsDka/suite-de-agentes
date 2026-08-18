import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { AgentCatalogRow } from "../../core/types.ts";
import { normalizeEffortOptions } from "../../core/effort.ts";
import { Divider, FieldRow, KeyHintBar, SectionPanel, SelectableRow } from "../visual-primitives.tsx";

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

export function effortSelectionRows(variants: readonly string[], focus: number): Array<{ value: string; selected: boolean }> {
  return effortSelectionOptions(variants).map((value, index) => ({ value, selected: focus === index }));
}

export function EffortSelect(props: EffortSelectProps): JSX.Element {
  return (
    <box flexDirection="column" gap={1}>
      <SectionPanel theme={props.theme} title="Nivel de esfuerzo">
      <FieldRow theme={props.theme} label="Actual" value={props.row.variant ?? "default"} />
      <Divider theme={props.theme} />
      {effortSelectionRows(props.variants, props.focus).map((option) => <SelectableRow theme={props.theme} selected={option.selected} onMouseDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        props.onSelect(option.value);
      }}>{option.value}</SelectableRow>)}
      </SectionPanel>
      <KeyHintBar theme={props.theme} hints="↑↓ navega · Enter selecciona · Esc volver" />
    </box>
  );
}
