import type { AgentCatalogRow } from "../core/types.ts";
import { PLUGIN_VERSION } from "../version.ts";
import type { AppScreen } from "./agent-suite-nav.ts";

export const MAX_VISIBLE_ROWS = 6;

export function pageRows<T>(rows: readonly T[], page: number, pageSize = MAX_VISIBLE_ROWS): T[] {
  const size = Math.max(1, Math.floor(pageSize));
  const start = Math.max(0, Math.floor(page)) * size;
  return rows.slice(start, start + size);
}

export function pageCount(rowCount: number, pageSize = MAX_VISIBLE_ROWS): number {
  return Math.max(1, Math.ceil(Math.max(0, rowCount) / Math.max(1, pageSize)));
}

export function screenTitle(screen: Pick<AppScreen, "kind">): string {
  switch (screen.kind) {
    case "landing": return `SUITE DE AGENTES — v${PLUGIN_VERSION}`;
    case "catalog": return "CATALOGO DE AGENTES";
    case "info": return "INFO DEL AGENTE";
    case "modify": return "MODIFICAR AGENTE";
    case "model": return "SELECCIONAR EL MODELO DE IA";
    case "effort": return "SELECCIONAR NIVEL DE ESFUERZO";
    case "delete": return "ADVERTENCIA";
    case "create": return `CREAR AGENTE — v${PLUGIN_VERSION}`;
  }
}

export function modifyOptions(row: Pick<AgentCatalogRow, "membership">): readonly string[] {
  return row.membership === "custom"
    ? ["Modelo de IA", "Nivel de esfuerzo", "Skills", "Operaciones", "Volver"]
    : ["Modelo de IA", "Nivel de esfuerzo", "Volver"];
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

export function focusMarker(index: number, focused: number): "►" | " " {
  return index === focused ? "►" : " ";
}
