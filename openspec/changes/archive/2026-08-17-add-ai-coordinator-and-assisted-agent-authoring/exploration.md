# Exploration: AI Coordinator & Assisted Agent Authoring with Real Skill Management

> **Change ID**: `add-ai-coordinator-and-assisted-agent-authoring`  
> **Repository**: `suite-de-agentes` (`opencode-agent-suite`)  
> **Artifact Store**: Hybrid (OpenSpec + Engram)  
> **Execution Mode**: Interactive  
> **Delivery Strategy**: Force-Chained (<= 400 lines review budget per slice)  
> **Strict TDD Mode**: Enabled  

---

## 1. Executive Summary

`opencode-agent-suite` currently provides a custom Solid.js/OpenTUI graphical terminal interface for managing OpenCode agents (viewing details, configuring models and reasoning effort variants, adding/removing raw skill IDs, editing operations prompts, and creating/deleting custom agents). However:
1. **Agent skills are unmanaged strings**: Users must manually type skill identifier strings with no visibility into which skills are actually installed across the system or workspace.
2. **Authoring is entirely manual**: Creating or tuning agent descriptions and system prompts (operations) requires blank-canvas manual typing without AI assistance.
3. **No plugin-level AI coordinator**: The suite cannot query an LLM on its own behalf to assist in agent design or skill generation because no dedicated coordinator model is configured.
4. **Visual ergonomics**: The TUI lacks high-contrast visual cues (blue labels / white values), an alpha-blended translucent search bar, and an explicit quick-exit shortcut (`Finalizar` in yellow) inside the Modify screen.

This exploration analyzes the architecture, security boundaries, user experience, and delivery plan for introducing an **AI Coordinator** and **Assisted Agent Authoring** capability with **Real Skill Management**, while preserving full offline/unconfigured usability for all non-AI workflows.

---

## 2. Current State vs Requested Capabilities (Gap Analysis)

| Area | Current Implementation (`v1.0.1`) | Target Implementation | Gap & Complexity |
|---|---|---|---|
| **Visual Polish** | Generic theme-driven text colors; standard input styling in Catalog; Esc/back navigation in Modify. | • Yellow `Finalizar` shortcut in Modify to save & close suite.<br>• Blue labels with high-contrast white values in field panels.<br>• Blue ~50% translucent background for search inputs. | **Low**. Pure TUI styling & key handling in `visual-primitives.tsx`, `visual-tokens.ts`, `catalog.tsx`, and `modify-panel.tsx`. |
| **Skill Management** | Flat string array of skill IDs (`agent.skills: string[]`). In Modify, user manually types kebab-case strings. | • Query installed skills from OpenCode runtime & directories.<br>• Visual picker to add/remove existing installed skills.<br>• Accept skill URL for safe verification & import.<br>• Accept natural language prompt to generate & install skill. | **Medium-High**. Requires runtime discovery (`client.app.skills()`), URL fetching with sandboxing, and SKILL.md generation. |
| **Agent Authoring Assistance** | Static text inputs for Description and Operations prompt. | • "Asistir con IA" / "Mejorar con IA" triggers in Create and Modify.<br>• Ephemeral LLM session generates or refines descriptions & operations prompts based on user intent.<br>• Diff preview with Accept / Retry / Discard. | **Medium**. Requires ephemeral OpenCode session runner via `client.session.create` / `client.session.prompt` and diff preview dialog. |
| **Coordinator Model Configuration** | No plugin-level model configuration. Only per-agent model assignments (`config.modelAssignments`). | • New Landing settings entry: `⚙ CONFIGURACIÓN` (or header gear).<br>• 3-step setup: Provider -> Model -> Effort.<br>• Status badge: Red (`● No configurado`) vs Green (`● Configurado`).<br>• Explanatory copy & recommended models (e.g. Claude 3.7 Sonnet, GPT-4o). | **Medium**. Requires `SuiteConfig` schema extension (`coordinator?: { model: string, variant?: string }`), model discovery via `api.state.provider`, and settings screen. |
| **Configuration Gating & Fallbacks** | N/A (all existing features are local configuration edits). | • 100% of non-AI features (browsing, editing, deleting, model/effort assignment) work without coordinator setup.<br>• Triggering an AI feature when unconfigured displays a friendly "Configuración requerida" dialog with one-click route to settings. | **Low-Medium**. Fail-open architecture; guarded AI action dispatchers. |

---

## 3. Architectural & Subsystem Investigation

### 3.1 OpenCode SDK & Runtime Integration Surface

Based on analysis of `@opencode-ai/plugin` and `@opencode-ai/sdk` (v2):
1. **Model & Provider Discovery**:
   - `api.state.provider` in TUI provides a synchronous list of `Provider` objects, including `id`, `name`, `source`, `models: Record<string, Model>`.
   - Each `Model` provides `name`, `capabilities: { reasoning: boolean, toolcall: boolean, ... }`, and `variants`.
   - `client.provider.list()` is also available via the SDK for asynchronous discovery.
2. **Skill Discovery**:
   - `client.app.skills()` returns `Array<{ name: string; description?: string; location: string; content: string }>` representing all skills registered in the OpenCode environment.
   - Filesystem fallback: inspect `~/.config/opencode/skills/` (global) and `<workspace>/.opencode/skills/` / `<workspace>/.agents/skills/` (project-local).
3. **Session & Prompt Execution**:
   - `client.session.create({ title: string })` creates an isolated session ID.
   - `client.session.prompt({ sessionID, model: { providerID, modelID }, variant, system, parts: [...] })` streams or awaits the LLM response without touching the user's active conversation.
   - `client.session.deleteMessage` or session cleanup can discard temporary prompt artifacts once completed.
4. **TUI System & Primitives**:
   - Built on OpenTUI + Solid.js (`@opentui/solid`, `@opentui/core`).
   - Standard components support `<box>`, `<text>`, `<input>`, `backgroundColor={RGBA}`, `borderColor`, `createTextAttributes({ bold: true })`.
   - Translucency: OpenTUI `RGBA.fromRgba(r, g, b, 0.5)` or alpha-channel styling supports translucent surfaces.

### 3.2 Persistent Config Schema Evolution (`SuiteConfig`)

Currently `SuiteConfig` in `src/core/types.ts` is:
```typescript
export interface SuiteConfig {
  version: 1;
  customAgents: Record<string, CustomAgent>;
  modelAssignments: Record<string, string>;
  variantAssignments: Record<string, string>;
  baseOverrides?: Record<string, BaseAgentOverride>;
  disabledAgents?: string[];
}
```

To support the AI Coordinator without breaking backward compatibility:
- **Option A (Compatible v1 Extension - Recommended)**:
  Add an optional `coordinator` field:
  ```typescript
  export interface CoordinatorConfig {
    model: string; // e.g. "anthropic/claude-3-7-sonnet-20250219"
    variant?: string; // e.g. "high"
  }
  
  export interface SuiteConfig {
    version: 1;
    customAgents: Record<string, CustomAgent>;
    modelAssignments: Record<string, string>;
    variantAssignments: Record<string, string>;
    baseOverrides?: Record<string, BaseAgentOverride>;
    disabledAgents?: string[];
    coordinator?: CoordinatorConfig;
  }
  ```
  In `src/core/config.ts`, update `parseSuiteConfig` to allow the `"coordinator"` key and validate `validateModelId(coordinator.model)` and optional `validateVariantId(coordinator.variant)`.
- **Migration & Defaults**:
  If `coordinator` is absent or `suites.json` does not have it, `coordinator` defaults to `undefined`. Existing configs load seamlessly with zero data migration required.

### 3.3 Visual & Interaction System Polish

1. **Yellow `Finalizar` Shortcut**:
   - In `src/tui/screens/modify-panel.tsx` and key handling:
   - Add a prominent yellow action badge / button `[F10 Finalizar]` or menu option.
   - Uses `fg={tokens.status.warning}` or `RGBA.fromHex("#E5C07B")`.
   - Triggers `onClose()` (or `REQUEST_CLOSE`) directly, ensuring all persisted changes are already committed and closing the suite cleanly.
2. **Blue Labels / White Values**:
   - In `src/tui/visual-primitives.tsx` (`FieldRow`), update presentation:
   - Label: `fg={tokens.indicator}` or vibrant blue `RGBA.fromHex("#61AFEF")`.
   - Value: `fg={RGBA.fromHex("#FFFFFF")}` or `tokens.surface.text` (bright).
3. **Blue ~50% Translucent Search Field**:
   - In `src/tui/screens/catalog.tsx` (`<input>`):
   - Wrap the input in a styled `<box backgroundColor={RGBA.fromRgba(33, 150, 243, 0.5)} borderRadius={1} paddingX={1}>` or configure input surface with alpha-blended background.

---

## 4. Security & Trust Boundaries

### 4.1 URL Skill Ingestion Trust Boundary

```
[ External URL / Repo ]
         │
         ▼  (HTTPS Only, Size Capped <= 512KB)
[ Skill Ingest Fetcher ]
         │
         ▼  (Strict AST/Frontmatter Validation)
[ SKILL.md Validator ] ──(Malformed / Injection)──► Reject with Error
         │
         ▼  (Sanitized Name, Prompt, Scripts)
[ Human-in-the-Loop Review Screen ] ──(User Rejects)──► Discard
         │ (User Confirms)
         ▼
[ Secure File Writer ] (Path Traversal Guard: ~/.config/opencode/skills/<name>/SKILL.md)
```

**Threats & Mitigations**:
1. **Malicious Remote Code / Instructions**: External URLs may host prompt injections or unsafe shell execution scripts.
   - *Mitigation*: The plugin must never execute remote code directly. Content is fetched as plain text, parsed strictly against the standard `SKILL.md` schema (YAML frontmatter with `name`, `description`, and body markdown instructions).
2. **Server-Side Request Forgery (SSRF)**: Ingesting internal or malicious network targets (`http://169.254.169.254`, `localhost`).
   - *Mitigation*: Restrict URL scheme to `https://` only; reject private IP ranges and localhost.
3. **Path Traversal Attacks**: A malicious skill name (e.g. `../../bin/exploit`) could attempt to write outside the skills directory.
   - *Mitigation*: Skill name MUST pass strict `validateSkillId` (`^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$`). The output directory is pinned strictly to `path.resolve(skillsDir, sanitizedId)`.
4. **Mandatory Human-in-the-Loop Preview**: Full text of the downloaded skill and its target installation path must be displayed in a TUI review dialog before writing to disk.

### 4.2 AI-Generated Skill Installation Trust Boundary

1. **Prompt Sanitization**: AI coordinator generates skill specifications in standard markdown format with frontmatter.
2. **Validation Layer**: Generated skills are validated against schema:
   - Valid kebab-case identifier (`^[a-z][a-z0-9-]{1,64}$`).
   - Clean, concise description (max 300 chars).
   - Structured instruction sections (Trigger, Purpose, Rules, Reference).
3. **Review & Edit Affordance**: User is presented with a full scrollable preview of the generated skill and can choose:
   - `Instalar`: Writes to `~/.config/opencode/skills/<name>/SKILL.md`.
   - `Regenerar`: Provides feedback to the coordinator to refine.
   - `Descartar`: Aborts without writing any file.

### 4.3 Coordinator Execution Model

- **Ephemeral Session Architecture**:
  The coordinator executes queries in short-lived, dedicated OpenCode sessions (`client.session.create({ title: "[Agent Suite] Coordinator Task" })`).
- **Tool Permissions**:
  The coordinator session runs with **read-only / no execution tools** (`tools: {}` or explicitly restricted) during prompt authoring and skill generation, ensuring that the model cannot invoke external tools or modify files behind the scenes.
- **Fail-Closed Verification**:
  All generated content is treated as untrusted draft data until explicitly committed by the human user.

---

## 5. Architectural Approaches & Comparison

### Approach A: Monolithic Multi-Feature Injection (All-at-once)
Implement visual polish, skill manager, coordinator configuration, AI authoring, and URL ingestion in a single large changeset.
- **Pros**: All features available simultaneously.
- **Cons**: Massive blast radius (>1,500 lines); impossible to review safely under the 400-line budget; high regression risk in existing core tests.
- **Effort**: High.

### Approach B: Layered Pure-Core First, Then Screens (Component-by-Component)
Build all core helpers across all domains (skills, sessions, coordinator config), then rewrite screens.
- **Pros**: Core modules are fully tested before UI.
- **Cons**: UI integration remains blocked until late; slices lack vertical end-to-end user verifiability.
- **Effort**: Medium-High.

### Approach C: Vertical Force-Chained Delivery Slices (Recommended)
Divide the change into 5 tightly scoped, independently verifiable and reviewable slices (each <= 400 lines of diff), adhering strictly to Red-Green-Refactor TDD.

| Slice | Scope & Deliverable | Approx Lines | Verification Gate |
|---|---|---|---|
| **Slice 1: Visual Polish & Core Config Schema** | • Yellow `Finalizar` shortcut.<br>• Blue labels & bright white values in `FieldRow`.<br>• Translucent search input in Catalog.<br>• `SuiteConfig.coordinator` schema parsing & validation in `core/config.ts` & `core/types.ts`. | ~180 lines | Vitest unit tests for config parser, visual token tests, keyboard navigation tests. |
| **Slice 2: Coordinator Settings & Model Discovery** | • Settings entry on Landing (`⚙ CONFIGURACIÓN`).<br>• Provider -> Model -> Effort 3-step selector screen.<br>• Red/Green configuration status indicator.<br>• Explanatory copy & recommended models list. | ~280 lines | Unit tests for Settings navigation, controller `setCoordinatorModel`, and status presentation. |
| **Slice 3: Real Skill Management & Selection** | • Discovered skill catalog reader (`client.app.skills()` + local paths).<br>• Installed skills browser & multi-select picker in Modify / Create.<br>• Skill removal and attachment workflows. | ~290 lines | Mock SDK skill discovery tests, TUI picker interaction tests. |
| **Slice 4: AI Authoring Assistant & Ephemeral Runner** | • Dedicated Ephemeral Coordinator Runner (`core/coordinator.ts`).<br>• "Asistir con IA" dialog for Description and Operations.<br>• Friendly "Configuración requerida" guard dialog when unconfigured.<br>• Diff preview and Accept / Discard flow. | ~350 lines | Mocked session/prompt tests, gating tests, prompt generation tests. |
| **Slice 5: Safe Skill Creation & Ingestion Engine** | • AI Skill Generator (prompt to SKILL.md).<br>• Safe URL Skill Ingestion (HTTPS fetch, sanitization, path traversal defense).<br>• Pre-installation review & confirmation dialog. | ~340 lines | URL validator tests, malicious payload rejection tests, SKILL.md writer tests. |

---

## 6. Concrete Product Questions & Plain-Language Decision Gaps for Proposal

During the upcoming Proposal phase, the following architectural and UX choices should be clarified:

1. **Default Skill Installation Target**:
   - *Question*: When a new skill is generated or imported from a URL, should it be installed **globally** in `~/.config/opencode/skills/<name>/` (available across all projects) or **project-locally** in `.opencode/skills/<name>/` (only active in the current workspace)?
   - *Recommendation*: Default to global (`~/.config/opencode/skills/`) with an option or toggle to choose workspace-local.

2. **Coordinator Recommended Models**:
   - *Question*: Which models should be highlighted as "Recomendados" in the configuration screen?
   - *Recommendation*: Highlight `anthropic/claude-3-7-sonnet`, `openai/gpt-4o`, and `google/gemini-2.5-pro` as proven high-capability reasoning models for prompt engineering and skill authoring.

3. **URL Import Sources**:
   - *Question*: Should URL skill ingestion support raw GitHub/Gist URLs, generic HTTP(S) URLs, or also git repository cloning?
   - *Recommendation*: Start with raw HTTP(S) / GitHub raw markdown files to avoid heavy git dependencies and keep network transactions lightweight and atomic.

4. **Landing Screen Hierarchy**:
   - *Question*: How should the settings entry appear on the Landing screen?
   - *Recommendation*: Add a 3rd top-level option on Landing (`1. CATÁLOGO`, `2. CREAR AGENTE`, `3. ⚙ CONFIGURACIÓN`) plus a dedicated hotkey (e.g. `F4` or `C`), keeping it clean and accessible.

---

## 7. Risks & Mitigations

1. **Host Without AI Provider Connected**:
   - *Risk*: A user opens Suite de Agentes in an environment with no API keys or local LLMs configured.
   - *Mitigation*: The plugin strictly decouples AI assistance from core operations. All core features (viewing, organizing, assigning models, manual skill typing, editing operations) continue to function 100% offline with zero errors.
2. **Slow or Interrupted LLM Generation**:
   - *Risk*: AI assistance in TUI blocks the terminal UI thread while streaming or generating.
   - *Mitigation*: Asynchronous session execution with OpenTUI `busy` indicator and cancellation support (Escape / Cancel).
3. **Prompt Injection via Skill URLs**:
   - *Risk*: Malicious third-party markdown contains instructions to trick orchestrators or overwrite sensitive files.
   - *Mitigation*: Schema validation, pure markdown parsing, path traversal prevention, and mandatory human review before filesystem write.
4. **Context & Review Line Budget**:
   - *Risk*: Large changesets exceed the 400-line review budget.
   - *Mitigation*: Strict force-chained slicing (Slices 1–5), keeping each work unit independent, focused, and test-backed under Strict TDD.

---

## 8. Conclusion & Ready for Proposal

The exploration confirms that:
- OpenCode Plugin SDK 1.18.5 and `@opencode-ai/sdk` expose all necessary primitives (`client.app.skills`, `client.session.create`, `client.session.prompt`, `api.state.provider`).
- The existing codebase architecture cleanly separates pure core logic (`src/core`), TUI controllers and screens (`src/tui`), and server hooks (`src/server`).
- The feature can be delivered safely through 5 force-chained slices under Strict TDD with clear trust boundaries and zero regressions to non-AI workflows.

**Status**: Ready for Proposal (`sdd-propose`).
