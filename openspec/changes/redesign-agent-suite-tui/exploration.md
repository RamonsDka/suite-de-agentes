# Exploration: Redesign Suite de Agentes TUI

> Phase artifact for SDD change `redesign-agent-suite-tui` (hybrid store).
> Scope: research/planning only — no source edits, builds, tests, installs, commits, or PRs.
> Canonical implementation lives in `source/revision-selector-agente`; this collection workspace is read-only reference. All plugin behavior changes MUST be implemented in the canonical source repo.
> `openspec/revision-selector-agente/` is preserved untouched.

## Quick path

1. Read the current TUI (`src/tui/index.tsx`, `dialogs.tsx`, `host-compat.ts`) and core data model (`core/types.ts`, `suites.ts`, `config.ts`).
2. Compare the current dialog-based flow against the seven-point image-based product brief.
3. Recommend a feasible OpenTUI/Solid architecture inside the existing host-compat contract.

## Exploration: Redesign Suite de Agentes TUI

### Current State

The plugin is `opencode-agent-suite` v0.1.0, a TypeScript ESM OpenCode plugin. Stack: Node 24, Solid/OpenTUI 0.4.5, OpenCode Plugin 1.18.5, tsup 8.5.1, Vitest 4.1.6. The TUI entry is `src/tui/index.tsx` (506 lines); server entry is `src/server/index.ts`. Core logic is pure and host-agnostic (`src/core/*`, 9 modules).

**TUI architecture today is entirely dialog-driven.** Every screen is a host `DialogSelect` / `DialogAlert` / `DialogPrompt` / `DialogConfirm` rendered via `api.ui.dialog.replace(...)`. There is no custom layout surface, no centered panel, no grid, no chips, no in-TUI boxes beyond a single sidebar text label. Navigation is a sequential promise-chain of `selectValue`/`confirmValue`/`showAlert` calls — linear, modal, one dialog replaces the previous.

**Screens / state / navigation today:**

1. **Root** (`openSuite`) — DialogSelect with exactly two options: "Catálogo" and "Crear agente". Title is `Suite de Agentes · v0.1.0`. No third option, no version line as its own element (embedded in the dialog title string).
2. **Catalog** (`showCatalog`) — DialogSelect listing agent IDs sorted alphabetically. Each option description packs state + model + "Detalles · permiso por turno" into a single text string. Two seed members (`general`, `agent-especialit-github`) plus custom agents. Empty state → DialogAlert.
3. **AgentModelSelector** (`showAgentModelSelector`) — after catalog selection, immediately opens a DialogSelect of all `provider/model` options with current model marked `✓`. Last option is "Más acciones…" (value `__more__`).
4. **Effort selector** — only if the chosen model exposes `variants`, a second DialogSelect lists "Predeterminado" + enabled variant IDs. Marked `✓` when same current model + current variant.
5. **Agent detail** (`showCatalogDetails`) — a DialogAlert titled with the agent ID whose message is a multi-line text blob (state, model, effort, skills, consent, description). "Más acciones…" routes here.
6. **Catalog actions** (`showCatalogActions`) — DialogSelect of "Materializar" (custom & not enabled only), "Eliminar" (custom only), "Volver". Seed members only get "Volver".
7. **Create agent** (`createCustomAgent`) — linear chain of DialogPrompt (id → description → model-select → prompt) + a loop of skill DialogSelects + confirm + optional global materialization confirm. No model search, no skill multi-select grid.

**Existing dialogs** (`dialogs.tsx`, 34 lines): thin promise wrappers over the four host dialogs. `selectValue`/`promptValue`/`confirmValue`/` showAlert` settle once and clear the dialog.

**Host compatibility** (`host-compat.ts`, 12 lines): `safeSlotRender` swallows "No renderer found" silently; other errors logged once per slot label. `safeHostAction` wraps registration (keymap, slash, slot). The `tui` plugin registers a keymap layer (Alt+S, priority 110), a slash command (`/agent-suite`), and a `sidebar_content` slot rendering a single muted text line.

**Data model** (`core/types.ts`): `AgentCatalogRow { id, membership: "seed"|"custom", enabled, model?, skills[], consent, description?, variant? }`. `SuiteConfig { version:1, customAgents, modelAssignments, variantAssignments }`. Catalog is built synchronously by `buildSuiteDeAgentesCatalog` from runtime `config.agent` + persisted custom agents + assignments. Validation in `config.ts`: ID `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`, model `provider/model`, variant `^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$`.

**Tests** (11 files in `test/`): `tui-registration.test.ts` (309 lines) is the TUI contract — `dialogHost()` mock fakes `api.ui` Dialog components; asserts root options, catalog options, action options, model/variant selection, mark-current, persistence, materialization, host-fallback safety, effort-cancel-no-persist. `host-compat.test.ts` asserts version labels and exactly two root options. `dialogs.test.ts` asserts the adapter routes to the four host dialogs.

### Affected Areas

- `source/revision-selector-agente/src/tui/index.tsx` — owns all screens/navigation; the redesign center of gravity. Root, catalog, model/effort selectors, detail, actions, create-agent all live here.
- `source/revision-selector-agente/src/tui/dialogs.tsx` — the dialog adapter every screen depends on; a richer surface may need new helpers (grid render, chips, confirm-with-explicit-yesno).
- `source/revision-selector-agente/src/tui/host-compat.ts` — safe-fallback wrapper; a new custom layout surface must stay inside `safeSlotRender`/`safeHostAction` so host failures still degrade safely.
- `source/revision-selector-agente/src/core/types.ts` — catalog row may need new fields (display category/tags) to support a grid + chips.
- `source/revision-selector-agente/src/core/suites.ts` — `buildSuiteDeAgentesCatalog` may need category/tag derivation if the grid groups by General/Diseño/Investigador.
- `source/revision-selector-agente/test/tui-registration.test.ts` — the contract test fakes `api.ui` dialogs; new screens need new fake/render assertions. Strict TDD is active — RED-GREEN-REFACTOR in the canonical repo.
- `source/revision-selector-agente/test/host-compat.test.ts` — asserts exactly two root options; expands if the frame/version surface changes.
- `source/revision-selector-agente/README.md` — "exactly two options" and dialog descriptions will need updating to match a graphical frame.

### Current Features vs Image-Based Brief (gap analysis)

| # | Brief requirement | Current state | Gap |
|---|---|---|---|
| 1 | Large centered landing panel "SUITE DE AGENTES", separate CATÁLOGO + CREAR AGENTE actions, visible version | DialogSelect titled `Suite de Agentes · v0.1.0` with two options; version only in dialog title and sidebar text | No large panel/frame, no centered layout, no standalone version element — only a native host dialog |
| 2 | Catalog screen: spacious, organized matrix/grid list of agents (General, Diseño, Investigador, Más…) | DialogSelect flat list of agent IDs, sorted alphabetically; no categories, no grid, one-line compact description | No grouping, no grid, no "Más…" affordance at catalog level |
| 3 | Agent detail screen "INFO DEL AGENTE": name, description, skill tags/chips, operations/instructions, Modify and Delete | DialogAlert with multi-line text blob; actions live in a separate `showCatalogActions` select | No structured detail screen, no chips, no inline Modify/Delete buttons; actions are a follow-up select |
| 4 | Modify → model selector; model → effort selector (default, none, low, high, xhigh, max) when supported | Model selector exists (`showAgentModelSelector`); effort selector appears only when model has `variants` | Exists but effort names come from runtime `variants` keys, not the fixed set {default,none,low,high,xhigh,max}; reached by selecting a model, not a "Modify" affordance |
| 5 | Delete opens explicit yes/no warning confirmation | Delete exists behind `confirmValue` (host DialogConfirm, which is a yes/no) with a Spanish message | Functionally present but framed as a confirm dialog reached via an actions select, not an explicit cautionary yes/no modal from the detail screen |
| 6 | Create Agent → custom-agent creation options | `createCustomAgent` linear dialog chain (id, description, model, prompt, skills loop, confirm, materialize) | Present but is a prompt chain, not "options" and not a structured creation surface |
| 7 | More graphical/structured look, larger primary frame, explicit discoverable navigation, responsive degradation, keyboard focus, contrast/accessibility, host compatibility | Entirely native host dialogs; one muted sidebar text line; no custom frame; host-compat safe-fallback exists | No graphical frame, no responsive logic (OpenTUI dialog handles layout), no explicit keyboard-focus design, no contrast/accessibility consideration beyond host defaults |

**Key distinction:** items 4 (partial), 5, 6 already exist as dialog flows. The brief is primarily a **visual/structural redesign** — moving from sequential native dialogs to a graphical, framed, grid-based, chip-bearing surface — plus adding explicit category grouping (1, 2, 3, 7) and surfacing the fixed effort vocabulary (4).

### Approaches

1. **In-place dialog enrichment** — keep the dialog-driven architecture; enhance option descriptions, add category prefixes to titles, add a "Más…" pseudo-option at catalog level, present effort as the fixed set.
   - Pros: Smallest boundary; existing tests stay mostly valid; zero new OpenTUI surface risk; host-compat unchanged.
   - Cons: Cannot deliver the "large centered panel," grid, chips, or graphical frame the brief shows; only approximates the brief inside a native select dialog; does not satisfy requirement 7's graphical look.
   - Effort: Low

2. **Custom OpenTUI/Solid layout surface with dialog fallback** — render a real framed layout (root panel, catalog grid, detail screen, create screen) inside an OpenTUI slot/panel using Solid components (`<box>`, `<text>`, grid primitives); keep host dialogs as a degraded fallback only when the renderer/custom surface is unavailable (extend `host-compat.ts` safe-fallback).
   - Pros: Delivers the full visual brief — large centered frame, grid catalog with categories, chips, inline Modify/Delete, explicit yes/no delete modal, visible version; matches "more graphical/structured look"; keyboard focus and contrast become first-class because the surface is owned code.
   - Cons: Largest boundary; touches all three TUI files plus likely core types for categories/tags; new rendering path needs new host-compat guards and new tests; risk of breaking the known-safe host-fallback the tests currently pin; OpenTUI dialog adapters (`dialogs.tsx`) may need augmenting for in-surface modals (yes/no) vs host dialogs.
   - Effort: High

3. **Hybrid: framed root + catalog grid, dialogs for detail/create/modify** — own only the top two surfaces (large centered root panel with version, and a grid-style catalog with categories + "Más…") as real OpenTUI components; keep detail, model/effort, create, and delete-confirm as the existing host dialogs (enhanced). The root and catalog are where "graphical/structured" matters most per the brief; the rest stays dialog-based and low-risk.
   - Pros: Delivers the two most visible brief items (1, 2) with a framed custom surface; keeps the host-safe detail/modify/create/delete flows intact and tested; medium boundary; effort selector can map runtime variants to the fixed vocabulary as a pure core change independent of rendering.
   - Cons: Detail screen (3) is still a text dialog, not a structured "INFO DEL AGENTE" screen with chips; the brief's inconsistency between "structured detail" and "low risk" is not fully resolved — a stated tradeoff.
   - Effort: Medium

### Recommendation

**Approach 3 (Hybrid), implemented in the canonical source repo under strict TDD.** Rationale:

- It delivers the brief's headline visual changes (large centered root frame, version element, grid catalog with categories, "Más…") as owned OpenTUI/Solid components where the payoff is highest.
- It preserves the proven host-safe behavior for detail, modify, create, and delete, keeping the blast radius and test churn bounded. The current `safeHostAction`/`safeSlotRender` contract is the single most important invariant (the tests pin it); expanding it is safe, rewriting wholesale is not.
- It keeps the effort-vocabulary change (4: default/none/low/high/xhigh/max) as a pure core concern — a mapping layer in `core/suites.ts` or `core/config.ts` that derives/canonicalizes variant IDs — fully testable without any TUI changes and TDD-friendly.
- Architecture-guard evidence: the codebase already separates pure core from TUI from host-compat; the smallest boundary consistent with that convention is "new OpenTUI components for root+catalog, core mapping for effort vocabulary, dialogs stay for the rest." This does not invent a new framework layer.

Two open clarifications the orchestrator should resolve with the user before proposal (per architecture-guard "surface an assumption when repository evidence is incomplete"):

- **Category source of truth:** the brief names General/Diseño/Investigador/Más. Today catalog rows carry no category. Should categories be (a) derived from agent ID/name heuristics, (b) a new persisted `category` field on `CustomAgent` + a seed-mapping, or (c) purely visual grouping labels? This changes core types and persistence.
- **Effort vocabulary vs runtime variants:** the brief's fixed set {default,none,low,high,xhigh,max} conflicts with the current design that surfaces runtime `variants` keys verbatim. Should the fixed set override runtime keys, map to them, or only apply when the model exposes effort-like variants? This is a behavior decision, not just rendering.

### Risks

- **Host-compat regression**: introducing a custom rendering surface can break the safe-fallback that `host-compat.test.ts` and `tui-registration.test.ts` pin. Mitigation: every new owned surface routes through an extended `safeSlotRender`/`safeHostAction` and gets a no-renderer degradation test mirroring the existing one.
- **OpenTUI API surface uncertainty**: the brief assumes layout primitives (grid, chips, framed panels). The current code only uses `DialogSelect`/`DialogAlert` dialog APIs and a single `<box>`/`<text>` sidebar slot. Whether OpenTUI 0.4.5 exposes the needed layout components inside a plugin TUI surface (vs only in a slot) is unverified from this read-only collection; the canonical repo's `@opentui/solid` type declarations must be inspected before committing to Approach 3 in design. CodeGraph is unavailable here and no `.codegraph` index exists at source either — bounded filesystem inspection of `node_modules/@opentui` in the canonical repo is the verification step.
- **Scope creep**: the brief spans seven points and a "graphical redesign"; without the category + effort clarifications, the change can balloon. Mitigation: resolve the two clarifications first; treat the rest as visual-only.
- **Strict TDD in canonical repo only**: tests cannot run in this collection. Implementation must happen in `source/revision-selector-agente` (or its canonical origin) where `npm test`/`typecheck`/`build` are available.
- **Persistence format extension**: adding a `category` field changes `SuiteConfig` and `parseSuiteConfig`, which currently rejects unknown fields. Any persisted-shape change must extend the parser's allowlist and migration path or it will throw on load.

### Ready for Proposal

**Yes** — pending the two clarifications above. The orchestrator should tell the user:

> Exploration is complete. The current TUI is a sequence of native host dialogs with no custom layout; the brief asks for a graphical framed redesign. Recommended approach: a hybrid that owns the root panel + catalog grid as OpenTUI/Solid components and keeps detail/modify/create/delete as host dialogs, with the effort vocabulary as a pure core mapping. Before drafting the proposal, confirm: (1) where agent categories come from (heuristic vs persisted field vs pure labels), and (2) how the fixed effort set {default,none,low,high,xhigh,max} relates to runtime model `variants`. Implementation will run under strict TDD in the canonical source repo, not in this read-only collection.
