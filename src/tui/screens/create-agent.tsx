import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { CreateDraft } from "../agent-suite-nav.ts";

export const CREATE_FIELDS: readonly (keyof CreateDraft)[] = ["id", "description", "skills", "operations", "model", "effort"];

export function createDraftFields(): readonly (keyof CreateDraft)[] {
  return CREATE_FIELDS;
}

export function validateCreateStep(draft: CreateDraft, step: 0 | 1 | 2 | 3 | 4 | 5, existingIds: readonly string[] = []): string | undefined {
  const field = CREATE_FIELDS[step];
  if (field === "id") {
    if (!draft.id.trim()) return "El identificador es obligatorio.";
    if (!draft.id.trim().match(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/)) return "El identificador no es válido.";
    if (existingIds.includes(draft.id.trim())) return "El identificador ya existe.";
  }
  if (field === "description" && !draft.description.trim()) return "La descripción es obligatoria.";
  if (field === "model" && !draft.model.trim()) return "El modelo es obligatorio.";
  if (field === "effort" && !draft.effort.trim()) return "El esfuerzo es obligatorio.";
  return undefined;
}

export function validateCreateDraft(draft: CreateDraft, existingIds: readonly string[] = []): string | undefined {
  for (const step of [0, 1, 4, 5] as const) {
    const error = validateCreateStep(draft, step, existingIds);
    if (error) return error;
  }
  return undefined;
}

export interface CreateAgentProps {
  theme: TuiTheme;
  draft: CreateDraft;
  step: CreateDraft["id"] extends never ? never : 0 | 1 | 2 | 3 | 4 | 5;
  focus: number;
  error?: string;
  onInput: (field: keyof CreateDraft, value: string | string[]) => void;
  onNext: () => void;
  onPrevious: () => void;
  onSubmit: () => void;
}

const LABELS: Record<keyof CreateDraft, string> = {
  id: "Identificador",
  description: "Descripción",
  skills: "Skills",
  operations: "Operaciones",
  model: "Modelo",
  effort: "Esfuerzo",
};

export function CreateAgent(props: CreateAgentProps): JSX.Element {
  const colors = () => props.theme.current;
  const field = () => CREATE_FIELDS[props.step];
  const value = () => field() === "skills" ? props.draft.skills.join(", ") : props.draft[field()] as string;
  const required = () => ["id", "description", "model", "effort"].includes(field());
  const submit = (next: string) => props.onInput(field(), field() === "skills" ? next.split(",").map((skill) => skill.trim()).filter(Boolean) : next);
  return (
    <box flexDirection="column" gap={1}>
      <text fg={colors().textMuted}>Paso {props.step + 1}/6 · {LABELS[field()]}{required() ? " · obligatorio" : ""}</text>
      <input focused value={value()} placeholder={LABELS[field()]} onInput={submit} onSubmit={(next) => { if (typeof next === "string") submit(next); props.step === 5 ? props.onSubmit() : props.onNext(); }} />
      {props.error ? <text fg={colors().error}>{props.error}</text> : null}
      <text fg={colors().textMuted}>Enter continuar · Esc volver</text>
    </box>
  );
}
