import type { AgentCatalogRow } from "../core/types.ts";
import { PLUGIN_VERSION } from "../version.ts";
import type { AppScreen } from "./agent-suite-nav.ts";

export const MAX_VISIBLE_ROWS = 6;

export function filterCatalogRows<T extends Pick<AgentCatalogRow, "id">>(rows: readonly T[], query: string): T[] {
  const normalized = query.trim().toLocaleLowerCase();
  return normalized ? rows.filter((row) => row.id.toLocaleLowerCase().includes(normalized)) : [...rows];
}

export function pageRows<T>(rows: readonly T[], page: number, pageSize = MAX_VISIBLE_ROWS): T[] {
  const size = Math.max(1, Math.floor(pageSize));
  const start = Math.max(0, Math.floor(page)) * size;
  return rows.slice(start, start + size);
}

export function pageCount(rowCount: number, pageSize = MAX_VISIBLE_ROWS): number {
  return Math.max(1, Math.ceil(Math.max(0, rowCount) / Math.max(1, pageSize)));
}

export function screenTitle(screen: Pick<AppScreen, "kind"> & { disabled?: boolean }): string {
  switch (screen.kind) {
    case "landing": return `SUITE DE AGENTES — v${PLUGIN_VERSION}`;
    case "catalog": return "CATALOGO DE AGENTES";
    case "info": return "INFO DEL AGENTE";
    case "modify": return "MODIFICAR AGENTE";
    case "model": return "SELECCIONAR EL MODELO DE IA";
    case "effort": return "SELECCIONAR NIVEL DE ESFUERZO";
    case "delete": return "ADVERTENCIA";
    case "create": return `CREAR AGENTE — v${PLUGIN_VERSION}`;
    case "coordinator": return "CONFIGURACIÓN DEL COORDINADOR";
    case "ai-gate": return "CONFIGURAR COORDINADOR";
    case "ai-interview": return "ENTREVISTA DE AGENTE";
    case "ai-preview": return "VISTA PREVIA DE IA";
    case "skill-picker": return "SELECCIONAR SKILLS";
  }
  return "SUITE DE AGENTES";
}

export function modifyOptions(row: Pick<AgentCatalogRow, "membership"> & { fullBaseEditing?: boolean }): readonly string[] {
  return row.membership === "custom"
    ? ["Asistente IA", "Modificar nombre", "Descripción", "Skills", "Operaciones", "Modelo de IA", "Nivel de esfuerzo", "Eliminar", "Volver"]
    : row.fullBaseEditing === true ? ["Asistente IA", "Descripción", "Skills", "Operaciones", "Modelo de IA", "Nivel de esfuerzo", "Volver"] : ["Modelo de IA", "Nivel de esfuerzo", "Volver"];
}

export type EditorField = "ai" | "id" | "description" | "skills" | "operations" | "model" | "effort" | "delete";

export function editorFields(row: Pick<AgentCatalogRow, "membership"> & { fullBaseEditing?: boolean }): readonly EditorField[] {
  return row.membership === "custom"
    ? ["ai", "id", "description", "skills", "operations", "model", "effort", "delete"]
    : row.fullBaseEditing === true ? ["ai", "description", "skills", "operations", "model", "effort"] : ["model", "effort"];
}

export function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

export function focusMarker(index: number, focused: number): "►" | " " {
  return index === focused ? "►" : " ";
}
