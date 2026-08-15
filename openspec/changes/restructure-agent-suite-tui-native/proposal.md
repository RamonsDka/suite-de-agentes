# Proposal: Restructure Suite de Agentes TUI onto native host dialogs

## Intent

The custom OpenTUI/Solid screens shipped in `redesign-agent-suite-tui` (and patched in `fix-agent-suite-tui-runtime-bugs`) do not work in the real terminal: the dialog clips past the screen edge, the first option renders empty, Enter/click/exit do not respond, and this environment cannot exercise the OpenTUI renderer (native FFI unavailable), so custom-screen fixes are unverifiable blind patches. Meanwhile, the user's definitive hand-drawn diagram (Engram topic `sdd/restructure-agent-suite-tui-visual/target-diagram`) depicts exactly the aesthetic of OpenCode's **native host dialogs**: a framed box with a title, vertically stacked selectable options, divider lines, a scrollable list, and SI/NO confirmations. This change restructures the Suite flow onto the native dialog components (`DialogSelect` / `DialogAlert` / `DialogConfirm` / `DialogPrompt`) — the components that demonstrably work with keyboard, mouse, and Escape — matching the diagram's screens, wording, and flow exactly, and deletes the broken custom screen layer entirely.

## Clarifications

- **Authoritative reference set** (verified by the orchestrator): the user's hand-drawn diagram (Engram `sdd/restructure-agent-suite-tui-visual/target-diagram`) plus four user-provided files — `ERD_suite_agentes.mermaid` (data model), `flujo_suite_agentes.mermaid` (navigation flow), `informe_suite_agentes.md` (screen-by-screen report with 5 recommendations), and `mockup_tui_suite_agentes.html` (7-screen visual mockup: Principal, Catálogo, Info del Agente, Modelo IA, Nivel de Esfuerzo, Advertencia, Crear Agente). Where the earlier diagram reading and these files differ, the files win.
- The diagram's screens map one-to-one onto native dialogs; the legacy dialog functions (`openSuite`, `showCatalog`, `showCatalogDetails`, `showCatalogActions`, `showAgentModelSelector`, `createCustomAgent`, `confirmValue`) still exist in `src/tui/index.tsx` and already have working host-mock tests. This is a restructure of proven-working code, not a greenfield build.
- **Modificar scope is resolved** (informe §2.4 + recommendation 3): `Modificar` opens a native submenu that can edit everything the data model supports — `Modelo de IA`, `Nivel de esfuerzo`, and for custom agents also `Skills` and `Operaciones (instrucciones)`. Seed agents are runtime-owned: only model/effort are editable for them.
- **Operaciones stays a single text** (the custom agent's prompt) even though the ERD models `OPERACION` as 1:N; the mockup's own Info screen shows one operations text. Supporting multiple operations per agent would require a `SuiteConfig` schema change and migration — deferred explicitly.
- **The `Mas…` list entry disappears**: the informe's scrollbar expectation is satisfied by the host's native select scrolling, so no manual pagination or "more" cell exists.
- "Super amplio y grande" and dotted divider lines are decorative intent: the host controls `DialogSelect` sizing and does not expose custom divider widgets. The structural contract (title on top, stacked options, version visible, scroll on overflow) is delivered; pixel-level chrome is limited to what the host renders. This limitation is accepted by choosing native dialogs.
- The diagram's "Diseño / Investigador" agent names are illustrative examples, not data (established in the original redesign proposal).
- Version display follows the diagram and mockup titlebars: `v1.0.1` (bump `PLUGIN_VERSION` and `package.json` to match; the user wants visible version control for future improvements). Version applies to the whole suite (informe recommendation 5), shown in the first-screen title, the Crear agente flow title, and the sidebar label.
- Labels follow the diagram/mockup Spanish wording with normal capitalization: `Catálogo`, `Crear agente`, `Catálogo de agentes`, `Info del agente`, `Modificar`, `Eliminar`, `Advertencia`, `¿Desea eliminar el agente?`, `Sí`/`No`. All-caps in the drawing is emphasis, not literal copy.

## Scope

### In Scope

- **Primary screen (PRIMERA PANTALLA):** native `DialogSelect` titled `Suite de Agentes · v1.0.1` with exactly two stacked options — `Catálogo` and `Crear agente`.
- **AGENTES list:** native `DialogSelect` listing every catalog agent (seed + custom) with state/model/effort summary per option; native scrolling replaces the hand-rolled pagination and the "Mas…" cell.
- **INFO DEL AGENTE:** structured native detail (`DialogAlert`) in the diagram's field order — Nombre, Descripción, Modelo, Esfuerzo, Skills, Operaciones, Estado — followed by a native `DialogSelect` of actions: `Modificar`, `Eliminar` (custom agents only), `Volver`.
- **Seleccionar el modelo de IA:** native `DialogSelect` of `provider/model` options with the current model marked.
- **Seleccionar el nivel de esfuerzo (si lo permite):** native `DialogSelect` using the existing capability-driven `normalizeEffortOptions()` ordering — `default, none, low, high, xhigh, max` — only when the chosen model exposes supported variants.
- **Modificar (submenu):** a native `DialogSelect` offering `Modelo de IA`, `Nivel de esfuerzo`, and — for custom agents only — `Skills` and `Operaciones (instrucciones)`. Model/effort persist via the existing assignment path; skills/operaciones edit the custom agent record through the existing native prompt/select chains (skills multi-select loop, instructions prompt) and persist via the existing config path.
- **Eliminar:** native `DialogConfirm` — `Advertencia` / `¿Desea eliminar el agente?` — with Sí/No semantics (confirm = Sí); Sí removes, persists, and returns to the Catálogo; No returns to Info del agente without mutation (per `flujo_suite_agentes.mermaid`).
- **Crear agente:** keep the native prompt chain, reordered to the mockup's field order — Nombre (ID) → Descripción → Skills (multi-select loop) → Operaciones (instrucciones) → Modelo de IA → Nivel de esfuerzo (si lo permite) → confirmación → materialización opcional.
- **Deletion:** remove the custom OpenTUI screen layer — `src/tui/screens/{landing,catalog,detail,modify,create}.tsx`, `src/tui/screens/nav.ts`, `src/tui/layout.ts`, the `safeScreenMount` mount path, `deferScreenAction`, `resolveScreenBox`, and the now-redundant `Ctrl+Q` exit command — and their tests (`test/screens.test.tsx`, `test/catalog.test.ts`, `test/layout.test.ts`).
- **Registration simplification:** Alt+S and `/agent-suite` open the native flow directly (no custom-mount fallback branch); `host-compat.ts` keeps only what the sidebar slot and registration still need.
- **Version bump:** `PLUGIN_VERSION` and `package.json` to `1.0.1`.
- **Tests:** strict-TDD rewrite of the TUI test suite against the dialog host mock — first screen options, agent list content, info field order, action gating by membership, model/effort flow including "si lo permite" skip, delete confirm Sí/No semantics, version label `v1.0.1`.

### Out of Scope

- Editing skills/operaciones of **seed** agents (runtime-owned; only model/effort are editable there).
- Modeling `OPERACION` as a true 1:N list per the ERD (schema change + migration); operaciones remains the single prompt text.
- Editing an agent's name/description from `Modificar` (not requested by the flow files; create-time only).
- Pixel-exact chrome: dotted divider widgets, colored buttons, forced dialog dimensions, `[ MODIFICAR ]`-style button chrome — the host owns dialog rendering.
- `src/server/**`, consent/task-gating, `SuiteConfig` schema, persistence format, global materialization logic.
- Any further custom OpenTUI/Solid screen work.

## Capabilities

### Modified Capabilities

- `agent-suite-screens`: the owned custom-screen flow is **removed** and replaced by the native host-dialog flow (first screen, agentes, info, model, effort, modify, delete-confirm, create chain) with the diagram's structure and Spanish wording.
- `agent-catalog`: catalog presentation moves from the custom matrix back to the native select list with per-option state/model/effort summaries; data model unchanged.

### New Capabilities

- None.

## Approach

1. Strip the custom screen layer and its helpers from `src/tui/` (screens/, nav.ts, layout.ts, deferScreenAction, exit command) and make `openSuite` the single entry for Alt+S and `/agent-suite`.
2. Restructure the retained legacy dialog functions to the diagram's flow and wording: first screen → AGENTES → INFO DEL AGENTE (alert + actions) → Modificar (model → effort) / Eliminar (confirm) / Volver; keep `Crear agente` chain as-is.
3. Rebuild `catalogDetailMessage` into the diagram's field order (Nombre, Descripción, Modelo, Esfuerzo, Skills, Operaciones, Estado); Operaciones = custom agent prompt or runtime description.
4. Bump version to `1.0.1` (constant + package.json).
5. Rewrite the TUI tests against the existing `dialogHost()` mock with strict TDD (RED → GREEN → REFACTOR); delete custom-screen tests.
6. Run `npm test` + `npm run typecheck`; build only on explicit user authorization (same precedent as before); manual smoke test in a real terminal afterwards.

## Review Workload Forecast

Estimated changed lines: ~900-1,100 gross, but **deletion-dominant** (≈700 deleted custom-screen/test lines, ≈300-400 rewritten dialog-flow + test lines). Net reviewable new logic is small (~300 lines). 800-line budget risk: Medium (gross), Low (net new logic). Chained PRs recommended: No — one work-unit PR is reviewable because the bulk is mechanical deletion of a known-broken layer; tasks will flag a split if the test rewrite grows unexpectedly. Delivery strategy: auto-forecast (cached session choice).
