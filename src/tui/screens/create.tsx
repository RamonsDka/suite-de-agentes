import type { JSX } from "@opentui/solid";
import { createSignal } from "solid-js";
import { useKeyboard } from "@opentui/solid";
import type { TuiThemeCurrent } from "@opencode-ai/plugin/tui";
import type { CustomAgent, SuiteConfig } from "../../core/types.ts";
import { validateAgentId, validateModelId } from "../../core/config.ts";
import { RING_STYLE } from "../layout.ts";
import { reduceScreen, type CreateStep, type ScreenState } from "./nav.ts";

export type { CreateStep } from "./nav.ts";
export type CreateDraft = Partial<CustomAgent>;
export type CreateField = Exclude<CreateStep, "confirm">;

export interface CreateValidation {
  valid: boolean;
  message?: string;
}

export interface CreateProps {
  theme: TuiThemeCurrent;
  models: readonly string[];
  skills: readonly string[];
  onSave: (agent: CustomAgent) => void;
  onCancel: () => void;
}

export function createDraftAtStep(draft: CreateDraft, step: CreateStep): CreateDraft {
  return { ...draft, ...(step === "skills" || step === "confirm" ? { skills: [...(draft.skills ?? [])] } : {}) };
}

export function createStepLabel(step: CreateField): string {
  return { id: "ID del agente", description: "Descripción", model: "Modelo", prompt: "Instrucciones", skills: "Habilidades" }[step];
}

export function updateCreateDraft(draft: CreateDraft, field: CreateField, value: string | readonly string[]): CreateDraft {
  return { ...draft, [field]: Array.isArray(value) ? [...value] : value };
}

export function validateCreateDraft(draft: CreateDraft): CreateValidation {
  if (!draft.id?.trim()) return { valid: false, message: "ID requerido" };
  try { validateAgentId(draft.id.trim()); } catch { return { valid: false, message: "ID no válido" }; }
  if (!draft.description?.trim()) return { valid: false, message: "Descripción requerida" };
  if (!draft.model?.trim()) return { valid: false, message: "Modelo requerido" };
  try { validateModelId(draft.model.trim()); } catch { return { valid: false, message: "Modelo no válido" }; }
  if (!draft.prompt?.trim()) return { valid: false, message: "Instrucciones requeridas" };
  if (!Array.isArray(draft.skills) || draft.skills.some((skill) => typeof skill !== "string")) return { valid: false, message: "Habilidades no válidas" };
  return { valid: true };
}

export function createAgentFromDraft(draft: CreateDraft): CustomAgent {
  const validation = validateCreateDraft(draft);
  if (!validation.valid) throw new Error(validation.message ?? "Borrador no válido");
  return {
    id: draft.id!.trim(),
    description: draft.description!.trim(),
    model: draft.model!.trim(),
    prompt: draft.prompt!.trim(),
    permissions: { read: "allow", edit: "ask" },
    skills: [...(draft.skills ?? [])],
  };
}

export function addCustomAgentToConfig(config: SuiteConfig, agent: CustomAgent): SuiteConfig {
  const next = structuredClone(config);
  next.customAgents[agent.id] = agent;
  return next;
}

export function createCancelTarget(): { screen: "landing" } {
  return { screen: "landing" };
}

export function reduceCreateState(state: ScreenState, event: "cancel" | "back"): ScreenState {
  return reduceScreen(state, { type: event });
}

function CreateChoice(props: { label: string; focused: boolean; theme: TuiThemeCurrent; onSelect: () => void }): JSX.Element {
  return <box border focusable focused={props.focused} {...RING_STYLE(props.theme)} borderColor={props.focused ? props.theme.borderActive : props.theme.border} backgroundColor={props.theme.backgroundPanel} paddingLeft={1} paddingRight={1} onMouseDown={props.onSelect}><text fg={props.focused ? props.theme.selectedListItemText : props.theme.text}>{props.label}</text></box>;
}

export function Create(props: CreateProps): JSX.Element {
  const [step, setStep] = createSignal<CreateStep>("id");
  const [focused, setFocused] = createSignal(0);
  const [draft, setDraft] = createSignal<CreateDraft>({ skills: [] });
  const choices = () => step() === "model" ? [...props.models] : step() === "skills" ? ["Listo", ...props.skills.filter((skill) => !(draft().skills ?? []).includes(skill))] : step() === "confirm" ? ["No", "Sí"] : [];
  const fieldLabels: Record<CreateField, string> = { id: "ID del agente", description: "Descripción", model: "Modelo", prompt: "Instrucciones", skills: "Habilidades" };
  const nextField: Record<Exclude<CreateField, "skills">, CreateStep> = { id: "description", description: "model", model: "prompt", prompt: "skills" };
  const advance = (value?: string) => {
    const current = step();
    if (current === "model" && value) setDraft({ ...draft(), model: value });
    if (current === "skills" && value && value !== "Listo") setDraft({ ...draft(), skills: [...(draft().skills ?? []), value] });
    if (current === "skills" && value === "Listo") setStep("confirm");
    else if (current === "model") setStep("prompt");
    else if (current === "confirm" && value === "Sí") props.onSave(createAgentFromDraft(draft()));
    else if (current === "confirm" && value === "No") props.onCancel();
  };
  const submitField = (submitted?: string) => {
    const current = step();
    if (current === "model" || current === "skills" || current === "confirm") return select();
    const value = (submitted ?? String(draft()[current] ?? "")).trim();
    const candidate = { ...draft(), [current]: value, skills: draft().skills ?? [] };
    const validation = validateCreateDraft(candidate);
    const isFieldValid = current === "id"
      ? validation.message !== "ID requerido" && validation.message !== "ID no válido"
      : current === "description" ? value.length > 0
      : current === "prompt" ? value.length > 0
      : true;
    if (isFieldValid) { setDraft(candidate); setStep(nextField[current]); setFocused(0); }
  };
  const select = () => advance(choices()[focused()]);
  useKeyboard((key) => {
    if (key.name === "escape") { key.preventDefault(); props.onCancel(); return; }
    if (key.name === "up" || key.name === "left") { key.preventDefault(); setFocused(Math.max(0, focused() - 1)); return; }
    if (key.name === "down" || key.name === "right") { key.preventDefault(); setFocused(Math.min(Math.max(0, choices().length - 1), focused() + 1)); return; }
    if (key.name === "return" || key.name === "linefeed") { key.preventDefault(); submitField(); }
  });
  const renderField = () => {
    const current = step();
    if (current === "model" || current === "skills" || current === "confirm") return null;
    const field = current as CreateField;
    return <box border borderColor={props.theme.border} backgroundColor={props.theme.backgroundPanel} padding={1}><text fg={props.theme.text}>{fieldLabels[field]}</text><input focused placeholder={field === "id" ? "mi-agente" : field === "description" ? "Descripción breve" : "Instrucciones del agente"} value={String(draft()[field] ?? "")} onInput={(value) => setDraft({ ...draft(), [field]: value })} onSubmit={(value) => submitField(typeof value === "string" ? value : undefined)} /><text fg={props.theme.textMuted}>Completa este paso y pulsa Enter</text></box>;
  };
  return <box border title={`CREAR AGENTE · ${step()}`} borderColor={props.theme.border} {...RING_STYLE(props.theme)} backgroundColor={props.theme.background} flexDirection="column" padding={1} gap={1}>
    <text fg={props.theme.primary}>Nuevo agente personalizado</text>
    {renderField()}
    {choices().map((choice, index) => <CreateChoice label={choice} focused={focused() === index} theme={props.theme} onSelect={() => { setFocused(index); advance(choice); }} />)}
    <text fg={props.theme.textMuted}>↑↓ navegar · Enter seleccionar · Esc cancelar sin guardar</text>
  </box>;
}
