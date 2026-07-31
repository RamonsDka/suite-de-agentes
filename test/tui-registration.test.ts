import { describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  AGENT_SUITE_COMMAND,
  AGENT_SUITE_KEY,
  buildAgentModelOptions,
  buildAgentVariantOptions,
  buildCatalogActionOptions,
  buildCatalogOptions,
  getAvailableModelVariants,
  openSuite,
  registerSuiteKeymap,
  registerSuiteSlashCommand,
  showCatalog,
  tui,
} from "../src/tui/index.tsx";
import { reduceScreen, type ScreenState } from "../src/tui/screens/nav.ts";
import { LANDING_ACTIONS } from "../src/tui/screens/landing.tsx";

const CANCEL = Symbol("cancel");

function dialogHost(choices: unknown[] = [], confirmations: boolean[] = []) {
  const selects: any[] = [];
  const alerts: any[] = [];
  const confirms: any[] = [];
  const api = {
      ui: {
      dialog: { replace: (render: () => unknown, onClose?: () => void) => { (api as any)._onClose = onClose; render(); }, clear: () => undefined },
      DialogSelect: (props: any) => { selects.push(props); const choice = choices.shift(); if (choice === CANCEL) (api as any)._onClose?.(); else if (choice !== undefined) props.onSelect?.({ title: String(choice), value: choice }); return null; },
      DialogAlert: (props: any) => { alerts.push(props); return null; },
      DialogPrompt: () => null,
      DialogConfirm: (props: any) => { confirms.push(props); const choice = confirmations.shift(); if (choice === true) props.onConfirm?.(); else if (choice === false) props.onCancel?.(); return null; },
    },
    state: { config: { agent: {} }, provider: [], path: { directory: "." } },
  } as any;
  return { api, selects, alerts, confirms };
}

async function flushAsyncWork(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("TUI registration", () => {
  it("routes Alt+S and /agent-suite to the same owned landing without mutation", async () => {
    const home = mkdtempSync(join(tmpdir(), "agent-suite-landing-"));
    vi.stubEnv("HOME", home);
    vi.stubEnv("USERPROFILE", home);
    try {
      let replaceCalls = 0;
      const layer: any = { commands: [], bindings: [] };
      const { api, selects } = dialogHost([CANCEL]);
      api.ui.dialog.replace = () => { replaceCalls += 1; };
      (api as any).theme = { current: {
        primary: "primary", text: "text", textMuted: "muted", selectedListItemText: "selected",
        background: "background", backgroundPanel: "panel", border: "border", borderActive: "active",
      } };
      const registeredApi = {
        ...api,
        keymap: { registerLayer: (value: any) => { Object.assign(layer, value); return () => undefined; } },
        command: { register: (factory: () => unknown[]) => { layer.legacy = factory(); return () => undefined; } },
        slots: { register: () => undefined },
      } as any;

      await (tui as any)(registeredApi);
      expect(layer.commands[0].run()).toBe(true);
      await flushAsyncWork();
      layer.legacy[0].onSelect();
      await flushAsyncWork();

      expect(replaceCalls).toBe(2);
      expect(selects).toHaveLength(0);
      expect(LANDING_ACTIONS).toEqual(["Catálogo", "Crear agente"]);
      expect(reduceScreen({ screen: "landing" }, { type: "cancel" })).toEqual({ screen: "closed" });
      expect((api as any).state.config).toEqual({ agent: {} });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("binds Alt+S and the slash command to the same action", () => {
    let opened = 0;
    let layer: any;
    const api = { keymap: { registerLayer: (value: any) => { layer = value; return () => undefined; } } } as any;
    expect(registerSuiteKeymap(api, () => { opened += 1; })).toBe(true);
    expect(layer.bindings).toEqual([{ key: AGENT_SUITE_KEY, cmd: AGENT_SUITE_COMMAND }]);
    expect(layer.commands[0].name).toBe(AGENT_SUITE_COMMAND);
    expect(layer.commands[0].run()).toBe(true);
    expect(opened).toBe(1);
    const commandApi = { command: { register: (factory: () => unknown[]) => { layer.legacy = factory(); return () => undefined; } } } as any;
    expect(registerSuiteSlashCommand(commandApi, () => { opened += 1; })).toBe(true);
    expect(layer.legacy[0].slash).toEqual({ name: "agent-suite" });
    layer.legacy[0].onSelect();
    expect(opened).toBe(2);
  });

  it("fails safely when the host reports a keymap collision", () => {
    const api = { keymap: { registerLayer: () => { throw new Error("collision"); } } } as any;
    expect(registerSuiteKeymap(api, () => undefined)).toBe(false);
  });

  it("uses the native select surface for compact catalog rows and custom actions", () => {
    const row = {
      id: "offline-custom",
      membership: "custom" as const,
      enabled: false,
      skills: ["testing"],
      consent: "explicit-current-turn" as const,
      model: "openai/gpt-5.6-luna",
      description: "Created but not materialized",
    };
    const catalog = buildCatalogOptions([row]);
    expect(catalog).toHaveLength(1);
    expect(catalog[0]?.value).toBe("offline-custom");
    expect(catalog[0]?.description).toMatch(/no materializado/i);
    expect(buildCatalogActionOptions(row).map((option) => option.title)).toEqual(["Materializar", "Eliminar", "Volver"]);
    expect(buildCatalogActionOptions({ ...row, membership: "seed", id: "general" }).map((option) => option.title)).toEqual(["Volver"]);
    expect(buildAgentModelOptions(row, [
      { title: "openai/gpt-5.6-luna", value: "openai/gpt-5.6-luna" },
    ]).at(-1)?.title).toBe("Más acciones…");
  });

  it("derives enabled effort variants from each exact runtime model", () => {
    const { api } = dialogHost();
    api.state.provider = [{ id: "openai", models: {
      alpha: { name: "Alpha", variants: { minimal: {}, high: {} } },
      beta: { name: "Beta", variants: { medium: {}, max: {} } },
      disabled: { name: "Disabled", variants: { low: { disabled: true }, high: {} } },
      absent: { name: "Absent" },
    } }];

    expect(getAvailableModelVariants(api, "openai/alpha")).toEqual(["minimal", "high"]);
    expect(getAvailableModelVariants(api, "openai/beta")).toEqual(["medium", "max"]);
    expect(getAvailableModelVariants(api, "openai/disabled")).toEqual(["high"]);
    expect(getAvailableModelVariants(api, "openai/absent")).toEqual([]);
  });

  it("marks the current effort only when the selected model is still current", () => {
    const row = {
      id: "general",
      membership: "seed" as const,
      enabled: true,
      model: "openai/current",
      variant: "high",
      skills: [],
      consent: "explicit-current-turn" as const,
    };

    expect(buildAgentVariantOptions(row, "openai/current", ["low", "high"]).map((option) => option.title)).toEqual([
      "Predeterminado",
      "low",
      "✓ high",
    ]);
    expect(buildAgentVariantOptions(row, "openai/new", ["low", "high"]).map((option) => option.title)).toEqual([
      "Predeterminado",
      "low",
      "high",
    ]);
  });

  it("shows a Spanish empty-state alert when the owned catalog has no rows", async () => {
    const { api, alerts } = dialogHost();
    await showCatalog(api, { version: 1, customAgents: {}, modelAssignments: {}, variantAssignments: {} }, []);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].title).toMatch(/Catálogo/);
    expect(alerts[0].message).toMatch(/No hay agentes.*Crear agente/i);
  });

  it("keeps the root surface safe when a host dialog can render no choice", async () => {
    const { api, selects } = dialogHost(["__cancel__"]);
    await openSuite(api);
    expect(selects[0].options.map((option: { title: string }) => option.title)).toEqual(["Catálogo", "Crear agente"]);
  });

  it("materializes an offline custom member through the detail and action dialogs", async () => {
    const home = mkdtempSync(join(tmpdir(), "agent-suite-tui-"));
    vi.stubEnv("HOME", home);
    vi.stubEnv("USERPROFILE", home);
    try {
      const { api, selects, alerts, confirms } = dialogHost(["offline-custom", "__more__", "materialize"], [true]);
      const config = {
        version: 1 as const,
        modelAssignments: { "offline-custom": "openai/override" },
        variantAssignments: { "offline-custom": "high" },
        customAgents: {
          "offline-custom": {
            id: "offline-custom",
            description: "Created but not materialized",
            model: "openai/gpt-5.6-luna",
            prompt: "Work offline.",
            permissions: { read: "allow" as const },
            skills: [],
          },
        },
      };
      api.state.provider = [{ id: "openai", models: { override: { name: "Override" } } }];

      await showCatalog(api, config, []);
      expect(selects[1].title).toBe("Modelo · offline-custom");
      expect(selects[1].options.at(-1)?.title).toBe("Más acciones…");
      expect(alerts[0]).toMatchObject({ title: "offline-custom" });
      expect(alerts[0].message).toMatch(/Creado · no materializado/);
      expect(alerts[0].message).toMatch(/Consentimiento: turno actual/);

      alerts[0].onConfirm();
      await flushAsyncWork();
      expect(selects[2].options.map((option: { title: string }) => option.title)).toEqual(["Materializar", "Eliminar", "Volver"]);
      expect(confirms[0]).toMatchObject({ title: "¿Materializar agente?" });
      expect(existsSync(join(home, ".config", "opencode", "agent", "offline-custom.md"))).toBe(true);
      expect(readFileSync(join(home, ".config", "opencode", "agent", "offline-custom.md"), "utf8")).toContain("model: openai/override");
      expect(readFileSync(join(home, ".config", "opencode", "agent", "offline-custom.md"), "utf8")).toContain("variant: high");
      expect(alerts.at(-1)?.title).toBe("Agente materializado");
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("keeps catalog navigation reachable when sidebar renderer registration fails", async () => {
    const home = mkdtempSync(join(tmpdir(), "agent-suite-fallback-"));
    vi.stubEnv("HOME", home);
    vi.stubEnv("USERPROFILE", home);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const { api, selects, alerts } = dialogHost(["catalog", "general", "back"]);
      api.state.config.agent = { general: { model: "openai/gpt-5.6-luna", description: "General" } };
      let layer: any;
      await (tui as any)({
        ...api,
        keymap: { registerLayer: (value: any) => { layer = value; return () => undefined; } },
        slots: { register: () => { throw new Error("No renderer found"); } },
      } as any);

      expect(consoleError).toHaveBeenCalled();
      expect(layer.commands[0].run()).toBe(true);
      await flushAsyncWork();
      expect(selects[0].options.map((option: { title: string }) => option.title)).toEqual(["Catálogo", "Crear agente"]);
      expect(selects[1].title).toMatch(/Catálogo/);
      expect(alerts[0].title).toMatch(/Modelo · general/);
      expect(alerts[0].message).toMatch(/No hay modelos disponibles/i);
      alerts[0].onConfirm();
      await flushAsyncWork();
      expect(alerts[1].title).toBe("general");
      alerts[1].onConfirm();
      await flushAsyncWork();
      expect(selects[2].options.map((option: { title: string }) => option.title)).toEqual(["Volver"]);
    } finally {
      consoleError.mockRestore();
      vi.unstubAllEnvs();
    }
  });

  it("opens a Spanish per-agent model selector, marks the current model, persists only that agent, and returns to catalog", async () => {
    const home = mkdtempSync(join(tmpdir(), "agent-suite-model-"));
    vi.stubEnv("HOME", home);
    vi.stubEnv("USERPROFILE", home);
    try {
      const { api, selects, alerts } = dialogHost(["general", "openai/new-model"]);
      api.state.config.agent = { general: { model: "openai/current" }, "agent-especialit-github": { model: "openai/github" } };
      api.state.provider = [{ id: "openai", models: { current: { name: "Current" }, "new-model": { name: "New" } } }];
      await showCatalog(api, {
        version: 1,
        customAgents: {},
        modelAssignments: { "agent-especialit-github": "openai/keep" },
        variantAssignments: {},
      });

      expect(selects[1].title).toBe("Modelo · general");
      expect(selects[1].options.map((option: { title: string }) => option.title)).toContain("✓ openai/current");
      expect(selects[1].options.at(-1)?.title).toBe("Más acciones…");
      expect(alerts[0]).toMatchObject({ title: "Modelo actualizado" });
      expect(alerts[0].message).toMatch(/general.*openai\/new-model/i);
      expect(alerts[0].message).toMatch(/no expone niveles de esfuerzo/i);
      expect(api.state.config.agent.general.model).toBe("openai/new-model");

      const saved = JSON.parse(readFileSync(join(home, ".config", "opencode", "agent-suite", "suites.json"), "utf8"));
      expect(saved.modelAssignments).toEqual({ general: "openai/new-model", "agent-especialit-github": "openai/keep" });

      alerts[0].onConfirm();
      await flushAsyncWork();
      expect(selects[2].title).toMatch(/Catálogo/);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("uses a second Spanish effort selector and persists the model and variant atomically", async () => {
    const home = mkdtempSync(join(tmpdir(), "agent-suite-effort-"));
    vi.stubEnv("HOME", home);
    vi.stubEnv("USERPROFILE", home);
    try {
      const { api, selects, alerts } = dialogHost(["general", "openai/new-model", "high"]);
      api.state.config.agent = { general: { model: "openai/current", variant: "low" } };
      api.state.provider = [{ id: "openai", models: {
        current: { name: "Current", variants: { low: {}, high: {} } },
        "new-model": { name: "New", variants: { low: {}, high: {} } },
      } }];
      await showCatalog(api, {
        version: 1,
        customAgents: {},
        modelAssignments: {},
        variantAssignments: {},
      });

      expect(selects[1].title).toBe("Modelo · general");
      expect(selects[2].title).toBe("Esfuerzo · general");
      expect(selects[2].options.map((option: { title: string }) => option.title)).toEqual(["Predeterminado", "low", "high"]);
      expect(alerts[0].message).toMatch(/Esfuerzo: high/);
      expect(api.state.config.agent.general).toMatchObject({ model: "openai/new-model", variant: "high" });

      const saved = JSON.parse(readFileSync(join(home, ".config", "opencode", "agent-suite", "suites.json"), "utf8"));
      expect(saved.modelAssignments).toEqual({ general: "openai/new-model" });
      expect(saved.variantAssignments).toEqual({ general: "high" });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("does not persist a model or effort when the effort selector is cancelled", async () => {
    const home = mkdtempSync(join(tmpdir(), "agent-suite-effort-cancel-"));
    vi.stubEnv("HOME", home);
    vi.stubEnv("USERPROFILE", home);
    try {
      const { api, selects, alerts } = dialogHost(["general", "openai/new-model", CANCEL]);
      api.state.config.agent = { general: { model: "openai/current", variant: "high" } };
      api.state.provider = [{ id: "openai", models: {
        current: { name: "Current", variants: { high: {} } },
        "new-model": { name: "New", variants: { low: {}, high: {} } },
      } }];
      const config = {
        version: 1 as const,
        customAgents: {},
        modelAssignments: { general: "openai/current" },
        variantAssignments: { general: "high" },
      };

      await showCatalog(api, config);

      expect(selects[2].title).toBe("Esfuerzo · general");
      expect(alerts).toHaveLength(0);
      expect(api.state.config.agent.general).toEqual({ model: "openai/current", variant: "high" });
      expect(existsSync(join(home, ".config", "opencode", "agent-suite", "suites.json"))).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
