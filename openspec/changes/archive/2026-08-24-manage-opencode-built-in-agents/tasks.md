# Tasks: Manage OpenCode Built-In Agents

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 600-800 lines |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Core & Config) → PR 2 (Consent & Server) → PR 3 (TUI & Integration) |
| Delivery strategy | ask-on-risk (user resolved risk decision) |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Built-in registry, types, config migration & baseline restore | PR 1 (base: tracker branch) | `npx vitest run test/built-in-agents.test.ts test/config.test.ts` | N/A (pure unit & config tests) | Revert `src/core/built-in-agents.ts`, `src/core/types.ts`, `src/core/config.ts` |
| 2 | Ephemeral session grants, fail-closed policy, threat matrix & server gate | PR 2 (base: PR 1 branch) | `npx vitest run test/policy.test.ts test/server.test.ts` | OpenCode plugin mock harness in `test/server.test.ts` | Revert `src/core/{grants,policy}.ts`, `src/server/index.ts` |
| 3 | TUI catalog built-in actions, warnings, grant panel & app controller | PR 3 (base: PR 2 branch) | `npx vitest run test/agent-suite-catalog.test.ts test/agent-suite-controller.test.ts` | Interactive TUI test renderer in `test/agent-suite-controller.test.ts` | Revert `src/tui/screens/*`, `src/tui/agent-suite-*.tsx` |

## Phase 1: Registry, Types & Config (PR 1)

- [x] 1.1 RED: Add tests in `test/built-in-agents.test.ts` for 7 canonical built-ins, Spanish metadata, `public|internal` tiers, baseline immutability, and pending-curation discovery.
- [x] 1.2 GREEN: Implement `src/core/built-in-agents.ts` and update `src/core/types.ts` with built-in models, discovery filters, and advanced flags.
- [x] 1.3 RED: Add tests in `test/config.test.ts` for `builtInOverrides`, `disabledAgents`, `advancedOverrides`, validation rejection, and legacy `baseOverrides` migration.
- [x] 1.4 GREEN: Update `src/core/config.ts` and `src/core/suites.ts` to normalize legacy keys, validate overrides, and support per-agent baseline restoration.
- [x] 1.5 REFACTOR: Clean up core registry and config types; run `npm run typecheck`.

## Phase 2: Consent Policy, Threat Matrix & Server Gate (PR 2)

- [x] 2.1 Evidence: Verify OpenCode hook boundary for manual vs automatic dispatch; confirm manual direct selection does not trigger `task` tool, or enforce fail-closed contract.
- [x] 2.2 RED: Add threat-matrix tests in `test/policy.test.ts` for unknown requester/target, missing/stale/revoked grant, disabled-over-grant, internal lookalikes (`sdd-evil`), and unavailable state.
- [x] 2.3 GREEN: Implement `src/core/grants.ts` and `src/core/policy.ts` for ephemeral session grant ledger, grant/revoke/clear, and fail-closed dispatch decisions.
- [x] 2.4 RED: Add server integration tests in `test/server.test.ts` for merged runtime agent overrides, disabled filtering, grant expiry on session delete, and CLI list/revoke commands.
- [x] 2.5 GREEN: Update `src/server/index.ts` to apply built-in overrides, filter disabled agents, register list/revoke commands, and enforce `tool.execute.before` task gate.
- [x] 2.6 REFACTOR: Streamline dispatch policy and grant store; run `npm test`.

## Phase 3: TUI Catalog, Actions & Session Grants Panel (PR 3)

- [x] 3.1 RED: Add TUI tests in `test/agent-suite-catalog.test.ts` and `test/agent-suite-controller.test.ts` for built-in edit/restore/disable, internal advanced warnings, and session grant view/revocation.
- [x] 3.2 GREEN: Update `src/tui/screens/catalog.tsx` and `src/tui/screens/agent-info.tsx` to show capitalized display names, type actions, baseline restore, and advanced internal disable prompt.
- [x] 3.3 GREEN: Create `src/tui/screens/session-grants.tsx` and update `src/tui/agent-suite-{controller,app}.tsx` to list active grants, allow immediate revocation, and wire navigation.
- [x] 3.4 REFACTOR & VERIFY: Run full verification via `npm test`, `npm run typecheck`, and `npm run build`.
