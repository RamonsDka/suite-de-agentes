import { describe, expect, it, vi } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import plugin, {
  AGENT_SUITE_COMMAND,
  AGENT_SUITE_KEY,
  openAgentSuite,
  registerSuiteKeymap,
  registerSuiteSlashCommand,
  suiteSidebarLabel,
  suiteTitle,
  tui,
} from "../src/tui/index.tsx";
import { PLUGIN_VERSION } from "../src/version.ts";

function registrationHost() {
  const disposers = {
    keymap: vi.fn(),
    command: vi.fn(),
  };
  let layer: any;
  let slash: any;
  const api: any = {
    keymap: {
      registerLayer: vi.fn((value: any) => { layer = value; return disposers.keymap; }),
    },
    command: {
      register: vi.fn((factory: () => unknown[]) => { slash = factory(); return disposers.command; }),
    },
    lifecycle: {
      onDispose: vi.fn((disposer: () => void) => disposer),
    },
    slots: { register: vi.fn(() => "sidebar-slot-id") },
    theme: { current: { textMuted: "muted" } },
  };
  return { api, disposers, get layer() { return layer; }, get slash() { return slash; } };
}

describe("Agent Suite WU1 registration", () => {
  it("exports the host-loadable plugin and versioned labels", () => {
    expect(plugin).toMatchObject({ id: "agent-suite" });
    expect(plugin.tui).toBe(tui);
    expect(PLUGIN_VERSION).toBe("1.0.1");
    expect(suiteTitle()).toBe("Suite de Agentes · v1.0.1");
    expect(suiteSidebarLabel()).toBe("Suite de Agentes · Alt+S · v1.0.1");
  });

  it("registers Alt+S and slash command with one shared opener", () => {
    const host = registrationHost();
    const open = vi.fn();
    expect(registerSuiteKeymap(host.api, open)).toBe(true);
    expect(host.layer.bindings).toEqual([{ key: AGENT_SUITE_KEY, cmd: AGENT_SUITE_COMMAND }]);
    expect(host.layer.commands).toHaveLength(1);
    expect(host.layer.commands[0].run()).toBe(true);
    expect(registerSuiteSlashCommand(host.api, open)).toBe(true);
    host.slash[0].onSelect();
    expect(open).toHaveBeenCalledTimes(2);
  });

  it("opens the custom Dialog through one replace and does not expose route APIs", () => {
    const replace = vi.fn();
    const api: any = {
      theme: { current: {} },
      ui: {
        dialog: { replace, clear: vi.fn() },
        Dialog: vi.fn(() => null),
        DialogAlert: vi.fn(() => null),
      },
    };
    openAgentSuite(api);
    expect(replace).toHaveBeenCalledTimes(1);
    const source = readFileSync(join(process.cwd(), "src/tui/index.tsx"), "utf8");
    expect(source).not.toMatch(/api\.route\./);
    expect(source).not.toMatch(/registerSuiteRoute|navigateSuiteRoute|leaveSuiteRoute|selectSuiteRouteItem/);
  });

  it("uses the native opener once when custom mount fails synchronously", () => {
    const fallback = vi.fn();
    const api: any = {
      theme: { current: {} },
      ui: {
        dialog: { replace: vi.fn(() => { throw new Error("unsupported renderer"); }), clear: vi.fn() },
        Dialog: vi.fn(() => null),
        DialogAlert: vi.fn(() => null),
      },
    };
    openAgentSuite(api, fallback);
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it("retains only real keymap and slash disposers, never the slot id", async () => {
    const host = registrationHost();
    await (tui as any)(host.api);
    expect(host.api.lifecycle.onDispose).toHaveBeenCalledTimes(2);
    expect(host.api.lifecycle.onDispose).toHaveBeenNthCalledWith(1, host.disposers.keymap);
    expect(host.api.lifecycle.onDispose).toHaveBeenNthCalledWith(2, host.disposers.command);
    expect(host.api.slots.register).toHaveBeenCalledTimes(1);
    expect(host.api.lifecycle.onDispose).not.toHaveBeenCalledWith("sidebar-slot-id");
  });

  it("does not open or replace a native screen during plugin registration", async () => {
    const host = registrationHost();
    await (tui as any)(host.api);
    expect(host.api.keymap.registerLayer).toHaveBeenCalledTimes(1);
    expect(host.api.command.register).toHaveBeenCalledTimes(1);
    expect(existsSync(join(process.cwd(), "src/tui/screens/suite-route.tsx"))).toBe(false);
  });
});
