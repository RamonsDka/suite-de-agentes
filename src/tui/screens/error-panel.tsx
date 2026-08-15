import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";

export interface ErrorPanelProps {
  theme: TuiTheme;
  message: string;
  onRetry: () => void;
  onClose: () => void;
}

export function ErrorPanel(props: ErrorPanelProps): JSX.Element {
  const colors = () => props.theme.current;
  return (
    <box flexDirection="column" gap={1}>
      <text fg={colors().error}>No se pudo renderizar la Suite de Agentes</text>
      <text fg={colors().text}>{props.message}</text>
      <text fg={colors().textMuted}>Enter para reintentar · Esc para cerrar</text>
    </box>
  );
}
