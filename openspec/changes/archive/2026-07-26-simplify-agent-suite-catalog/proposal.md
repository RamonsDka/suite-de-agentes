# Proposal: Simplify Agent Suite Catalog

## Intent

The Alt+S window lists every runtime agent (`sdd-*`, `review-*`, `jd-*`, `*-fallback`, `gentle-orchestrator`) plus unused suite/model-profile CRUD. Remove suites, profiles, and model-profile management entirely; keep exactly `Catálogo` and `Crear agente`, listing only Suite de Agentes members with current-turn consent safety preserved.

## Scope

### In Scope
- Delete suite CRUD and `mergeAgentModels`; trim `SuiteConfig` to `{version, customAgents}`
- Membership catalog: seed `general`, `agent-especialit-github` + plugin-created custom agents; denylist `sdd-*`, `review-*`, `jd-*`, `*-fallback`, `gentle-orchestrator`, other runtime agents
- Two-option Spanish TUI: compact, scrollable, per-row detail/actions, plugin version footer
- Legacy `suites.json`: empty data replaced safely; real assignments fail visibly in Spanish
- New `test/catalog.test.ts`; trimmed suites/config/persistence tests; docs updated

### Out of Scope
- Server gating, consent ledger, SDD allowlist (`src/server/`, `src/core/policy.ts`)
- SDD/Gentle-AI profiles; `~/.config/opencode/.opencode/sdd-models.jsonc`
- Global `opencode.json`, `agent-especialit-github.md`, `.atl/`, `.codegraph/`
- Automatic legacy migration; commit/push/PR (forecast only)

## Capabilities

### New Capabilities
- `agent-catalog`: two-option Alt+S surface; scoped membership (seed + denylist + custom); scrollable Spanish catalog with detail/actions, materialization state, version footer; consent-safe invocation.
- `suite-config-persistence`: trimmed `{version, customAgents}` shape; empty legacy replaced safely; real legacy assignments rejected with a visible Spanish error.

### Modified Capabilities
None — no baseline specs in `openspec/specs/`.

## Approach

Surgical simplification (exploration Option A). One pure, auditable `buildSuiteDeAgentesCatalog(runtime, custom, seed)` owns membership; `openSuite` renders two options; `showCatalog` becomes scrollable with detail actions; `PLUGIN_VERSION` feeds sidebar and footer. Strict TDD. Delivery forecast (no Git actions): 2 chained slices — (1) core/types/persistence/catalog + tests, (2) TUI re-wire + footer + docs (~400–600 authored lines, within 2000-line budget).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/tui/index.tsx` | Modified | Two-option menu; scrollable catalog; footer; drop suite CRUD UI |
| `src/core/suites.ts` | Modified | Membership catalog builder; drop suite CRUD |
| `src/core/types.ts` | Modified | Drop `AgentSuite`/`suites`/`activeSuite`; rows gain membership/enabled |
| `src/core/persistence.ts`, `src/core/config.ts` | Modified | Trimmed shape, legacy keys throw; drop `mergeAgentModels` |
| `test/` | Modified | New catalog test; trimmed suites/config/persistence tests |
| `README.md`, `docs/`, `examples/` | Modified | New behavior; drop legacy example |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| TUI rewrite regression (incl. footer slot) | Med | Host-double tests; `safeSlotRender`; 2-slice delivery |
| Silent legacy data loss | Low | Parser throws; Spanish alert |
| Hard-coded seed drift | Low | Seed in one documented module |

## Rollback Plan

`git revert` the affected slice(s). `suites.json` is never deleted — legacy data stays untouched (parser rejects; nothing written) or was empty. Server/policy files unmodified; consent cannot regress.

## Dependencies

None beyond existing stack (OpenCode 1.18.5, OpenTUI 0.4.5, Vitest).

## Success Criteria

- [ ] Alt+S shows exactly `Catálogo` and `Crear agente`
- [ ] Catalog lists only seed + custom agents; denylisted patterns absent
- [ ] Legacy real assignments fail visibly in Spanish; empty legacy replaced safely
- [ ] `npm test`, `typecheck`, `build` pass; server/consent tests green; version footer visible

## Maintainer-authorized scope amendment

The maintainer permanently authorizes the internal Gentle-AI multi-agent system
without per-turn consent. The amendment adds the exact configured primary and
fallback SDD agents, review lenses/refuter, and Judgment Day judges/fix agent to
the server policy boundary. `general`, built-in `explore`,
`agent-especialit-github`, plugin-created custom agents, and lookalike names
remain exact-current-turn-consent targets. The plugin runtime config hook must
also replace `permission.task` with the deny-by-default exact map while
preserving unrelated configuration fields. Global configuration, catalog
membership, model selection, and the consent ledger remain out of scope.
