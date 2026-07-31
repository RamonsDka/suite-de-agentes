# Tasks: Simplify Agent Suite Catalog

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 500–700 authored lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 core/persistence/catalog; PR 2 TUI/footer/docs |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Minimal config, owned catalog, obsolete suite/profile removal | PR 1; base = feature/tracker branch | `npm test -- test/catalog.test.ts test/config.test.ts test/persistence.test.ts` | `npm test` core path; no external runtime | Revert `src/core/{types,suites,config,persistence}.ts`, `test/{catalog,config,persistence,suites}.test.ts` |
| 2 | Two-option TUI, footer, docs | PR 2; base = PR 1 branch | `npm test -- test/host-compat.test.ts test/tui-registration.test.ts` | OpenCode Alt+S: `Catálogo`/`Crear agente`, fallback renderer | Revert `src/tui/index.tsx`, `src/version.ts`, docs/examples only |

## Phase 1: Core RED tests

- [x] 1.1 RED: extend `test/config.test.ts` for `{version, customAgents}`, invalid/seed-duplicate IDs, Spanish rejection of non-empty legacy assignments, and remove merge assertions.
- [x] 1.2 RED: extend `test/persistence.test.ts` for empty-legacy replacement, atomic minimal round-trip, and byte preservation after failed validation/write.
- [x] 1.3 RED: create `test/catalog.test.ts` proving seed∪custom allowlist, excluded runtime IDs, absent-seed `enabled:false`, deterministic order, and explicit-current-turn labels.

## Phase 2: Core GREEN/REFACTOR

- [x] 2.1 GREEN: trim `SuiteConfig` in `src/core/types.ts`; add catalog `membership`/`enabled` fields and `SUITE_DE_AGENTES_SEED`/`buildSuiteDeAgentesCatalog` in `src/core/suites.ts`.
- [x] 2.2 GREEN: update `src/core/config.ts` and `src/core/persistence.ts` for minimal defaults, legacy split, validation-before-atomic-write; delete CRUD, `mergeAgentModels`, and `MergedRuntimeConfig`.
- [x] 2.3 REFACTOR: remove `test/suites.test.ts` and all callers/imports of deleted suite/profile behavior; preserve server/policy/consent files unchanged.

## Phase 3: TUI RED→GREEN→REFACTOR

- [x] 3.1 RED: adapt `test/host-compat.test.ts` and existing TUI host doubles for exactly two Spanish root options, empty-state alert, scrollable catalog actions, and safe fallback/footer behavior.
- [x] 3.2 GREEN: modify `src/tui/index.tsx` to retain custom creation, render catalog/detail/materialize/delete actions, and remove suite/profile screens; create `src/version.ts` with `PLUGIN_VERSION`.
- [x] 3.3 REFACTOR: keep `safeSlotRender` boundaries, compact Spanish labels, and version footer/title fallback without changing `src/server/index.ts` or `src/core/policy.ts`.

## Phase 4: Docs and verification

- [x] 4.1 Update `README.md` and `docs/`; delete `examples/suites.json` only if it is the obsolete example, while leaving user legacy data untouched.
- [x] 4.2 Run `npm test`, `npm run typecheck`, `npm run build`; confirm unchanged `test/server.test.ts`, `test/consent.test.ts`, and `test/policy.test.ts` remain green.

## Phase 5: Maintainer-authorized internal Gentle-AI agents

Native attempt ordinal 3 / generation 3; explicit post-review scope amendment;
maximum 500 changed lines; no review or Git operations in this work unit.

- [x] 5.1 `authorize-gentle-system-agents`: write RED coverage in `test/policy.test.ts` and `test/server.test.ts` for the exact configured primary/fallback SDD, review/refuter, and Judgment Day allowlist; keep `general`, built-in `explore`, `agent-especialit-github`, custom, and lookalike agents behind exact current-turn consent; implement the single exact policy predicate and runtime `permission.task` hook; update README/docs and persist cumulative evidence.

### Work unit contract — `authorize-gentle-system-agents`

| Evidence | Required boundary |
|----------|-------------------|
| Focused tests | `npm test -- test/policy.test.ts test/server.test.ts test/consent.test.ts` |
| Runtime harness | Vitest server-hook scenario exercising `config`, `chat.message`, and `tool.execute.before`; no live OpenCode process harness exists in this repository |
| Rollback boundary | Revert only `src/core/policy.ts`, `src/server/index.ts`, `test/policy.test.ts`, `test/server.test.ts`, README/docs, and the Phase 5 SDD artifact amendments; do not touch global config, catalog/TUI membership, model selection, consent ledger, `.atl`, or `.codegraph` |
