import { describe, expect, it } from "vitest";
import { buildSuiteDeAgentesCatalog, SUITE_DE_AGENTES_SEED } from "../src/core/suites.ts";
import type { AgentCatalogRow } from "../src/core/types.ts";
import { catalogColumns } from "../src/tui/layout.ts";
import {
  CATALOG_EMPTY_STATE,
  activateCatalogFocus,
  advanceCatalogPage,
  buildCatalogPage,
  catalogCellColors,
  moveCatalogFocus,
} from "../src/tui/screens/catalog.tsx";

const customAgents = {
  "offline-custom": {
    id: "offline-custom",
    description: "Created but not materialized",
    model: "openai/gpt-5.6-luna",
    prompt: "Help locally",
    permissions: { "*:read": "allow" as const },
    skills: ["testing"],
  },
  "custom-runtime": {
    id: "custom-runtime",
    description: "Plugin custom agent",
    model: "openai/gpt-5.6-luna",
    prompt: "Run with the plugin",
    permissions: { "*:read": "allow" as const },
    skills: ["github"],
  },
};

const catalogRows: AgentCatalogRow[] = Array.from({ length: 7 }, (_, index) => ({
  id: `agent-${index + 1}`,
  membership: index === 6 ? "custom" : "seed",
  enabled: true,
  model: "openai/gpt-5",
  skills: [],
  consent: "explicit-current-turn",
}));

const theme = {
  border: "border",
  borderActive: "border-active",
  text: "text",
  textMuted: "muted",
  error: "error",
  background: "background",
  backgroundPanel: "panel",
  backgroundElement: "element",
  backgroundMenu: "menu",
  selectedListItemText: "selected",
  primary: "primary",
};

describe("Suite de Agentes catalog", () => {
  it("selects three, two, and one responsive columns at the exact breakpoints", () => {
    expect([catalogColumns(100), catalogColumns(70), catalogColumns(69)]).toEqual([3, 2, 1]);
  });

  it("paginates by terminal height and only offers Más… before the last page", () => {
    const first = buildCatalogPage(catalogRows, 110, 16, 0);
    const last = buildCatalogPage(catalogRows, 110, 16, 1);

    expect(first.rows).toHaveLength(6);
    expect(first.hasMore).toBe(true);
    expect(first.moreLabel).toBe("Más…");
    expect(last.rows).toHaveLength(1);
    expect(last.hasMore).toBe(false);
    expect(last.moreLabel).toBeUndefined();
    expect(advanceCatalogPage(0, first.hasMore)).toBe(1);
    expect(advanceCatalogPage(1, last.hasMore)).toBe(1);
    expect(buildCatalogPage(catalogRows, 60, 16, 0).columns).toBe(1);
  });

  it("renders a Spanish empty state and keeps theme tokens for regular and focused cells", () => {
    expect(CATALOG_EMPTY_STATE).toMatch(/No hay agentes.*Crear agente/i);
    expect(catalogCellColors(theme, false)).toEqual({ borderColor: "border", textColor: "text" });
    expect(catalogCellColors(theme, true)).toEqual({ borderColor: "border-active", textColor: "selected" });
  });

  it("moves focus deterministically in row-major 2-D order and selects the focused item", () => {
    expect(moveCatalogFocus(0, "right", 3, 7)).toBe(1);
    expect(moveCatalogFocus(2, "down", 3, 7)).toBe(5);
    expect(moveCatalogFocus(5, "down", 3, 7)).toBe(6);
    expect(moveCatalogFocus(6, "right", 3, 7)).toBe(6);
    expect(moveCatalogFocus(6, "up", 3, 7)).toBe(3);
    expect(activateCatalogFocus(catalogRows, 4)).toEqual(catalogRows[4]);
    expect(activateCatalogFocus(catalogRows, 7)).toBeUndefined();
  });

  it("uses only seed and custom membership while excluding runtime noise", () => {
    const rows = buildSuiteDeAgentesCatalog({
      "agent-especialit-github": { model: "openai/gpt-5.6-luna", description: "GitHub" },
      "custom-runtime": { model: "openai/gpt-5.6-luna", description: "Runtime custom" },
      "sdd-tasks": { model: "openai/gpt-5.6-luna" },
      "review-risk": { model: "openai/gpt-5.6-luna" },
      "jd-judge": { model: "openai/gpt-5.6-luna" },
      "general-fallback": { model: "openai/gpt-5.6-luna" },
      "gentle-orchestrator": { model: "openai/gpt-5.6-luna" },
      unrelated: { model: "openai/gpt-5.6-luna" },
    }, customAgents);

    expect(rows.map((row) => row.id)).toEqual([
      "agent-especialit-github",
      "custom-runtime",
      "general",
      "offline-custom",
    ]);
    expect(rows.map((row) => row.id)).not.toEqual(expect.arrayContaining([
      "sdd-tasks",
      "review-risk",
      "jd-judge",
      "general-fallback",
      "gentle-orchestrator",
      "unrelated",
    ]));
    expect(rows.find((row) => row.id === "general")).toMatchObject({ membership: "seed", enabled: false });
    expect(rows.find((row) => row.id === "custom-runtime")).toMatchObject({ membership: "custom", enabled: true });
    expect(rows.find((row) => row.id === "offline-custom")).toMatchObject({ membership: "custom", enabled: false });
  });

  it("keeps deterministic ordering and explicit current-turn consent labels", () => {
    const runtime = {
      general: { model: "openai/gpt-5.6-luna" },
      "agent-especialit-github": { model: "openai/gpt-5.6-luna" },
    };
    const first = buildSuiteDeAgentesCatalog(runtime, customAgents, [...SUITE_DE_AGENTES_SEED].reverse());
    const second = buildSuiteDeAgentesCatalog(runtime, customAgents, SUITE_DE_AGENTES_SEED);

    expect(first).toEqual(second);
    expect(first).toHaveLength(4);
    expect(first.every((row) => row.consent === "explicit-current-turn")).toBe(true);
  });

  it("shows each agent's persisted model assignment without changing other rows", () => {
    const rows = buildSuiteDeAgentesCatalog(
      {
        general: { model: "openai/runtime-general" },
        "agent-especialit-github": { model: "openai/runtime-github" },
      },
      customAgents,
      SUITE_DE_AGENTES_SEED,
      { general: "anthropic/general", "agent-especialit-github": "anthropic/github" },
      { general: "high" },
    );

    expect(rows.find((row) => row.id === "general")?.model).toBe("anthropic/general");
    expect(rows.find((row) => row.id === "general")?.variant).toBe("high");
    expect(rows.find((row) => row.id === "agent-especialit-github")?.model).toBe("anthropic/github");
    expect(rows.find((row) => row.id === "offline-custom")?.model).toBe("openai/gpt-5.6-luna");
  });

  it("uses the runtime variant as the current marker when no persisted override exists", () => {
    const rows = buildSuiteDeAgentesCatalog(
      { general: { model: "openai/runtime-general", variant: "high" } },
      {},
      SUITE_DE_AGENTES_SEED,
      {},
      {},
    );

    expect(rows.find((row) => row.id === "general")).toMatchObject({ model: "openai/runtime-general", variant: "high" });
  });
});
