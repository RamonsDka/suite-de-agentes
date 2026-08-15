import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";

export interface SuiteShellProps {
  theme: TuiTheme;
  title: string;
  children?: JSX.Element;
  keybar?: string;
}

export function SuiteShell(props: SuiteShellProps): JSX.Element {
  const colors = () => props.theme.current;
  return (
    <box flexDirection="column" border borderColor={colors().border} backgroundColor={colors().background} padding={1}>
      <box justifyContent="center" borderColor={colors().border} backgroundColor={colors().backgroundPanel}>
        <text fg={colors().text}>{props.title}</text>
      </box>
      <box flexGrow={1} flexDirection="column" borderColor={colors().border} backgroundColor={colors().backgroundPanel} padding={1}>
        {props.children}
      </box>
      <box justifyContent="center" borderColor={colors().border} backgroundColor={colors().backgroundPanel}>
        <text fg={colors().textMuted}>{props.keybar ?? "↑↓ navega · Enter selecciona · Esc volver"}</text>
      </box>
    </box>
  );
}
