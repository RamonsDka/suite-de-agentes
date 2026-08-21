import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { CreateDraft } from "../agent-suite-nav.ts";
import type { ModelRecommendation, PendingSkill } from "../../core/types.ts";
import { FieldRow, SectionPanel, SelectableRow } from "../visual-primitives.tsx";

export const AI_PREVIEW_FIELDS = ["id", "description", "operations", "skills", "model", "effort"] as const;
export const AI_PREVIEW_ACTIONS = ["Approve", "Request changes", "Discard"] as const;
export type AiPreviewAction = (typeof AI_PREVIEW_ACTIONS)[number];
export type AiPreviewField = (typeof AI_PREVIEW_FIELDS)[number];

export function aiPreviewActionAtFocus(focus: number): AiPreviewAction | undefined {
  return AI_PREVIEW_ACTIONS[focus];
}

const FIELD_LABELS: Record<AiPreviewField, string> = {
  id: "Identificador",
  description: "Descripción",
  operations: "Operaciones",
  skills: "Skills",
  model: "Modelo",
  effort: "Esfuerzo",
};

export function applyPreviewFieldEdit(draft: CreateDraft, field: AiPreviewField, value: string): CreateDraft {
  if (!AI_PREVIEW_FIELDS.includes(field)) return draft;
  return { ...draft, [field]: field === "skills" ? value.split(",").map((skill) => skill.trim()).filter(Boolean) : value };
}

export function modelRecommendationRows(recommendation?: ModelRecommendation): readonly (readonly [string, string])[] {
  if (!recommendation) return [];
  return [["Modelo recomendado", recommendation.model], ["Esfuerzo recomendado", recommendation.effort], ["Rationale", recommendation.rationale]];
}

export function pendingSkillRows(pendingSkills: readonly PendingSkill[] = []): readonly (readonly [string, string])[] {
  return pendingSkills.map((skill) => [skill.id, skill.rationale] as const);
}

export function authoringDraftPreview(draft: CreateDraft): readonly (readonly [string, string])[] {
  return [["Identificador", draft.id], ["Descripción", draft.description], ["Operaciones", draft.operations], ["Skills", draft.skills.join(", ")], ["Modelo", draft.model], ["Esfuerzo", draft.effort]];
}

export function editorSaveStatus(pending: boolean): { label: "Cambios guardados" | "Edición pendiente"; status: "success" | "warning" } {
  return pending ? { label: "Edición pendiente", status: "warning" } : { label: "Cambios guardados", status: "success" };
}

export function AiPreview(props: { theme: TuiTheme; draft: CreateDraft; focus: number; recommendation?: ModelRecommendation; pendingSkills?: readonly PendingSkill[]; onEdit?: (field: AiPreviewField, value: string) => void; onAction: (action: AiPreviewAction) => void }): JSX.Element {
  return <box flexDirection="column" gap={1}><SectionPanel theme={props.theme} title="Vista previa de IA">
    {authoringDraftPreview(props.draft).map(([label, value], index) => {
      const field = AI_PREVIEW_FIELDS[index]!;
      return <box flexDirection="column" gap={1}>
        <FieldRow theme={props.theme} label={FIELD_LABELS[field]} value={value || "ninguno"} />
        {props.onEdit ? <input value={value} placeholder={`Editar ${FIELD_LABELS[field]}`} onInput={(next) => props.onEdit?.(field, typeof next === "string" ? next : value)} onSubmit={(next) => props.onEdit?.(field, typeof next === "string" ? next : value)} /> : null}
      </box>;
    })}
    {modelRecommendationRows(props.recommendation).map(([label, value]) => <FieldRow theme={props.theme} label={label} value={value} wrap />)}
    {pendingSkillRows(props.pendingSkills).map(([id, rationale]) => <FieldRow theme={props.theme} label={`Pending skill · ${id}`} value={rationale} wrap />)}
    {AI_PREVIEW_ACTIONS.map((action, index) => <SelectableRow theme={props.theme} selected={props.focus === index} onActivate={() => props.onAction(action)}>{action}</SelectableRow>)}
  </SectionPanel></box>;
}
