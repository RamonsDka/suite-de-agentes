import { describe, expect, it } from "vitest";
import type { AgentCatalogRow, CustomAgent } from "../src/core/types.ts";
import { buildDetailView, confirmDeleteAction, Detail } from "../src/tui/screens/detail.tsx";
import { buildModifyEffortOptions, modifyEscapeTarget, Modify } from "../src/tui/screens/modify.tsx";
import {
  Create,
  addCustomAgentToConfig,
  createAgentFromDraft,
  createCancelTarget,
  createDraftAtStep,
  createStepLabel,
  updateCreateDraft,
  validateCreateDraft,
} from "../src/tui/screens/create.tsx";
import { buildSuiteDeAgentesCatalog } from "../src/core/suites.ts";

const customAgent: CustomAgent = {
  id: "offline-custom",
  description: "Investiga el repositorio",
  model: "openai/gpt-5",
  prompt: "Lee y explica los cambios.",
  permissions: { read: "allow", edit: "ask" },
  skills: ["testing", "github"],
};

const customRow: AgentCatalogRow = {
  id: "offline-custom",
  membership: "custom",
  enabled: false,
  model: customAgent.model,
  description: customAgent.description,
  skills: customAgent.skills,
  consent: "explicit-current-turn",
};

const seedRow: AgentCatalogRow = {
  id: "general",
  membership: "seed",
  enabled: true,
  model: "openai/gpt-5",
  description: "Agente general",
  skills: [],
  consent: "explicit-current-turn",
};

describe("Suite de Agentes detail and modify screens", () => {
  it("builds structured Spanish detail content with chips, operations, and state", () => {
    const view = buildDetailView(customRow, customAgent);

    expect(view.name).toBe("offline-custom");
    expect(view.description).toBe("Investiga el repositorio");
    expect(view.skills).toEqual(["testing", "github"]);
    expect(view.operations).toEqual(["Lee y explica los cambios.", "Permisos: read: allow, edit: ask"]);
    expect(view.materialization).toBe("Creado · no materializado");
    expect(view.actions).toEqual(["Materializar", "Modificar", "Eliminar", "Volver"]);
    expect(buildDetailView(seedRow).actions).toEqual(["Modificar", "Volver"]);
  });

  it("keeps the detail component contract available for the verified OpenTUI seam", () => {
    expect(Detail).toBeTypeOf("function");
    expect(confirmDeleteAction(0)).toBe("cancel");
    expect(confirmDeleteAction(1)).toBe("confirm");
  });

  it("defaults delete confirmation to No and deletes only after explicit Sí", () => {
    expect(confirmDeleteAction(0)).toBe("cancel");
    expect(confirmDeleteAction(1)).toBe("confirm");
    expect(buildDetailView(customRow, customAgent).actions).toContain("Eliminar");
    expect(buildDetailView(seedRow).actions).not.toContain("Eliminar");
  });

  it("orders supported effort options and exposes a cancellable modify component", () => {
    expect(buildModifyEffortOptions(["max", "turbo", "low", "none"])).toEqual([
      "default", "none", "low", "max",
    ]);
    expect(Modify).toBeTypeOf("function");
    expect(modifyEscapeTarget("effort")).toBe("detail");
    expect(modifyEscapeTarget("model")).toBe("detail");
  });

  it("completes the structured create draft and returns the new custom row to the catalog", () => {
    const draft = createDraftAtStep({
      id: "research-custom",
      description: "Investiga cambios",
      model: "openai/gpt-5",
      prompt: "Analiza el repositorio.",
      skills: ["testing"],
    }, "confirm");
    const agent = createAgentFromDraft(draft);
    const config = addCustomAgentToConfig({
      version: 1,
      customAgents: {},
      modelAssignments: {},
      variantAssignments: {},
    }, agent);

    expect(validateCreateDraft(draft)).toEqual({ valid: true });
    expect(config.customAgents["research-custom"]).toEqual(agent);
    expect(buildSuiteDeAgentesCatalog({}, config.customAgents, [])).toEqual([{
      id: "research-custom",
      membership: "custom",
      enabled: false,
      skills: ["testing"],
      consent: "explicit-current-turn",
      model: "openai/gpt-5",
      description: "Investiga cambios",
    }]);
    expect(Create).toBeTypeOf("function");
  });

  it("keeps create fields partial until each Spanish step is committed", () => {
    const draft = updateCreateDraft({}, "id", "research-custom");
    const described = updateCreateDraft(draft, "description", "Investiga cambios");
    expect(createStepLabel("prompt")).toBe("Instrucciones");
    expect(described).toEqual({ id: "research-custom", description: "Investiga cambios" });
    expect(validateCreateDraft(described).valid).toBe(false);
  });

  it("rejects partial or invalid drafts and keeps Esc outside persistence", () => {
    expect(validateCreateDraft({ id: "bad id" })).toEqual({ valid: false, message: "ID no válido" });
    expect(validateCreateDraft({ id: "valid-id", description: "", model: "openai/gpt-5", prompt: "x", skills: [] })).toEqual({ valid: false, message: "Descripción requerida" });
    expect(validateCreateDraft({ id: "valid-id", description: "ok", model: "", prompt: "x", skills: [] })).toEqual({ valid: false, message: "Modelo requerido" });
    expect(validateCreateDraft({ id: "valid-id", description: "ok", model: "openai/gpt-5", prompt: "", skills: [] })).toEqual({ valid: false, message: "Instrucciones requeridas" });
    expect(createCancelTarget()).toEqual({ screen: "landing" });
  });
});
