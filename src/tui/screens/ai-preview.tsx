import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { CreateDraft } from "../agent-suite-nav.ts";
import { FieldRow, SectionPanel, SelectableRow } from "../visual-primitives.tsx";

export const AI_PREVIEW_ACTIONS = ["Approve", "Request changes", "Discard"] as const;
export type AiPreviewAction = (typeof AI_PREVIEW_ACTIONS)[number];

export function authoringDraftPreview(draft: CreateDraft): readonly (readonly [string, string])[] {
  return [["Identificador", draft.id], ["Descripción", draft.description], ["Operaciones", draft.operations], ["Modelo", draft.model], ["Esfuerzo", draft.effort], ["Skills", draft.skills.join(", ")]];
}

export function editorSaveStatus(pending: boolean): { label: "Cambios guardados" | "Edición pendiente"; status: "success" | "warning" } {
  return pending ? { label: "Edición pendiente", status: "warning" } : { label: "Cambios guardados", status: "success" };
}

export function AiPreview(props: { theme: TuiTheme; draft: CreateDraft; focus: number; onAction: (action: AiPreviewAction) => void }): JSX.Element {
  return <box flexDirection="column" gap={1}><SectionPanel theme={props.theme} title="Vista previa de IA">
    {authoringDraftPreview(props.draft).map(([label, value]) => <FieldRow theme={props.theme} label={label} value={value || "ninguno"} />)}
    {AI_PREVIEW_ACTIONS.map((action, index) => <SelectableRow theme={props.theme} selected={props.focus === index} onActivate={() => props.onAction(action)}>{action}</SelectableRow>)}
  </SectionPanel></box>;
}
