import type { JSX } from "@opentui/solid";
import { createSignal } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import type { TuiThemeCurrent } from "@opencode-ai/plugin/tui";
import type { AgentCatalogRow } from "../../core/types.ts";
import { normalizeEffortOptions } from "../../core/effort.ts";
import { RING_STYLE } from "../layout.ts";

export interface ModifyProps {
  row: AgentCatalogRow;
  theme: TuiThemeCurrent;
  models: readonly string[];
  variantsForModel: (model: string) => readonly string[];
  onSave: (model: string, variant?: string) => void;
  onCancel: () => void;
}

export function buildModifyEffortOptions(runtimeVariants: readonly string[]): string[] {
  return normalizeEffortOptions(runtimeVariants);
}

export function modifyEscapeTarget(step: "model" | "effort"): "detail" {
  return step === "model" || step === "effort" ? "detail" : "detail";
}

function ModifyChoice(props: { label: string; focused: boolean; theme: TuiThemeCurrent; onSelect: () => void }): JSX.Element {
  return (
    <box border focusable focused={props.focused} {...RING_STYLE(props.theme)} borderColor={props.focused ? props.theme.borderActive : props.theme.border} backgroundColor={props.theme.backgroundPanel} paddingLeft={1} paddingRight={1} onMouseDown={props.onSelect}>
      <text fg={props.focused ? props.theme.selectedListItemText : props.theme.text}>{props.label}</text>
    </box>
  );
}

export function Modify(props: ModifyProps): JSX.Element {
  const [step, setStep] = createSignal<"model" | "effort">("model");
  const [focused, setFocused] = createSignal(0);
  const [selectedModel, setSelectedModel] = createSignal<string | undefined>();
  const choices = () => step() === "model" ? [...props.models] : ["default", ...buildModifyEffortOptions(props.variantsForModel(selectedModel() ?? "")).filter((option) => option !== "default")];
  const select = () => {
    const selected = choices()[focused()];
    if (!selected) return;
    if (step() === "model") {
      setSelectedModel(selected);
      setFocused(0);
      setStep("effort");
    } else {
      props.onSave(selectedModel() ?? props.row.model ?? selected, selected === "default" ? undefined : selected);
    }
  };

  useKeyboard((key) => {
    if (key.name === "escape") {
      key.preventDefault();
      props.onCancel();
      return;
    }
    if (key.name === "left" || key.name === "up") {
      key.preventDefault();
      setFocused(Math.max(0, focused() - 1));
      return;
    }
    if (key.name === "right" || key.name === "down") {
      key.preventDefault();
      setFocused(Math.min(choices().length - 1, focused() + 1));
      return;
    }
    if (key.name === "return" || key.name === "linefeed") {
      key.preventDefault();
      select();
    }
  });

  return (
    <box border title={`${step() === "model" ? "MODELO" : "ESFUERZO"} · ${props.row.id}`} borderColor={props.theme.border} {...RING_STYLE(props.theme)} backgroundColor={props.theme.background} flexDirection="column" padding={1} gap={1}>
      <text fg={props.theme.textMuted}>{step() === "model" ? "Selecciona un modelo" : "Selecciona un esfuerzo compatible"}</text>
      {choices().map((choice, index) => <ModifyChoice label={choice} focused={focused() === index} theme={props.theme} onSelect={() => { setFocused(index); select(); }} />)}
      <text fg={props.theme.textMuted}>↑↓ navegar · Enter seleccionar · Esc volver sin guardar</text>
    </box>
  );
}
