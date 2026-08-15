import type { JSX } from "@opentui/solid";
import type { TuiTheme } from "@opencode-ai/plugin/tui";
import type { MouseEvent } from "@opentui/core";
import type { AgentCatalogRow } from "../../core/types.ts";
import { MAX_VISIBLE_ROWS, pageCount, pageRows, focusMarker, truncate } from "../agent-suite-vm.ts";

export interface CatalogProps {
  theme: TuiTheme;
  rows: readonly AgentCatalogRow[];
  page: number;
  focus: number;
  onActivate: (identity: { agentId: string; index: number }) => void;
  onPage: (delta: -1 | 1) => void;
}

export function catalogFocusBounds(rows: readonly AgentCatalogRow[], page: number): { maxFocus: number; maxPage: number } {
  const maxPage = pageCount(rows.length) - 1;
  return { maxPage, maxFocus: Math.max(0, pageRows(rows, Math.max(0, Math.min(page, maxPage))).length - 1) };
}

export function dispatchCatalogWheel(page: number, direction: "up" | "down", maxPage: number): number {
  const delta = direction === "down" ? 1 : -1;
  return Math.max(0, Math.min(Math.max(0, maxPage), page + delta));
}

export function captureCatalogRow(row: Pick<AgentCatalogRow, "id">, index: number): { agentId: string; index: number } {
  return { agentId: row.id, index };
}

export function catalogMouseActivation(event: MouseEvent, row: Pick<AgentCatalogRow, "id">, index: number, activate: (identity: { agentId: string; index: number }) => void): boolean {
  if (event.button !== 0) return false;
  event.preventDefault();
  event.stopPropagation();
  activate(captureCatalogRow(row, index));
  return true;
}

function status(row: AgentCatalogRow): string {
  return row.enabled ? "Disponible" : row.membership === "custom" ? "Creado · no materializado" : "No materializado";
}

export function Catalog(props: CatalogProps): JSX.Element {
  const colors = () => props.theme.current;
  const visibleRows = () => pageRows(props.rows, props.page);
  const maxPage = () => pageCount(props.rows.length) - 1;
  const activate = (identity: { agentId: string; index: number }) => props.onActivate(identity);
  const handleWheel = (event: MouseEvent) => {
    if (event.type !== "scroll" || !event.scroll) return;
    event.preventDefault();
    event.stopPropagation();
    const nextPage = dispatchCatalogWheel(props.page, event.scroll.direction === "left" || event.scroll.direction === "up" ? "up" : "down", maxPage());
    if (nextPage !== props.page) props.onPage(nextPage > props.page ? 1 : -1);
  };
  return (
    <box flexDirection="column" gap={1} onMouseScroll={handleWheel}>
      <text fg={colors().textMuted}>Página {props.page + 1}/{maxPage() + 1} · {MAX_VISIBLE_ROWS} filas por página</text>
      {visibleRows().length === 0 ? <text fg={colors().textMuted}>No hay agentes disponibles.</text> : visibleRows().map((row, index) => (
        <box backgroundColor={props.focus === index ? colors().backgroundMenu : colors().backgroundPanel} onMouseDown={(event) => catalogMouseActivation(event, row, index, activate)}>
          <text fg={props.focus === index ? colors().selectedListItemText : colors().text}>{focusMarker(index, props.focus)} {row.id} · {status(row)} · {truncate(row.model ?? "modelo pendiente", 28)} · {row.variant ?? "predeterminado"}</text>
        </box>
      ))}
      <text fg={colors().textMuted}>Página ↑/↓ · rueda cambia página · Enter abre Info</text>
    </box>
  );
}
