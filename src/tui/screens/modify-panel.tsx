import type { JSX } from "@opentui/solid";
import { createEffect, createSignal } from "solid-js";
import type { KeyEvent } from "@opencode-ai/plugin/tui";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { AgentCatalogRow } from "../../core/types.ts";
import { validateSkillId } from "../../core/config.ts";
import { editorFields, modifyOptions, type EditorField, truncate } from "../agent-suite-vm.ts";
import type { ModifyEdit } from "../agent-suite-nav.ts";
import { Divider, FieldRow, SectionPanel, SelectableRow, StatusBadge } from "../visual-primitives.tsx";

export interface ModifyPanelProps {
  theme: TuiTheme;
  row: AgentCatalogRow;
  focus: number;
  edit?: ModifyEdit;
  operations?: string;
  error?: string;
  busy?: boolean;
  onActivate: (option: EditorField | "back") => void;
  onToggleSkill?: (index: number, skill: string) => void;
  onOperationsInput?: (value: string) => void;
  onStartSkillAdd?: () => void;
  onSkillAdd?: (value?: string) => void;
  onCommit?: (value?: string) => void;
  onCancel?: () => void;
  onBack: () => void;
  protectedBase?: boolean;
}

export type ModifyOption = "id" | "description" | "model" | "effort" | "skills" | "operations" | "delete" | "back";

export function modifyOptionKey(label: string): ModifyOption | undefined {
  const labels: Record<string, ModifyOption> = { "Modificar nombre": "id", Nombre: "id", Identificador: "id", Descripción: "description", "Modelo de IA": "model", "Nivel de esfuerzo": "effort", Skills: "skills", Operaciones: "operations", Eliminar: "delete", Volver: "back" };
  return labels[label];
}

export interface ModifyMenuRow {
  label: string;
  option: ModifyOption;
  selected: boolean;
}

export function modifyMenuRows(row: Pick<AgentCatalogRow, "membership">, focus: number): readonly ModifyMenuRow[] {
  return modifyOptions(row).map((label, index) => ({ label, option: modifyOptionKey(label)!, selected: focus === index }));
}

const EDITOR_LABELS: Record<EditorField, string> = {
  id: "Modificar nombre",
  description: "Descripción",
  skills: "Skills",
  operations: "Operaciones",
  model: "Modelo de IA",
  effort: "Nivel de esfuerzo",
  delete: "Eliminar",
};

export interface EditorMenuRow {
  field: EditorField;
  label: string;
  value: string;
  selected: boolean;
}

export function editorMenuRows(row: AgentCatalogRow, operations: string, focus: number, fullBaseEditing = false): readonly EditorMenuRow[] {
  return editorFields({ ...row, fullBaseEditing }).map((field, index) => ({
    field,
    label: EDITOR_LABELS[field],
    value: field === "id" ? row.id
      : field === "description" ? row.description || "sin descripción"
        : field === "skills" ? row.skills.join(", ") || "ninguna"
          : field === "operations" ? operations || "ninguna"
            : field === "model" ? row.model ?? "modelo pendiente"
              : field === "effort" ? row.variant ?? "predeterminado"
                : "",
    selected: focus === index,
  }));
}

export function validateSkillInput(value: string, existing: readonly string[]): string | undefined {
  const skill = value.trim();
  if (!skill) return "El skill es obligatorio.";
  try { validateSkillId(skill); } catch { return "El skill debe usar minúsculas, números y guiones, sin espacios ni separadores."; }
  if (existing.includes(skill)) return "Ese skill ya está agregado.";
  return undefined;
}

export function syncDraftInput(value: string, setLocal: (value: string) => void): void {
  setLocal(value);
}

export function isInputEscape(key: Pick<KeyEvent, "name">): boolean {
  return key.name === "escape";
}

export function ModifyPanel(props: ModifyPanelProps): JSX.Element {
  const edit = () => props.edit ?? { mode: "menu" as const };
  const [textDraft, setTextDraft] = createSignal("");
  const [skillDraft, setSkillDraft] = createSignal("");
  let textSource: string | undefined;
  let skillSource: string | undefined;
  createEffect(() => {
    const current = edit();
    if (current.mode === "text") {
      const source = `${current.field}:${current.value}`;
      if (source !== textSource) {
        textSource = source;
        setTextDraft(current.value);
      }
    } else textSource = undefined;
    if (current.mode === "skills") {
      const source = `${current.adding}:${current.input}`;
      if (source !== skillSource) {
        skillSource = source;
        setSkillDraft(current.input);
      }
    } else skillSource = undefined;
  });
  if (edit().mode === "skills") {
    const skillsEdit = edit() as Extract<ModifyEdit, { mode: "skills" }>;
    return (
    <box flexDirection="column" gap={1}>
      <SectionPanel theme={props.theme} title="Skills">
      {skillsEdit.skills.map((skill, index) => <SelectableRow theme={props.theme} selected={skillsEdit.focus === index} onActivate={() => props.onToggleSkill?.(index, skill)}>− Quitar {skill}</SelectableRow>)}
      <SelectableRow theme={props.theme} selected={skillsEdit.focus === skillsEdit.skills.length} onActivate={() => props.onStartSkillAdd?.()}>+ Agregar skill</SelectableRow>
       {skillsEdit.adding ? <input focused value={skillDraft()} placeholder="Nombre del skill" onKeyDown={(key) => {
         if (!isInputEscape(key)) return;
         key.preventDefault();
         key.stopPropagation();
         props.onCancel?.();
       }} onInput={(value) => syncDraftInput(value, setSkillDraft)} onSubmit={(value) => {
         const submitted = typeof value === "string" ? value : undefined;
         props.onSkillAdd?.(submitted);
       }} /> : null}
      </SectionPanel>
      {props.busy ? <StatusBadge theme={props.theme} status="info">Guardando cambios…</StatusBadge> : null}
      {props.error ? <StatusBadge theme={props.theme} status="error">{props.error}</StatusBadge> : null}
    </box>
  );
  }
  if (edit().mode === "text") {
    const textEdit = edit() as Extract<ModifyEdit, { mode: "text" }>;
    return (
    <box flexDirection="column" gap={1}>
      <SectionPanel theme={props.theme} title={EDITOR_LABELS[textEdit.field]}>
      <FieldRow theme={props.theme} label="Valor actual" value={textEdit.value || "vacío"} />
      <Divider theme={props.theme} />
        <input focused value={textDraft()} placeholder={EDITOR_LABELS[textEdit.field]} onKeyDown={(key) => {
          if (!isInputEscape(key)) return;
          key.preventDefault();
          key.stopPropagation();
          props.onCancel?.();
         }} onInput={(value) => syncDraftInput(value, setTextDraft)} onSubmit={(value) => {
         const submitted = typeof value === "string" ? value : undefined;
         props.onCommit?.(submitted);
       }} />
      </SectionPanel>
      {props.busy ? <StatusBadge theme={props.theme} status="info">Guardando cambios…</StatusBadge> : null}
      {props.error ? <StatusBadge theme={props.theme} status="error">{props.error}</StatusBadge> : null}
    </box>
    );
  }
  return (
    <box flexDirection="column" gap={1}>
      <SectionPanel theme={props.theme} title="Modificar agente">
       {editorMenuRows(props.row, props.operations ?? "", props.focus, props.protectedBase === true).map((row) => <SelectableRow theme={props.theme} selected={row.selected} onActivate={() => props.onActivate(row.field)}>{row.label}{row.value ? `: ${truncate(row.value, 72)}` : ""}</SelectableRow>)}
      </SectionPanel>
      {props.busy ? <StatusBadge theme={props.theme} status="info">Guardando cambios…</StatusBadge> : null}
      {props.error ? <StatusBadge theme={props.theme} status="error">{props.error}</StatusBadge> : null}
    </box>
  );
}
