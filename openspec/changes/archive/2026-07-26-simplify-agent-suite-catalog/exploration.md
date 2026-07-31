# Exploration — simplify-agent-suite-catalog

## Topic

Simplify the Suite de Agentes OpenCode plugin so its Alt+S window contains only **Catálogo** and **Crear agente**. Drop the suites / model-profile / per-suite CRUD surface from the product and TUI. The catalog must list only members of "Suite de Agentes" — initially `general`, `agent-especialit-github`, and any agent the user creates through this plugin — and must exclude `gentle-orchestrator`, every `sdd-*`, every `review-*`, every `jd-*`, all `*-fallback`, and any other runtime agent not owned by this plugin. The orchestrator must still select/invoke agents from this independent suite with explicit current-turn consent safety preserved. UI must follow the supplied Spanish sketch (compact, scrollable, plugin version at the bottom) rather than a flat debug-style list. Existing SDD model profiles (`~/.config/opencode/.opencode/sdd-models.jsonc`) remain untouched.

## Current State

The plugin (`opencode-agent-suite` v0.1.0) installs two entries:
- Server: `C:\Users\DELL\projects\0.-MEJORA-OPENCODE-TRABAJANDO\revision-selector-agente\dist\server.js` (registered in `~/.config/opencode/opencode.json` `plugin[]`).
- TUI: same `dist/tui.js` (registered in `~/.config/opencode/tui.json` `plugin[]`).

Today the Alt+S window presents 4 menu shapes layered together (catalog + every suite + Create suite + Create custom agent), and the catalog itself is built from `api.state.config.agent` — i.e. the live OpenCode global agent map, which in the current install contains `general`, `gentle-orchestrator`, all `sdd-*` + `*-fallback`, all `review-*` + `*-fallback`, all `jd-*` + `*-fallback`, plus many hidden ones. That is the exact noise the user wants gone.

### Code map (evidence inspected)

- `src/tui/index.tsx:120` `openSuite()` — the root menu; today it emits `catalog`, every persisted suite (e.g. `default`, `balanced`), `create-suite`, `create-agent`. This is the surface that must shrink to two options.
- `src/tui/index.tsx:113` `showCatalog()` — uses `buildAgentCatalog(runtimeAgents(api), config.customAgents)`; the rows include every `api.state.config.agent` entry because `runtimeAgents(api)` returns `api.state.config.agent ?? {}`. That is the contamination point.
- `src/core/suites.ts:30` `buildAgentCatalog()` — flattens runtime + custom; consent is inferred only from a `sdd-` prefix. It has no concept of "Suite de Agentes membership".
- `src/core/suites.ts:10-27` `createSuite / addSuiteAssignment / updateSuiteAssignment / removeSuiteAssignment / deleteSuite` — pure functions over `SuiteConfig`. Used only from `src/tui/index.tsx` to render and mutate suites; the server never reads or writes them.
- `src/core/config.ts:51` `mergeAgentModels()` — merges suite `agents: {id→model}` into the runtime config; this is the only side effect of "Activate suite …" and exists to apply the model-profile layer the user is removing.
- `src/core/persistence.ts:7-8` `defaultSuitePath()` — `~/.config/opencode/agent-suite/suites.json`. The active install has a v1 file there with only the `default` suite and no custom agents (verified by reading the file).
- `src/core/types.ts:14-20` — `SuiteConfig { version:1; activeSuite; suites; customAgents }`. The `suites` and `activeSuite` fields exist solely to support the removed model-profile UX.
- `src/tui/index.tsx:53-82` `showSuiteDetail()`, `:84-89` `createNewSuite()`, `:32-40` `activateSuite()`, `:47-51` `editAssignment()` — all suite CRUD; no callers outside this file.
- `src/tui/index.tsx:162` — sidebar slot still says `Suite de Agentes · Alt+S`; acceptable but does not yet show the plugin version.
- `src/server/index.ts` and `src/core/policy.ts` — server gating, consent ledger, and SDD allowlist. Independent of the TUI surface; the current-turn consent contract (`usa también agente: <id>` + native AgentPart materialization in `chat.message` + per-target `tool.execute.before` check) is preserved.
- `~/.config/opencode/opencode.json` — global agent inventory. Contains `general`, `gentle-orchestrator`, plus 24+ other runtime agents (10 `sdd-*` + 10 `*-fallback`, 4 `review-*` + 4 `*-fallback`, 4 `jd-*` + 4 `*-fallback`). This is the source `buildAgentCatalog` is leaking from.
- `~/.config/opencode/agent/agent-especialit-github.md` — exists as a global agent markdown (description label `Agent-especialit-GitHub`). The identifier the user uses is exactly `agent-especialit-github`; the existing global file must remain registered (do NOT delete or modify it — `.atl`, `.codegraph`, and global config are off-limits).
- `~/.config/opencode/.opencode/sdd-models.jsonc` — SDD model-profile file, declared out of scope. Do not touch.
- Installed bundle path (must keep producing matching bundles): `dist/tui.js` and `dist/server.js`. `tsup.config.ts` already builds both entries; no change needed there.

### Existing test owners (Vitest, 24 tests, 11 files, all passing)

- `test/suites.test.ts` — exercises `createSuite / addSuiteAssignment / updateSuiteAssignment / removeSuiteAssignment / deleteSuite`. Must shrink alongside the removed code (the user explicitly asked to remove suite management).
- `test/config.test.ts` — covers `parseSuiteConfig`, `validateAgentId`, `mergeAgentModels`. The first two stay (they still validate the persisted config shape for `customAgents`). `mergeAgentModels` is a leaf test for the deleted feature; remove it.
- `test/persistence.test.ts` — round-trips `loadSuiteConfig / saveSuiteConfig`. Persisted shape must keep `version`, `customAgents` and add whatever the new minimal shape is; test must follow.
- `test/agents.test.ts`, `test/agent-markdown.test.ts` — cover global materialization + markdown generation. Both stay (the user wants to keep `Crear agente`).
- `test/consent.test.ts`, `test/policy.test.ts`, `test/server.test.ts` — gating / consent / server. All stay unchanged.
- `test/tui-registration.test.ts` — covers `registerSuiteKeymap` / `registerSuiteSlashCommand`. Stays; the layer registration is unchanged.
- `test/dialogs.test.ts`, `test/host-compat.test.ts` — adapter layer. Stay unchanged.
- No dedicated test exists for `buildAgentCatalog` or `showCatalog`. After narrowing, both must have at least one cohesive catalog test (TDD red→green) so the new membership contract is locked in.

## Affected Areas

- `src/tui/index.tsx` — primary rewrite surface. `openSuite()` shrinks to two options; `showCatalog()` becomes scrollable, with detail + actions per row; sidebar slot adds the plugin version footer; remove `activateSuite`, `showSuiteDetail`, `editAssignment`, `createNewSuite`. Keep `createCustomAgent` as the `Crear agente` flow. Keep `registerSuiteKeymap` / `registerSuiteSlashCommand` so Alt+S and `/agent-suite` still bind to the same opener. Likely export `PLUGIN_VERSION` from a small `src/version.ts` (sourced from `package.json#version` via a Vite-style `?raw` import or simply duplicated constant; pick whichever matches the existing build — tsup needs `define` to inline `__VERSION__`, so the simplest safe choice is a constant `PLUGIN_VERSION = "0.1.0"` mirrored from `package.json#version`).
- `src/core/suites.ts` — `buildAgentCatalog` becomes the membership filter: given the runtime agent map and custom agents, return rows whose `id` is in the Suite de Agentes membership set OR was created by this plugin (custom). The `SuiteConfig` shape becomes `{ version: 1; customAgents }` (drop `activeSuite`, `suites`). Delete `createSuite / addSuiteAssignment / updateSuiteAssignment / removeSuiteAssignment / deleteSuite / AgentSuite` and `SUITE_ID`/related helpers.
- `src/core/types.ts` — drop `AgentSuite`, drop `suites` and `activeSuite` from `SuiteConfig`. `AgentCatalogRow` adds `membership: "seed" | "custom"` and `enabled` (whether `api.state.config.agent[id]` exists today) so the catalog can show whether a custom agent needs to be materialized.
- `src/core/persistence.ts` — `loadSuiteConfig` / `saveSuiteConfig` / `defaultSuitePath` keep the same path (`~/.config/opencode/agent-suite/suites.json`) but accept/return the trimmed shape. No automatic migration is required — `parseSuiteConfig` should validate and throw on legacy shapes (the user has an empty `default` suite today; nothing to migrate). On first write after the change, the new shape replaces the old.
- `src/core/config.ts` — drop `mergeAgentModels` (no longer called). Keep `parseSuiteConfig`, `validateAgentId` (still used by `createCustomAgent`).
- `src/server/index.ts` — no changes. The hook chain still reads `api.state.config.agent` keys (which is how the plugin learns what agents OpenCode knows about, including custom agents the plugin materialized). The new TUI is the only consumer; the server is unaffected.
- `src/core/policy.ts` — no changes. `SDD_ORCHESTRATOR`, `SDD_AGENT_ALLOWLIST`, `decideTaskGate`, `transformTaskPermission` all stay. The orchestrator still needs explicit current-turn consent for non-SDD Suite de Agentes members (e.g. `agent-especialit-github`).
- `test/suites.test.ts` — replace with a catalog-focused test file (or split into `test/catalog.test.ts` and `test/persistence.test.ts` updated shape). Remove suite-CRUD tests.
- `test/config.test.ts` — keep `validateAgentId` test; drop `mergeAgentModels` test; keep `parseSuiteConfig` test but update fixture to the new shape.
- `test/persistence.test.ts` — update fixture to the trimmed `{ version, customAgents }` shape.
- Add `test/catalog.test.ts` — RED→GREEN for the membership contract: seed set (`general`, `agent-especialit-github`), runtime excludes `gentle-orchestrator`, `sdd-*`, `review-*`, `jd-*`, `*-fallback`; custom always included; deterministic order; consent reflects SDD/non-SDD correctly.
- `docs/architecture.md`, `docs/local-install.md`, `README.md` — describe the new shape: the catalog is the Suite de Agentes (a small seed list + custom agents), the Alt+S menu has two options, and the SDD model-profile file remains untouched. Examples are already only relevant to custom agents; keep `examples/suites.json` removed/repurposed.
- `examples/suites.json` — replace with an empty example or remove it; today it carries a `suites`/`activeSuite` shape that will no longer exist.

### What can be deleted (concrete)

- `src/core/suites.ts`: `createSuite`, `addSuiteAssignment`, `updateSuiteAssignment`, `removeSuiteAssignment`, `deleteSuite`, `SUITE_ID` regex, `suiteName`, `getSuite`, `modelID`, `clone`, `AgentSuite` (from `types.ts`).
- `src/tui/index.tsx`: `activateSuite`, `showSuiteDetail`, `editAssignment`, `createNewSuite`. Imports from `../core/suites.ts` shrink to only `buildAgentCatalog`.
- `src/core/config.ts`: `mergeAgentModels`, `MergedRuntimeConfig`.
- `src/core/types.ts`: `AgentSuite`; `SuiteConfig.activeSuite` and `SuiteConfig.suites`.
- `test/suites.test.ts` entire file (replaced by `test/catalog.test.ts`).
- `test/config.test.ts` "merges models while preserving unrelated runtime config" test.
- `examples/suites.json` (or repurpose to `examples/custom-agents.json`).
- README sections: "What it manages" mentions named suites mapping agents → models; collapse to a single paragraph describing the catalog + custom agent creation.
- `docs/architecture.md` paragraph about `mergeAgentModels` / config transformation (the SDD-model-profile section in `~/.config/opencode/.opencode/sdd-models.jsonc` is unaffected and must be called out as such).

### Persisted-config migration impact

The current install's `~/.config/opencode/agent-suite/suites.json` is:

```json
{ "version": 1, "activeSuite": "default", "suites": { "default": { "agents": {} } }, "customAgents": {} }
```

The new shape is `{ version: 1; customAgents: {} }`. Because the user has no custom agents and no model assignments, **no automatic migration is needed**. Behavior:

- First write after the change: `saveSuiteConfig` validates through the new `parseSuiteConfig`; it will write the new trimmed shape, replacing the old file atomically (mode 0600, rename).
- If a user with real assignments upgrades, `parseSuiteConfig` MUST throw on legacy shapes and the TUI MUST surface a clear alert (e.g. "Legacy suite assignments were dropped. Re-create custom agents through Crear agente."). Do NOT silently lose user data; do NOT auto-migrate model assignments because the user is explicitly removing that feature.
- Default fallback when the file does not exist remains `{ version: 1, customAgents: {} }`.

### Exact testing owners (post-change)

- `test/catalog.test.ts` (new, RED→GREEN): proves seed membership + custom inclusion + ordering + consent labels.
- `test/config.test.ts` (trimmed): `validateAgentId`, `parseSuiteConfig` accepts the new shape and rejects legacy `{activeSuite, suites}`.
- `test/persistence.test.ts` (updated): round-trips the trimmed shape; rejects legacy shape on load.
- `test/agents.test.ts`, `test/agent-markdown.test.ts`: unchanged.
- `test/consent.test.ts`, `test/policy.test.ts`, `test/server.test.ts`: unchanged (orchestrator consent still rejects `gentle-orchestrator`'s task on Suite de Agentes agents without exact grant).
- `test/tui-registration.test.ts`: unchanged (Alt+S and `/agent-suite` still bind).
- `test/dialogs.test.ts`, `test/host-compat.test.ts`: unchanged.

## Approaches

### Option A — Surgical simplification in place (recommended)

- Replace `SuiteConfig.suites` with the trimmed `{ version, customAgents }` shape.
- Replace `buildAgentCatalog` with a `buildSuiteDeAgentesCatalog(runtimeAgents, customAgents, seed)` function whose `seed` is a small hard-coded list (`["general", "agent-especialit-github"]`) inside `src/core/suite-de-agentes.ts`. Excluded ids are matched by prefix/regex (`sdd-`, `review-`, `jd-`) and suffix (`-fallback`) plus the explicit denylist `{ "gentle-orchestrator" }`.
- Rewrite `openSuite` to render exactly two options; rewrite `showCatalog` to a scrollable list with detail actions (`Ver detalle`, `Materializar` if a custom agent is not yet global, `Eliminar` for custom agents only) and a footer showing `Suite de Agentes · v{PLUGIN_VERSION} · Alt+S`.
- Delete all suite CRUD files/functions/tests.
- Update persistence shape; old `suites.json` either loads cleanly (if empty) or throws a friendly alert in TUI.
- Effort: **Medium**. ~400-600 authored lines net change (≈350 lines removed, 150 added for the new TUI surface + footer).
- Pros: smallest coherent boundary; preserves server and consent contracts untouched; respects "do not touch .atl/.codegraph/global config"; gives the user exactly the two-option window + scoped catalog.
- Cons: the TUI re-write is the biggest single risk surface; needs a real test for the new `buildSuiteDeAgentesCatalog` and for the new `openSuite` menu shape (host-double test).

### Option B — Keep `SuiteConfig.suites` but never expose it

- Keep all suite CRUD code; just hide it from the Alt+S menu and read no suite assignments.
- Pros: smallest diff in code; zero risk of breaking the parser.
- Cons: violates the user's explicit "remove profiles/suites/model-profile management entirely from the product and TUI" — code would still exist and could resurface via a regression. Hard rule violation.

### Option C — Replace TUI with a brand-new host-rendered component

- Replace `DialogSelect` with a custom `DialogCatalog` that supports virtualized scrolling, multi-line descriptions, and a footer.
- Pros: best fidelity to the sketch (scrollable list, version footer).
- Cons: requires a richer host-rendered surface that the OpenTUI plugin contract does not document in this version; speculative; would add real risk without a proven host API. Reject.

## Recommendation

**Option A**, with the catalog expressed as a small pure function `buildSuiteDeAgentesCatalog(runtime, custom, seed)` colocated with the membership rules. Membership is determined by an explicit seed + a denylist (prefixes/suffixes/exact ids) so it is auditable in one file, easy to extend if the user later wants to add another seed agent, and easy to test. Keep server-side gating untouched. Add a thin `PLUGIN_VERSION` constant (mirrored from `package.json#version`) used by both the sidebar slot and the catalog footer. The TUI is rewritten around the new `DialogSelect` shapes the host already provides; the "scrollable list" requirement is satisfied by `DialogSelect`'s native list rendering (the current install already shows long option lists; verified by reading `src/tui/dialogs.tsx`).

## Risks

- **Membership drift**: hard-coding a seed of `["general", "agent-especialit-github"]` means a third seed requires a code change. Mitigate by exporting the seed from one named module and documenting it in `README.md`.
- **Sidebar footer regression**: adding a version footer to the sidebar slot could re-introduce the renderer-missing crash that already needs `safeSlotRender`. The slot already uses `ctx.theme.current.textMuted`; extend it with the version string and keep the `safeSlotRender` guard. The `host-compat.test.ts` already covers this path.
- **Legacy persisted file**: a user with non-empty `suites.json` would lose their assignments on first write if the parser silently coerces. Mitigate by `parseSuiteConfig` throwing on legacy keys (`activeSuite`, `suites`) and the TUI catching + alerting in Spanish.
- **Catalog "enabled" mismatch**: a custom agent created through `Crear agente` may exist in `customAgents` but not yet in `api.state.config.agent` if the user declined global materialization. The catalog row must distinguish "creado pero no materializado" vs "listo para usar" so the user knows whether to materialize. Surface this in the row's metadata.
- **Review-budget risk**: the TUI re-write touches the only host-double-tested file (none today — `tui-registration.test.ts` only tests layer registration, not menu shape). To stay within the 2000-line review budget and keep diffs reviewable, prefer 2 chained slices: (1) persistence/types/catalog core + tests, (2) TUI re-wire + sidebar footer. Each slice is independently verifiable with `npm test`, `npm run typecheck`, `npm run build`.
- **OpenCode SDK contract risk**: nothing in this change touches `chat.message`, `tool.execute.before`, or the SDK types, so the server contract is preserved by inspection. Tests prove it (`test/server.test.ts`, `test/policy.test.ts`, `test/consent.test.ts` all still pass unchanged).
- **Global `opencode.json` leakage**: do NOT modify the user's `opencode.json` or any global file. The plugin must continue to read from `api.state.config.agent` at runtime but never modify the inventory. `agent-especialit-github.md` is the user's global file — leave it alone.

## Ready for Proposal

**Yes.** The orchestrator can proceed to `sdd-propose`. Inputs the orchestrator should communicate to the user before proposal:

1. Confirm the seed list is exactly `["general", "agent-especialit-github"]` (no third seed at this time).
2. Confirm "remove profiles/suites/model-profile management entirely" means deleting `mergeAgentModels`, `createSuite`, `addSuiteAssignment`, `updateSuiteAssignment`, `removeSuiteAssignment`, `deleteSuite`, the `suites` and `activeSuite` fields of `SuiteConfig`, and the corresponding tests — i.e. full removal, not hidden.
3. Confirm no automatic migration: a legacy `suites.json` with real assignments will trigger a clear in-TUI alert on first load and offer no recovery (the user can re-create custom agents through `Crear agente`).
4. Confirm the 2-slice chained-PR strategy (core+persistence slice, then TUI slice) is acceptable; total authored change stays well within the 2000-line review budget with chained delivery.