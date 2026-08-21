import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { InterviewCheckpoint, InterviewTurn } from "../../core/coordinator.ts";
import type { InterviewSession } from "../agent-suite-nav.ts";
import { Divider, FieldRow, SectionPanel, SelectableRow, StatusBadge } from "../visual-primitives.tsx";

export function interviewCheckpointRows(checkpoint: InterviewCheckpoint): readonly (readonly [string, string])[] {
  const draft = checkpoint.draft;
  return [
    ["Agente", draft.id || "pendiente"],
    ["Propósito", draft.description || "pendiente"],
    ["Operaciones", draft.operations ? String(draft.operations.split(/[\n;]/).map((operation) => operation.trim()).filter(Boolean).length) : "0"],
    ["Skills", draft.skills.join(", ") || "ninguna"],
    ["Modelo recomendado", checkpoint.recommendation?.model ?? (draft.model || "pendiente")],
  ];
}

export function interviewActionLabels(turn?: InterviewTurn): readonly string[] {
  return [...(turn?.quickReplies ?? []), "Enviar respuesta", "Revisar propuesta", "Cancelar"];
}

export interface AiInterviewProps {
  theme: TuiTheme;
  session: InterviewSession;
  turn?: InterviewTurn;
  focus: number;
  busy?: boolean;
  error?: string;
  onInput(value: string): void;
  onQuickReply(reply: string): void;
  onSubmit(value: string): void;
  onReview(): void;
  onRetry(): void;
  onCancel(): void;
}

export function AiInterview(props: AiInterviewProps): JSX.Element {
  const replies = () => props.turn?.quickReplies ?? [];
  const inputFocus = () => replies().length;
  const reviewFocus = () => replies().length + 1;
  const cancelFocus = () => replies().length + 2;
  return <box flexDirection="column" gap={1}>
    <SectionPanel theme={props.theme} title="Entrevista de agente">
      <text fg={props.theme.current.text}>{props.turn?.question ?? "Cuéntame qué debe hacer este agente."}</text>
      {replies().map((reply, index) => <SelectableRow theme={props.theme} selected={props.focus === index} onActivate={() => props.onQuickReply(reply)}>{reply}</SelectableRow>)}
      <input focused={props.focus === inputFocus()} value={props.session.input} placeholder="Escribe una respuesta libre" onInput={props.onInput} onSubmit={(value) => props.onSubmit(typeof value === "string" ? value : props.session.input)} />
      <text fg={props.theme.current.textMuted}>Enter envía la respuesta escrita</text>
      <Divider theme={props.theme} />
      <FieldRow theme={props.theme} label="Siguiente" value={props.turn ? "Una pregunta a la vez" : "La propuesta está lista para revisar"} wrap />
      <SelectableRow theme={props.theme} selected={props.focus === reviewFocus()} onActivate={props.onReview}>Revisar propuesta</SelectableRow>
      <SelectableRow theme={props.theme} selected={props.focus === cancelFocus()} onActivate={props.onCancel}>Cancelar</SelectableRow>
    </SectionPanel>
    <SectionPanel theme={props.theme} title="Punto de control">
      {interviewCheckpointRows(props.session.checkpoint).map(([label, value]) => <FieldRow theme={props.theme} label={label} value={value} wrap />)}
      {props.session.transcript.length > 0 ? <text fg={props.theme.current.textMuted}>Conversación en memoria: {props.session.transcript.length} turnos</text> : null}
    </SectionPanel>
    {props.busy ? <StatusBadge theme={props.theme} status="info">Procesando respuesta…</StatusBadge> : null}
    {props.error ? <box flexDirection="column" gap={1}><StatusBadge theme={props.theme} status="error">{props.error}</StatusBadge><SelectableRow theme={props.theme} selected={props.focus === 0} onActivate={props.onRetry}>Reintentar</SelectableRow></box> : null}
  </box>;
}
