/** @jsxImportSource @opentui/solid */
import type {
  TuiDialogSelectOption,
  TuiPlugin,
  TuiPluginApi,
  TuiSlotContext,
} from "@opencode-ai/plugin/tui";
import { safeHostAction, safeScreenMount, safeSlotRender } from "./host-compat.ts";
import { Landing } from "./screens/landing.tsx";
import { Catalog } from "./screens/catalog.tsx";
import { Detail } from "./screens/detail.tsx";
import { Modify } from "./screens/modify.tsx";
import { Create, addCustomAgentToConfig, type CreateProps } from "./screens/create.tsx";
import { loadSuiteConfig, defaultSuitePath, saveSuiteConfig, setAgentModelAssignment, validateAgentId, validateVariantId } from "../core/index.ts";
import { materializeGlobalAgent } from "../core/agents.ts";
import { buildSuiteDeAgentesCatalog, SUITE_DE_AGENTES_SEED } from "../core/suites.ts";
import type { AgentCatalogRow, CustomAgent, SuiteConfig } from "../core/types.ts";
import { confirmValue, promptValue, selectValue, showAlert } from "./dialogs.tsx";
import { PLUGIN_VERSION } from "../version.ts";

export const AGENT_SUITE_COMMAND = ":agent-suite";
export const AGENT_SUITE_KEY = "alt+s";

type RuntimeAgent = { model?: string; variant?: string; description?: string };
type ModelOption = { title: string; value: string; description?: string; category?: string };
type RuntimeModel = TuiPluginApi["state"]["provider"][number]["models"][string];
type RootChoice = "catalog" | "create-agent";
type CatalogAction = "materialize" | "delete" | "back";
const MORE_ACTIONS = "__more__";
const DEFAULT_VARIANT = "";

export function suiteTitle(): string {
  return `Suite de Agentes · v${PLUGIN_VERSION}`;
}

export function suiteSidebarLabel(): string {
  return `Suite de Agentes · Alt+S · v${PLUGIN_VERSION}`;
}

export function buildSuiteRootOptions(): TuiDialogSelectOption<RootChoice>[] {
  return [
    { title: "Catálogo", value: "catalog", description: "Explora los agentes de la Suite de Agentes" },
    { title: "Crear agente", value: "create-agent", description: "Crea un agente personalizado" },
  ];
}

function runtimeAgents(api: TuiPluginApi): Record<string, RuntimeAgent> {
  return (api.state.config.agent ?? {}) as Record<string, RuntimeAgent>;
}

function modelOptions(api: TuiPluginApi): ModelOption[] {
  return api.state.provider.flatMap((provider) => Object.entries(provider.models ?? {}).map(([modelID, model]) => ({
    title: `${provider.id}/${modelID}`,
    value: `${provider.id}/${modelID}`,
    description: typeof model.name === "string" ? model.name : undefined,
    category: provider.id,
  })));
}

function runtimeModel(api: TuiPluginApi, modelID: string): RuntimeModel | undefined {
  const separator = modelID.indexOf("/");
  if (separator <= 0 || separator === modelID.length - 1) return undefined;
  const providerID = modelID.slice(0, separator);
  const localModelID = modelID.slice(separator + 1);
  return api.state.provider.find((provider) => provider.id === providerID)?.models[localModelID];
}

export function getAvailableModelVariants(api: TuiPluginApi, modelID: string): string[] {
  const variants = runtimeModel(api, modelID)?.variants;
  if (!variants || typeof variants !== "object") return [];
  return Object.entries(variants).flatMap(([variantID, metadata]) => {
    try { validateVariantId(variantID); } catch { return []; }
    if (metadata && typeof metadata === "object" && !Array.isArray(metadata) && (metadata as { disabled?: unknown }).disabled === true) return [];
    return [variantID];
  });
}

async function availableSkills(api: TuiPluginApi): Promise<Array<{ name: string; description?: string }>> {
  try {
    const response = await api.client.app.skills({ directory: api.state.path.directory });
    return response.data ?? [];
  } catch {
    return [];
  }
}

function persist(config: SuiteConfig): void {
  saveSuiteConfig(defaultSuitePath(), config);
}

function close(api: TuiPluginApi): void {
  api.ui.dialog.clear();
}

function returnToRoot(api: TuiPluginApi): void {
  close(api);
  void openSuite(api);
}

function catalogState(row: AgentCatalogRow): string {
  if (row.enabled) return "Disponible";
  return row.membership === "custom" ? "Creado · no materializado" : "No materializado";
}

function catalogModel(row: AgentCatalogRow): string {
  return row.model ?? "modelo pendiente";
}

export function buildCatalogOptions(rows: readonly AgentCatalogRow[]): TuiDialogSelectOption<string>[] {
  return rows.map((row) => ({
    title: row.id,
    value: row.id,
    description: `${catalogState(row)} · ${catalogModel(row)} · Detalles · permiso por turno`,
  }));
}

export function catalogDetailMessage(row: AgentCatalogRow): string {
  const skills = row.skills.join(", ") || "ninguna";
  const description = row.description ? `\nDescripción: ${row.description}` : "";
  return [
    catalogState(row),
    `Modelo: ${catalogModel(row)}`,
    `Esfuerzo: ${row.variant ?? "Predeterminado"}`,
    `Habilidades: ${skills}`,
    `Consentimiento: turno actual (usa también agente: ${row.id})`,
    description,
  ].filter(Boolean).join("\n");
}

export function buildCatalogActionOptions(row: AgentCatalogRow): TuiDialogSelectOption<CatalogAction>[] {
  const options: TuiDialogSelectOption<CatalogAction>[] = [];
  if (row.membership === "custom" && !row.enabled) {
    options.push({ title: "Materializar", value: "materialize", description: "Crear el agente global" });
  }
  if (row.membership === "custom") {
    options.push({ title: "Eliminar", value: "delete", description: "Quitar el registro personalizado" });
  }
  options.push({ title: "Volver", value: "back" });
  return options;
}

export function buildAgentModelOptions(row: AgentCatalogRow, options: readonly ModelOption[]): TuiDialogSelectOption<string>[] {
  return [
    ...options.map((option) => option.value === row.model ? {
      ...option,
      title: `✓ ${option.title}`,
      description: `${option.description ? `${option.description} · ` : ""}Modelo actual`,
    } : option),
    { title: "Más acciones…", value: MORE_ACTIONS, description: "Ver detalles y operaciones del agente" },
  ];
}

export function buildAgentVariantOptions(
  row: AgentCatalogRow,
  selectedModel: string,
  variants: readonly string[],
): TuiDialogSelectOption<string>[] {
  const sameCurrentModel = row.model === selectedModel;
  const currentVariant = sameCurrentModel ? row.variant : undefined;
  return [
    {
      title: sameCurrentModel && currentVariant === undefined ? "✓ Predeterminado" : "Predeterminado",
      value: DEFAULT_VARIANT,
      description: sameCurrentModel && currentVariant === undefined ? "Esfuerzo actual" : undefined,
    },
    ...variants.map((variant) => variant === currentVariant ? {
      title: `✓ ${variant}`,
      value: variant,
      description: "Esfuerzo actual",
    } : {
      title: variant,
      value: variant,
    }),
  ];
}

async function chooseModel(api: TuiPluginApi): Promise<string | undefined> {
  const options = modelOptions(api);
  return options.length ? selectValue(api, { title: "Elige proveedor y modelo", options }) : undefined;
}

async function openCreateScreen(api: TuiPluginApi, config: SuiteConfig): Promise<boolean> {
  const skills = await availableSkills(api);
  return safeScreenMount("create", () => api.ui.dialog.replace(
    () => api.ui.Dialog({
      size: "large",
      onClose: () => close(api),
      children: <Create
        theme={api.theme.current}
        models={modelOptions(api).map((option) => option.value)}
        skills={skills.map((skill) => skill.name)}
        onSave={async (agent) => {
          try {
            const next = addCustomAgentToConfig(config, agent);
            persist(next);
            close(api);
            if (await confirmValue(api, {
              title: "¿Materializar agente global?",
              message: `Escribe ~/.config/opencode/agent/${agent.id}.md con sus instrucciones y permisos.`,
            })) {
              try {
                materializeGlobalAgent(agent, () => true);
              } catch (error) {
                showAlert(api, { title: "Agente guardado", message: `${agent.id} está en el catálogo, pero no se pudo materializar: ${error instanceof Error ? error.message : String(error)}`, onConfirm: () => close(api) });
                return;
              }
            }
            if (!openCatalogScreen(api, next)) void showCatalog(api, next);
          } catch (error) {
            showAlert(api, { title: "Agente no guardado", message: error instanceof Error ? error.message : String(error), onConfirm: () => close(api) });
          }
        }}
        onCancel={() => { close(api); void openSuiteSafely(api); }}
      />,
    }),
    () => close(api),
  ));
}

async function createCustomAgent(api: TuiPluginApi, config: SuiteConfig): Promise<void> {
  const id = (await promptValue(api, {
    title: "ID del agente personalizado",
    description: () => <text>Solo minúsculas y guiones.</text>,
  }))?.trim();
  if (!id) return;
  try {
    validateAgentId(id);
  } catch (error) {
    showAlert(api, {
      title: "ID no válido",
      message: error instanceof Error ? error.message : String(error),
      onConfirm: () => close(api),
    });
    return;
  }

  const description = (await promptValue(api, { title: "Descripción" }))?.trim();
  if (!description) return;
  const model = await chooseModel(api);
  if (!model) return;
  const prompt = (await promptValue(api, { title: "Instrucciones" }))?.trim();
  if (!prompt) return;

  const skills = await availableSkills(api);
  const selectedSkills: string[] = [];
  while (skills.length) {
    const skill = await selectValue(api, {
      title: "Habilidades (elige Listo al terminar)",
      options: [
        { title: "Listo", value: "__done__" },
        ...skills
          .filter((item) => !selectedSkills.includes(item.name))
          .map((item) => ({ title: item.name, value: item.name, description: item.description })),
      ],
    });
    if (!skill || skill === "__done__") break;
    selectedSkills.push(skill);
  }

  const customAgent: CustomAgent = {
    id,
    description,
    model,
    prompt,
    permissions: { read: "allow", edit: "ask" },
    skills: selectedSkills,
  };
  const summary = `${id}\n${model}\nHabilidades: ${selectedSkills.join(", ") || "ninguna"}`;
  if (!await confirmValue(api, { title: "¿Guardar agente?", message: summary })) return;

  const next = structuredClone(config);
  next.customAgents[id] = customAgent;
  try {
    persist(next);
  } catch (error) {
    showAlert(api, {
      title: "Agente no guardado",
      message: error instanceof Error ? error.message : String(error),
      onConfirm: () => close(api),
    });
    return;
  }

  let materializationMessage = "";
  if (await confirmValue(api, {
    title: "¿Materializar agente global?",
    message: "Escribe ~/.config/opencode/agent/<id>.md con sus instrucciones y permisos.",
  })) {
    try {
      materializeGlobalAgent(customAgent, () => true);
      materializationMessage = " También se materializó el archivo global.";
    } catch (error) {
      materializationMessage = ` No se pudo materializar: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  showAlert(api, {
    title: "Agente guardado",
    message: `${id} está disponible en el catálogo.${materializationMessage}`,
    onConfirm: () => returnToRoot(api),
  });
}

async function showCatalogActions(
  api: TuiPluginApi,
  config: SuiteConfig,
  row: AgentCatalogRow,
  seed: readonly string[],
): Promise<void> {
  const action = await selectValue(api, {
    title: `Acciones · ${row.id}`,
    options: buildCatalogActionOptions(row),
  });
  if (action === "back") return showCatalog(api, config, seed);

  const customAgent = config.customAgents[row.id];
  if (!customAgent) return showCatalog(api, config, seed);

  if (action === "materialize") {
    if (!await confirmValue(api, {
      title: "¿Materializar agente?",
      message: `${row.id} se escribirá en ~/.config/opencode/agent/${row.id}.md.`,
    })) return showCatalog(api, config, seed);
    try {
      const assignedModel = config.modelAssignments?.[row.id];
      const assignedVariant = config.variantAssignments?.[row.id];
      materializeGlobalAgent({
        ...customAgent,
        ...(assignedModel ? { model: assignedModel } : {}),
        ...(assignedVariant ? { variant: assignedVariant } : {}),
      }, () => true);
      showAlert(api, {
        title: "Agente materializado",
        message: `${row.id} se creó. Reinicia OpenCode si todavía no aparece como disponible.`,
        onConfirm: () => { close(api); void showCatalog(api, config, seed); },
      });
    } catch (error) {
      showAlert(api, {
        title: "No se pudo materializar",
        message: error instanceof Error ? error.message : String(error),
        onConfirm: () => { close(api); void showCatalog(api, config, seed); },
      });
    }
    return;
  }

  if (action === "delete") {
    if (!await confirmValue(api, {
      title: "¿Eliminar agente personalizado?",
      message: "Se quitará el registro privado; no se borrarán archivos globales.",
    })) return showCatalog(api, config, seed);
    const next = structuredClone(config);
    delete next.customAgents[row.id];
    try {
      persist(next);
      showAlert(api, {
        title: "Agente eliminado",
        message: `${row.id} ya no pertenece al catálogo.`,
        onConfirm: () => { close(api); void showCatalog(api, next, seed); },
      });
    } catch (error) {
      showAlert(api, {
        title: "No se pudo eliminar",
        message: error instanceof Error ? error.message : String(error),
        onConfirm: () => { close(api); void showCatalog(api, config, seed); },
      });
    }
  }
}

function showCatalogDetails(api: TuiPluginApi, config: SuiteConfig, row: AgentCatalogRow, seed: readonly string[]): void {
  showAlert(api, {
    title: row.id,
    message: catalogDetailMessage(row),
    onConfirm: () => { close(api); void showCatalogActions(api, config, row, seed); },
  });
}

function customAgentForRow(config: SuiteConfig, row: AgentCatalogRow): CustomAgent | undefined {
  return row.membership === "custom" ? config.customAgents[row.id] : undefined;
}

function openDetailScreen(api: TuiPluginApi, config: SuiteConfig, row: AgentCatalogRow, seed: readonly string[]): boolean {
  return safeScreenMount("detail", () => api.ui.dialog.replace(
    () => api.ui.Dialog({
      size: "large",
      onClose: () => close(api),
      children: <Detail
        row={row}
        customAgent={customAgentForRow(config, row)}
        theme={api.theme.current}
        onModify={() => {
          close(api);
          if (!openModifyScreen(api, config, row, seed)) void showCatalogDetails(api, config, row, seed);
        }}
        onMaterialize={() => {
          const customAgent = customAgentForRow(config, row);
          if (!customAgent) return;
          void confirmValue(api, {
            title: "¿Materializar agente?",
            message: `${row.id} se escribirá en ~/.config/opencode/agent/${row.id}.md.`,
          }).then((confirmed) => {
            if (!confirmed) return;
            try {
              materializeGlobalAgent({ ...customAgent, ...(config.modelAssignments[row.id] ? { model: config.modelAssignments[row.id] } : {}), ...(config.variantAssignments[row.id] ? { variant: config.variantAssignments[row.id] } : {}) }, () => true);
              if (!openCatalogScreen(api, config)) void showCatalog(api, config, seed);
            } catch (error) {
              showAlert(api, { title: "No se pudo materializar", message: error instanceof Error ? error.message : String(error), onConfirm: () => close(api) });
            }
          });
        }}
        onDelete={() => {
          const next = structuredClone(config);
          if (row.membership === "custom") delete next.customAgents[row.id];
          try {
            persist(next);
            close(api);
            if (!openCatalogScreen(api, next)) void showCatalog(api, next, seed);
          } catch (error) {
            showAlert(api, { title: "No se pudo eliminar", message: error instanceof Error ? error.message : String(error), onConfirm: () => close(api) });
          }
        }}
        onBack={() => {
          close(api);
          if (!openCatalogScreen(api, config)) void showCatalog(api, config, seed);
        }}
      />,
    }),
    () => close(api),
  ));
}

function openModifyScreen(api: TuiPluginApi, config: SuiteConfig, row: AgentCatalogRow, seed: readonly string[]): boolean {
  const options = modelOptions(api);
  if (!options.length) return false;
  return safeScreenMount("modify", () => api.ui.dialog.replace(
    () => api.ui.Dialog({
      size: "large",
      onClose: () => close(api),
      children: <Modify
        row={row}
        theme={api.theme.current}
        models={options.map((option) => option.value)}
        variantsForModel={(model) => getAvailableModelVariants(api, model)}
        onSave={(model, variant) => {
          try {
            const next = setAgentModelAssignment(config, row.id, model, variant);
            persist(next);
            const runtimeAgent = runtimeAgents(api)[row.id];
            if (runtimeAgent) {
              runtimeAgent.model = model;
              if (variant) runtimeAgent.variant = variant;
              else delete runtimeAgent.variant;
            }
            close(api);
            void showCatalog(api, next, seed);
          } catch (error) {
            showAlert(api, { title: "Modelo no guardado", message: error instanceof Error ? error.message : String(error), onConfirm: () => close(api) });
          }
        }}
        onCancel={() => { close(api); if (!openDetailScreen(api, config, row, seed)) showCatalogDetails(api, config, row, seed); }}
      />,
    }),
    () => close(api),
  ));
}

async function showAgentModelSelector(
  api: TuiPluginApi,
  config: SuiteConfig,
  row: AgentCatalogRow,
  seed: readonly string[],
): Promise<void> {
  const options = modelOptions(api);
  if (!options.length) {
    showAlert(api, {
      title: `Modelo · ${row.id}`,
      message: "No hay modelos disponibles. Puedes consultar los detalles y las acciones del agente.",
      onConfirm: () => { close(api); showCatalogDetails(api, config, row, seed); },
    });
    return;
  }

  const selected = await selectValue(api, {
    title: `Modelo · ${row.id}`,
    placeholder: "Selecciona un modelo",
    options: buildAgentModelOptions(row, options),
  });
  if (!selected) return;
  if (selected === MORE_ACTIONS) {
    showCatalogDetails(api, config, row, seed);
    return;
  }

  const variants = getAvailableModelVariants(api, selected);
  const selectedVariant = variants.length
    ? await selectValue(api, {
      title: `Esfuerzo · ${row.id}`,
      placeholder: "Selecciona un esfuerzo",
      options: buildAgentVariantOptions(row, selected, variants),
    })
    : undefined;
  if (variants.length && selectedVariant === undefined) return;

  const next = setAgentModelAssignment(config, row.id, selected, selectedVariant || undefined);
  try {
    persist(next);
  } catch (error) {
    showAlert(api, {
      title: "Modelo no guardado",
      message: error instanceof Error ? error.message : String(error),
      onConfirm: () => { close(api); void showCatalog(api, config, seed); },
    });
    return;
  }

  const runtimeAgent = runtimeAgents(api)[row.id];
  if (runtimeAgent) {
    runtimeAgent.model = selected;
    if (selectedVariant) runtimeAgent.variant = selectedVariant;
    else delete runtimeAgent.variant;
  }
  const effortMessage = variants.length
    ? selectedVariant ? ` Esfuerzo: ${selectedVariant}.` : " Esfuerzo: Predeterminado."
    : " Este modelo no expone niveles de esfuerzo.";
  showAlert(api, {
    title: "Modelo actualizado",
    message: `${row.id} ahora usa ${selected}.${effortMessage}`,
    onConfirm: () => { close(api); void showCatalog(api, next, seed); },
  });
}

export async function showCatalog(
  api: TuiPluginApi,
  config: SuiteConfig,
  seed: readonly string[] = SUITE_DE_AGENTES_SEED,
): Promise<void> {
  const rows = buildSuiteDeAgentesCatalog(runtimeAgents(api), config.customAgents, seed, config.modelAssignments, config.variantAssignments);
  if (!rows.length) {
    showAlert(api, {
      title: `Catálogo · v${PLUGIN_VERSION}`,
      message: "No hay agentes en la Suite de Agentes. Usa Crear agente.",
      onConfirm: () => returnToRoot(api),
    });
    return;
  }

  const selected = await selectValue(api, {
    title: `Catálogo · v${PLUGIN_VERSION}`,
    placeholder: "Selecciona un agente",
    options: buildCatalogOptions(rows),
  });
  const row = rows.find((item) => item.id === selected);
  if (!row) return;
  if (!openDetailScreen(api, config, row, seed)) return showAgentModelSelector(api, config, row, seed);
}

function loadConfig(api: TuiPluginApi): SuiteConfig | undefined {
  try {
    return loadSuiteConfig(defaultSuitePath());
  } catch (error) {
    showAlert(api, {
      title: suiteTitle(),
      message: error instanceof Error ? error.message : String(error),
      onConfirm: () => close(api),
    });
    return undefined;
  }
}

export async function openSuite(api: TuiPluginApi): Promise<void> {
  const config = loadConfig(api);
  if (!config) return;
  const choice = await selectValue(api, { title: suiteTitle(), options: buildSuiteRootOptions() });
  if (choice === "catalog") return showCatalog(api, config);
  if (choice === "create-agent") { const mounted = await openCreateScreen(api, config); if (!mounted) return createCustomAgent(api, config); }
}

export function registerSuiteKeymap(api: Pick<TuiPluginApi, "keymap">, open: () => void): boolean {
  return safeHostAction("register keymap", () => {
    api.keymap.registerLayer({
      priority: 110,
      commands: [{
        name: AGENT_SUITE_COMMAND,
        title: "Suite de Agentes",
        desc: "Abre Catálogo y Crear agente",
        category: "Agentes",
        nargs: "0",
        run: () => { void open(); return true; },
      }],
      bindings: [{ key: AGENT_SUITE_KEY, cmd: AGENT_SUITE_COMMAND }],
    });
    return true;
  }, false);
}

export function registerSuiteSlashCommand(api: Pick<TuiPluginApi, "command">, open: () => void): boolean {
  if (!api.command?.register) return false;
  return safeHostAction("register slash command", () => {
    api.command?.register(() => [{
      title: "Suite de Agentes",
      value: "agent-suite",
      description: "Abre Catálogo y Crear agente",
      category: "Agentes",
      slash: { name: "agent-suite" },
      onSelect: () => open(),
    }]);
    return true;
  }, false);
}

function openCatalogScreen(api: TuiPluginApi, config: SuiteConfig): boolean {
  const rows = buildSuiteDeAgentesCatalog(runtimeAgents(api), config.customAgents, SUITE_DE_AGENTES_SEED, config.modelAssignments, config.variantAssignments);
  return safeScreenMount("catalog", () => api.ui.dialog.replace(
    () => api.ui.Dialog({
      size: "large",
      onClose: () => close(api),
      children: <Catalog
        rows={rows}
        theme={api.theme.current}
        onSelect={(row) => {
          close(api);
          if (!openDetailScreen(api, config, row, SUITE_DE_AGENTES_SEED)) void showAgentModelSelector(api, config, row, SUITE_DE_AGENTES_SEED);
        }}
        onPage={() => undefined}
        onBack={() => { close(api); void openSuiteSafely(api); }}
      />,
    }),
    () => close(api),
  ));
}

function openSuiteSafely(api: TuiPluginApi): void {
  const config = loadConfig(api);
  if (!config) return;
  const mounted = safeScreenMount("landing", () => api.ui.dialog.replace(
    () => api.ui.Dialog({
      size: "large",
      onClose: () => close(api),
      children: <Landing
        theme={api.theme.current}
        onSelect={(action) => {
          close(api);
          if (action === "catalog") {
            if (!openCatalogScreen(api, config)) void showCatalog(api, config);
           } else void openCreateScreen(api, config).then((mounted) => { if (!mounted) void createCustomAgent(api, config); });

        }}
        onClose={() => close(api)}
      />,
    }),
    () => close(api),
  ));
  if (!mounted) void openSuite(api).catch((error: unknown) => {
    showAlert(api, {
      title: suiteTitle(),
      message: error instanceof Error ? error.message : String(error),
      onConfirm: () => close(api),
    });
  });
}

export const tui: TuiPlugin = async (api) => {
  registerSuiteKeymap(api, () => openSuiteSafely(api));
  registerSuiteSlashCommand(api, () => openSuiteSafely(api));
  safeHostAction("register sidebar slot", () => {
    api.slots.register({
      slots: {
        sidebar_content: (ctx: TuiSlotContext) => safeSlotRender("sidebar_content", () => (
          <box paddingLeft={1}>
            <text fg={ctx.theme.current.textMuted}>{suiteSidebarLabel()}</text>
          </box>
        )),
      },
    });
  }, undefined);
};

const plugin = { id: "agent-suite", tui };
export default plugin;
