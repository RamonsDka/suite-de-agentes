import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";

export interface SuiteShellProps {
  theme: TuiTheme;
  title: string;
  children?: JSX.Element;
  keybar?: string;
}

export const SUITE_SHELL_LAYOUT = {
  width: "100%" as const,
  maxWidth: "100%" as const,
  maxHeight: "100%" as const,
  minWidth: 0,
  flexShrink: 1,
  overflow: "hidden" as const,
};

export function SuiteShell(props: SuiteShellProps): JSX.Element {
  const colors = () => props.theme.current;
  return (
    <box {...SUITE_SHELL_LAYOUT} flexDirection="column" border borderColor={colors().border} backgroundColor={colors().background} padding={0}>
      <box maxWidth="100%" overflow="hidden" justifyContent="center" borderColor={colors().border} backgroundColor={colors().backgroundPanel}>
        <text fg={colors().text}>{props.title}</text>
      </box>
      <box minWidth={0} maxWidth="100%" overflow="hidden" flexDirection="column" borderColor={colors().border} backgroundColor={colors().backgroundPanel} padding={1}>
        {props.children}
      </box>
      <box maxWidth="100%" overflow="hidden" justifyContent="center" borderColor={colors().border} backgroundColor={colors().backgroundPanel}>
        <text fg={colors().textMuted}>{props.keybar ?? "↑↓ navega · Enter selecciona · Esc volver"}</text>
      </box>
    </box>
  );
}
