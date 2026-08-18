import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";

export interface SuiteShellProps {
  theme: TuiTheme;
  title: string;
  children?: JSX.Element;
  keybar?: string;
}

export const SUITE_SHELL_LAYOUT = {
  alignSelf: "center" as const,
  margin: "auto" as const,
  width: "100%" as const,
  height: "auto" as const,
  maxWidth: "100%" as const,
  maxHeight: "100%" as const,
  minWidth: 0,
  minHeight: 0,
  flexShrink: 1,
  overflow: "hidden" as const,
};

export const SUITE_SHELL_HEADER_LAYOUT = { flexShrink: 0, maxWidth: "100%" as const, overflow: "hidden" as const };
export const SUITE_SHELL_BODY_LAYOUT = { flexGrow: 1, flexShrink: 1, minWidth: 0, minHeight: 0, maxWidth: "100%" as const, overflow: "hidden" as const };
export const SUITE_SHELL_KEYBAR_LAYOUT = { flexShrink: 0, maxWidth: "100%" as const, overflow: "hidden" as const };

export function SuiteShell(props: SuiteShellProps): JSX.Element {
  const colors = () => props.theme.current;
  return (
    <box {...SUITE_SHELL_LAYOUT} flexDirection="column" border borderColor={colors().border} backgroundColor={colors().background} padding={0}>
      <box {...SUITE_SHELL_HEADER_LAYOUT} justifyContent="center" borderColor={colors().border} backgroundColor={colors().backgroundPanel}>
        <text fg={colors().text}>{props.title}</text>
      </box>
      <box {...SUITE_SHELL_BODY_LAYOUT} flexDirection="column" borderColor={colors().border} backgroundColor={colors().backgroundPanel} padding={1}>
        {props.children}
      </box>
      <box {...SUITE_SHELL_KEYBAR_LAYOUT} justifyContent="center" borderColor={colors().border} backgroundColor={colors().backgroundPanel}>
        <text fg={colors().textMuted}>{props.keybar ?? "↑↓ navega · Enter selecciona · Esc volver"}</text>
      </box>
    </box>
  );
}
