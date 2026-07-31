import type { JSX } from "@opentui/solid";
import { createSignal } from "solid-js";
import { useKeyboard, useTerminalDimensions } from "@opentui/solid";
import type { TuiThemeCurrent } from "@opencode-ai/plugin/tui";
import type { AgentCatalogRow } from "../../core/types.ts";
import { catalogColumns, paginate, RING_STYLE } from "../layout.ts";
import { PLUGIN_VERSION } from "../../version.ts";

export const CATALOG_EMPTY_STATE = "No hay agentes en la Suite de Agentes. Usa Crear agente.";
const PAGE_VERTICAL_PADDING = 8;
const CELL_HEIGHT = 4;

export interface CatalogPage<T> {
  rows: T[];
  columns: 1 | 2 | 3;
  hasMore: boolean;
  moreLabel?: string;
}

export interface CatalogTheme {
  border: unknown;
  borderActive: unknown;
  text: unknown;
  selectedListItemText: unknown;
}

export function catalogCellColors<T extends CatalogTheme>(theme: T, focused: boolean): {
  borderColor: T["border"] | T["borderActive"];
  textColor: T["text"] | T["selectedListItemText"];
} {
  return {
    borderColor: focused ? theme.borderActive : theme.border,
    textColor: focused ? theme.selectedListItemText : theme.text,
  };
}

export function pageSizeForCatalog(columns: 1 | 2 | 3, height: number): number {
  return columns * Math.max(2, Math.floor((height - PAGE_VERTICAL_PADDING) / CELL_HEIGHT));
}

export function advanceCatalogPage(page: number, hasMore: boolean): number {
  return hasMore ? page + 1 : page;
}

export function buildCatalogPage<T>(items: readonly T[], width: number, height: number, page: number): CatalogPage<T> {
  const columns = catalogColumns(width);
  const result = paginate(items, page, pageSizeForCatalog(columns, height));
  return {
    rows: result.slice,
    columns,
    hasMore: result.hasMore,
    ...(result.hasMore ? { moreLabel: "Más…" } : {}),
  };
}

export function moveCatalogFocus(index: number, direction: "left" | "right" | "up" | "down", columns: 1 | 2 | 3, itemCount: number): number {
  if (itemCount <= 0) return 0;
  const row = Math.floor(index / columns);
  const column = index % columns;
  let next = index;
  if (direction === "left") next = row * columns + Math.max(0, column - 1);
  if (direction === "right") next = row * columns + Math.min(columns - 1, column + 1);
  if (direction === "up") next = Math.max(0, index - columns);
  if (direction === "down") next = Math.min(itemCount - 1, index + columns);
  return Math.min(itemCount - 1, next);
}

export function activateCatalogFocus(items: readonly AgentCatalogRow[], index: number): AgentCatalogRow | undefined {
  return index >= 0 && index < items.length ? items[index] : undefined;
}

export interface CatalogProps {
  rows: readonly AgentCatalogRow[];
  theme: TuiThemeCurrent;
  onSelect: (row: AgentCatalogRow) => void;
  onPage: (page: number) => void;
  onBack: () => void;
}

interface CatalogCellProps {
  row?: AgentCatalogRow;
  label?: string;
  focused: boolean;
  theme: TuiThemeCurrent;
  onSelect: () => void;
}

function catalogState(row: AgentCatalogRow): string {
  if (row.enabled) return "Disponible";
  return row.membership === "custom" ? "Creado · no materializado" : "No materializado";
}

function CatalogCell(props: CatalogCellProps): JSX.Element {
  const colors = () => catalogCellColors(props.theme, props.focused);
  return (
    <box
      border
      focusable
      focused={props.focused}
      {...RING_STYLE(props.theme)}
      borderColor={colors().borderColor}
      backgroundColor={props.theme.backgroundPanel}
      paddingLeft={1}
      paddingRight={1}
      height={4}
      flexGrow={1}
      onMouseDown={props.onSelect}
    >
      <text fg={colors().textColor}>{props.label ?? props.row?.id ?? ""}</text>
      {props.row ? <text fg={props.theme.textMuted}>{catalogState(props.row)}</text> : null}
    </box>
  );
}

export function Catalog(props: CatalogProps): JSX.Element {
  const dimensions = useTerminalDimensions();
  const [page, setPage] = createSignal(0);
  const [focused, setFocused] = createSignal(0);
  const currentPage = () => buildCatalogPage(props.rows, dimensions().width, dimensions().height, page());
  const focusCount = () => currentPage().rows.length + (currentPage().hasMore ? 1 : 0);
  const selectFocused = () => {
    const current = currentPage();
    const row = activateCatalogFocus(current.rows, focused());
    if (row) props.onSelect(row);
    else if (current.hasMore) {
      props.onPage(advanceCatalogPage(page(), current.hasMore));
      setPage(page() + 1);
      setFocused(0);
    }
  };

  useKeyboard((key) => {
    const current = currentPage();
    if (key.name === "escape") {
      key.preventDefault();
      props.onBack();
      return;
    }
    if (key.name === "left" || key.name === "right" || key.name === "up" || key.name === "down") {
      key.preventDefault();
      setFocused(moveCatalogFocus(focused(), key.name, current.columns, focusCount()));
      return;
    }
    if (key.name === "return" || key.name === "linefeed") {
      key.preventDefault();
      selectFocused();
      return;
    }
    if (key.name === "pagedown" && current.hasMore) {
      key.preventDefault();
      setPage(page() + 1);
      setFocused(0);
    }
  });

  const renderRows = () => {
    const current = currentPage();
    if (!current.rows.length) return <text fg={props.theme.textMuted}>{CATALOG_EMPTY_STATE}</text>;
    const cells = current.rows.map((row, index) => (
      <CatalogCell
        row={row}
        focused={focused() === index}
        theme={props.theme}
        onSelect={() => props.onSelect(row)}
      />
    ));
    if (current.hasMore) {
      cells.push(
        <CatalogCell
          label="Más…"
          focused={focused() === current.rows.length}
          theme={props.theme}
          onSelect={() => {
            props.onPage(advanceCatalogPage(page(), current.hasMore));
            setPage(page() + 1);
            setFocused(0);
          }}
        />
      );
    }
    const rows: JSX.Element[] = [];
    for (let index = 0; index < cells.length; index += current.columns) {
      rows.push(<box flexDirection="row" gap={1}>{cells.slice(index, index + current.columns)}</box>);
    }
    return rows;
  };

  return (
    <box
      border
      title={`Catálogo · v${PLUGIN_VERSION}`}
      borderColor={props.theme.border}
      {...RING_STYLE(props.theme)}
      backgroundColor={props.theme.background}
      flexDirection="column"
      padding={1}
      gap={1}
    >
      {renderRows()}
      <text fg={props.theme.textMuted}>←→↑↓ navegar · Enter seleccionar · Esc volver</text>
    </box>
  );
}
