# Tasks: Improve Catalog Navigation and Agent Metadata

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 550 - 750 lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Nav/TUI) → PR 2 (Identity/Persistence) → PR 3 (Metadata/Security) → PR 4 (Verification/Rollout) |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Pure catalog navigation & TUI cursor wiring | PR 1 | `npm test -- test/agent-suite-nav.test.ts` | TUI arrow/clamp/filter traversal | `src/tui/*`, `test/agent-suite-nav.test.ts` |
| 2 | Canonical ID, config persistence & atomic migration | PR 2 | `npm test -- test/config.test.ts test/persistence.test.ts test/agents.test.ts` | Fixture suite JSON & markdown migration | `src/core/{built-in-agents,types,config,suites,persistence,agents}.ts` |
| 3 | Metadata registry, skill bindings & security gates | PR 3 | `npm test -- test/policy.test.ts test/skill-catalog.test.ts test/server.test.ts test/agent-suite-catalog.test.ts` | Agent dispatch, denial simulation & zero-legacy assertion | `src/core/{built-in-agents,grants,policy}.ts`, `src/server/index.ts` |
| 4 | Cumulative verification & production rollout readiness | PR 4 | `npm test && npm run typecheck && npm run build` | Isolated loader smoke test | `dist/*`, loader config snapshots |

## Phase 1: Pure Catalog Navigation & TUI State Machine

- [x] 1.1 RED: Add tests in `test/agent-suite-nav.test.ts` for `MOVE_CATALOG_CURSOR` covering `page:0, focus:5` -> `page:1, focus:0` (14 items, page size 6), reverse Up traversal, 7-item partial page, empty catalog, and global boundary clamping.
- [x] 1.2 GREEN: Implement `MOVE_CATALOG_CURSOR` with global index clamping in `src/tui/agent-suite-nav.ts`.
- [x] 1.3 GREEN: Wire cursor event into `src/tui/agent-suite-app.ts`, `src/tui/agent-suite-vm.ts`, `src/tui/agent-suite-controller.ts`, and `src/tui/screens/catalog.tsx`.
- [x] 1.4 REFACTOR: Polish cursor derivation and visual tokens in `src/tui/visual-tokens.ts`.

## Phase 2: Canonical ID Normalization, Config Persistence & Migration

- [x] 2.1 RED: Add tests in `test/config.test.ts`, `test/persistence.test.ts`, and `test/agents.test.ts` for `normalizeAgentId`, `baseOverrides` migration, duplicate alias rejection, canonical precedence, malformed legacy handling, customization preservation, and atomic recovery.
- [x] 2.2 GREEN: Create `src/core/built-in-agents.ts` with ID normalization and canonical registry; update `src/core/types.ts`.
- [x] 2.3 GREEN: Update `src/core/config.ts`, `src/core/suites.ts`, `src/core/persistence.ts`, and `src/core/agents.ts` with atomic validation, staging, promotion, and `.legacy.bak` archiving.
- [x] 2.4 REFACTOR: Ensure migration routines are idempotent and clean.

## Phase 3: Agent Metadata Registry, Skill Bindings & Security Policies

- [x] 3.1 RED: Add tests in `test/agent-suite-catalog.test.ts`, `test/policy.test.ts`, and `test/agents.test.ts` asserting exact visible label `agent-github` and zero `agent-especialit-github` in catalog rows, details, grant text, diagnostics, and new filenames/content, retaining legacy input compatibility.
- [x] 3.2 GREEN: Reconcile visible label and zero-leakage enforcement in `src/core/built-in-agents.ts`, `src/core/agents.ts`, and `src/tui/agent-suite-app.tsx` if Unit 2 code or tests need adjustment.
- [x] 3.3 RED: Add policy and threat-matrix tests in `test/policy.test.ts`, `test/server.test.ts`, and `test/skill-catalog.test.ts` for:
  - Git cwd safety: deny `git -C` and cwd overrides with no process start.
  - Commit/push denial: deny staged/`commit -a`/empty commit and tracking/first-push/refspec push.
  - PR commands: deny `--head`, env-prefixes, and composed PR commands.
  - Internal agents: allow silent memory and read-only allowlist; deny edits/delegation/shell; test memory outage fallback.
  - `agent-github`: verify `agent-github` display, installed skill bindings, Actions SHA-pinning guidance, and no push claims.
- [x] 3.4 GREEN: Implement metadata, Spanish descriptions, and permission allowlists in `src/core/built-in-agents.ts`, `src/core/grants.ts`, and `src/core/policy.ts`.
- [x] 3.5 GREEN: Update `src/server/index.ts` with registry overlays and command gating.
- [x] 3.6 REFACTOR: Standardize permission gates, zero-leakage diagnostics, and error logging.

## Phase 4: Cumulative Verification & Production Deployment

- [x] 4.1 Run full verification: `npm test`, `npm run typecheck`, and `npm run build`.
- [x] 4.2 Execute isolated loader smoke test preserving current stable loader path.
- [x] 4.3 Stage production rollout task: snapshot hashes in `suite-de-agentes-production`, atomically update loaders, and document rollback.
