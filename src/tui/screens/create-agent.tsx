import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { CreateDraft } from "../agent-suite-nav.ts";
import { Divider, FieldRow, SectionPanel, StatusBadge } from "../visual-primitives.tsx";
import { editorSaveStatus } from "./ai-preview.tsx";

export const CREATE_FIELDS: readonly (keyof CreateDraft)[] = ["id", "description", "skills", "operations", "model", "effort"];

export function createDraftFields(): readonly (keyof CreateDraft)[] {
  return CREATE_FIELDS;
}

export function createDraftWithStepValue(draft: CreateDraft, step: 0 | 1 | 2 | 3 | 4 | 5, value: string): CreateDraft {
  const field = CREATE_FIELDS[step];
  return { ...draft, [field]: field === "skills" ? value.split(",").map((skill) => skill.trim()).filter(Boolean) : value };
}

export function createSubmissionAction(step: 0 | 1 | 2 | 3 | 4 | 5, _offerAuthoring = false): "next" | "submit" {
  return step === 5 ? "submit" : "next";
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
  step?: 0 | 1 | 2 | 3 | 4 | 5;
  focus: number;
  error?: string;
  onInput: (field: keyof CreateDraft, value: string | string[]) => void;
  onNext?: (draft: CreateDraft) => void;
  onPrevious?: () => void;
  onSubmit: (draft: CreateDraft) => void;
}

const LABELS: Record<keyof CreateDraft, string> = {
  id: "Identificador",
  description: "Descripción",
  skills: "Skills",
  operations: "Operaciones",
  model: "Modelo",
  effort: "Esfuerzo",
};

export interface CreateStepPresentation {
  heading: string;
  label: string;
  value: string;
}

export function createStepPresentation(draft: CreateDraft, step: 0 | 1 | 2 | 3 | 4 | 5): CreateStepPresentation {
  const field = CREATE_FIELDS[step];
  const label = LABELS[field];
  const value = field === "skills" ? draft.skills.join(", ") : draft[field];
  return {
    heading: `Paso ${step + 1}/6 · ${label}${["id", "description", "model", "effort"].includes(field) ? " · obligatorio" : ""}`,
    label,
    value,
  };
}

export function CreateAgent(props: CreateAgentProps): JSX.Element {
  return (
    <box flexDirection="column" gap={1}>
      <SectionPanel theme={props.theme} title="Revisión manual del agente">
        <text fg={props.theme.current.textMuted}>Edita los campos seguros antes de guardar. La configuración de permisos permanece bajo control del producto.</text>
        {CREATE_FIELDS.map((field, index) => {
          const value = field === "skills" ? props.draft.skills.join(", ") : props.draft[field];
          return <box flexDirection="column" gap={1}>
            <FieldRow theme={props.theme} label={LABELS[field]} value={value || "ninguno"} />
            <input focused={props.focus === index} value={value} placeholder={LABELS[field]} onInput={(next) => props.onInput(field, field === "skills" ? (typeof next === "string" ? next.split(",").map((skill) => skill.trim()).filter(Boolean) : []) : typeof next === "string" ? next : value)} onSubmit={(next) => {
              const submitted = typeof next === "string" ? next : value;
              const submittedDraft = createDraftWithStepValue(props.draft, index as 0 | 1 | 2 | 3 | 4 | 5, submitted);
              props.onInput(field, submittedDraft[field]);
              props.onSubmit(submittedDraft);
            }} />
          </box>;
        })}
      </SectionPanel>
      <Divider theme={props.theme} />
      <StatusBadge theme={props.theme} status={editorSaveStatus(true).status}>{editorSaveStatus(true).label}</StatusBadge>
      {props.error ? <StatusBadge theme={props.theme} status="error">{props.error}</StatusBadge> : null}
    </box>
  );
}
