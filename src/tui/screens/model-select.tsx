import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { AgentCatalogRow } from "../../core/types.ts";
import { currentValueCue, Divider, FieldRow, SectionPanel, SelectableRow } from "../visual-primitives.tsx";

export interface ModelSelectProps {
  theme: TuiTheme;
  row: AgentCatalogRow;
  models: readonly string[];
  modelOptions?: readonly { title: string; value: string }[];
  currentValue?: string;
  focus: number;
  error?: string;
  onSelect: (model: string) => void;
}

export const MODEL_EMPTY_MESSAGE = "No hay modelos disponibles.";

export function modelSelectionOptions(models: readonly string[]): Array<{ title: string; value: string }> {
  return models.map((model) => ({ title: model, value: model }));
}

export interface ModelSelectionRow {
  title: string;
  value: string;
  selected: boolean;
  current?: boolean;
}

export function modelSelectionRows(options: readonly { title: string; value: string }[], focus: number, currentValue?: string): ModelSelectionRow[] {
  const currentIndex = currentValue === undefined ? -1 : options.findIndex((option) => option.value === currentValue);
  return options.map((option, index) => ({
    ...option,
    selected: focus === index,
    ...(currentValue === undefined ? {} : { current: index === currentIndex }),
  }));
}

export function modelSelectionCue(title: string, current: boolean): string {
  return current ? currentValueCue(title) : title;
}

export function ModelSelect(props: ModelSelectProps): JSX.Element {
  const colors = () => props.theme.current;
  const options = () => props.modelOptions ?? modelSelectionOptions(props.models);
  return (
    <box flexDirection="column" gap={1}>
      <SectionPanel theme={props.theme} title="Modelo">
      <FieldRow theme={props.theme} label="Actual" value={props.row.model ?? "modelo pendiente"} />
      <Divider theme={props.theme} />
      {modelSelectionRows(options(), props.focus, props.currentValue ?? props.row.model).map((option) => <SelectableRow theme={props.theme} selected={option.selected} status={option.current ? "info" : undefined} onActivate={() => props.onSelect(option.value)}>{modelSelectionCue(option.title, Boolean(option.current))}</SelectableRow>)}
      {options().length === 0 ? <text fg={colors().textMuted}>{MODEL_EMPTY_MESSAGE}</text> : null}
      {props.error ? <text fg={colors().error}>{props.error}</text> : null}
      </SectionPanel>
    </box>
  );
}
