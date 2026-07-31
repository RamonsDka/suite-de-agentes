import { describe, expect, it } from "vitest";
import { PLUGIN_VERSION } from "../src/version.ts";
import { buildSuiteRootOptions, suiteSidebarLabel, suiteTitle } from "../src/tui/index.tsx";
import { safeScreenMount, safeSlotRender } from "../src/tui/host-compat.ts";

describe("TUI host compatibility", () => {
  it("disables an incompatible renderer without throwing", () => {
    expect(safeSlotRender("sidebar", () => { throw new Error("No renderer found"); })).toBeNull();
  });

  it("returns false so callers can keep the legacy dialog chain when no renderer exists", () => {
    let fallbackCalls = 0;
    const mounted = safeScreenMount("landing", () => { throw new Error("No renderer found"); });
    if (!mounted) fallbackCalls += 1;
    expect(mounted).toBe(false);
    expect(fallbackCalls).toBe(1);
  });

  it("keeps the version visible in the host-safe labels", () => {
    expect(PLUGIN_VERSION).toBe("0.1.0");
    expect(suiteTitle()).toBe(`Suite de Agentes · v${PLUGIN_VERSION}`);
    expect(suiteSidebarLabel()).toBe(`Suite de Agentes · Alt+S · v${PLUGIN_VERSION}`);
  });

  it("exposes exactly the two Spanish root options", () => {
    expect(buildSuiteRootOptions().map((option) => option.title)).toEqual(["Catálogo", "Crear agente"]);
  });
});
