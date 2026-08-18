import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { CoordinatorConfig } from "../../core/types.ts";
import { Divider, FieldRow, SectionPanel, SelectableRow, StatusBadge } from "../visual-primitives.tsx";

export interface RuntimeCoordinatorModel {
  id: string;
  name: string;
  variants?: Record<string, unknown>;
}

export interface RuntimeCoordinatorProvider {
  id: string;
  name: string;
  models: Record<string, RuntimeCoordinatorModel>;
}

export interface CoordinatorOption {
  title: string;
  value: string;
}

export function coordinatorStatus(config?: CoordinatorConfig): { label: "Configurado" | "No configurado"; status: "success" | "error" } {
  return config ? { label: "Configurado", status: "success" } : { label: "No configurado", status: "error" };
}

export function coordinatorProviderOptions(providers: readonly RuntimeCoordinatorProvider[]): CoordinatorOption[] {
  return providers.map(({ id, name }) => ({ title: name, value: id }));
}

export function coordinatorModelOptions(providers: readonly RuntimeCoordinatorProvider[], providerID: string): CoordinatorOption[] {
  return Object.values(providers.find((provider) => provider.id === providerID)?.models ?? {}).map(({ id, name }) => ({ title: name, value: id }));
}

export function coordinatorEffortOptions(providers: readonly RuntimeCoordinatorProvider[], providerID: string, modelID: string): CoordinatorOption[] {
  const variants = providers.find((provider) => provider.id === providerID)?.models[modelID]?.variants ?? {};
  return [{ title: "Predeterminado", value: "" }, ...Object.keys(variants).map((variant) => ({ title: variant, value: variant }))];
}

export function coordinatorSelectionOptions(stage: Exclude<CoordinatorConfigProps["stage"], "settings">, providers: readonly RuntimeCoordinatorProvider[], providerID?: string, modelID?: string): CoordinatorOption[] {
  if (stage === "provider") return coordinatorProviderOptions(providers);
  if (stage === "model") return providerID ? coordinatorModelOptions(providers, providerID) : [];
  return providerID && modelID ? coordinatorEffortOptions(providers, providerID, modelID) : [];
}

export interface CoordinatorConfigProps {
  theme: TuiTheme;
  stage: "settings" | "provider" | "model" | "effort";
  focus: number;
  coordinator?: CoordinatorConfig;
  providers: readonly RuntimeCoordinatorProvider[];
  provider?: string;
  model?: string;
  onSetup: () => void;
  onProvider: (provider: string) => void;
  onModel: (model: string) => void;
  onEffort: (effort: string) => void;
}

export function CoordinatorConfig(props: CoordinatorConfigProps): JSX.Element {
  const status = () => coordinatorStatus(props.coordinator);
  const options = () => props.stage === "settings" ? [] : coordinatorSelectionOptions(props.stage, props.providers, props.provider, props.model);
  const select = (value: string) => {
    if (props.stage === "provider") props.onProvider(value);
    else if (props.stage === "model") props.onModel(value);
    else if (props.stage === "effort") props.onEffort(value);
  };
  if (props.stage === "settings") return <box flexDirection="column" gap={1}>
    <SectionPanel theme={props.theme} title="Configuración">
      <StatusBadge theme={props.theme} status={status().status}>{status().label}</StatusBadge>
      <FieldRow theme={props.theme} label="Proveedor" value={props.coordinator?.provider ?? "sin configurar"} />
      <FieldRow theme={props.theme} label="Modelo" value={props.coordinator?.model ?? "sin configurar"} />
      <FieldRow theme={props.theme} label="Esfuerzo" value={props.coordinator?.effort ?? "predeterminado"} />
      <SelectableRow theme={props.theme} selected={props.focus === 0} onActivate={props.onSetup}>Configurar coordinador</SelectableRow>
    </SectionPanel>
  </box>;
  return <box flexDirection="column" gap={1}>
    <SectionPanel theme={props.theme} title={props.stage === "provider" ? "Proveedor" : props.stage === "model" ? "Modelo" : "Nivel de esfuerzo"}>
      {options().map((option, index) => <SelectableRow theme={props.theme} selected={props.focus === index} onActivate={() => select(option.value)}>{option.title}</SelectableRow>)}
      {options().length === 0 ? <text fg={props.theme.current.textMuted}>No hay opciones disponibles.</text> : null}
    </SectionPanel>
    <Divider theme={props.theme} />
  </box>;
}
