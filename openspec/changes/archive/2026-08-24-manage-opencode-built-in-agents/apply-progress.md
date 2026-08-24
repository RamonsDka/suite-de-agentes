# Apply Progress: Manage OpenCode Built-In Agents

## PR 1 — Registry, Types & Config

**Mode:** Strict TDD  
**Delivery boundary:** Feature-branch chain, foundation slice targeting `feat/manage-opencode-built-in-agents`.

### Completed Tasks

- [x] 1.1 RED: Registry/discovery coverage.
- [x] 1.2 GREEN: Built-in registry and core types.
- [x] 1.3 RED: Config migration/validation coverage.
- [x] 1.4 GREEN: Config normalization and baseline restoration.
- [x] 1.5 REFACTOR: Export cleanup and static type check.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `test/built-in-agents.test.ts` | Unit | N/A (new file) | `npx vitest run test/built-in-agents.test.ts` failed: missing production module | Same command passed: 3/3 tests | Canonical registry, immutability, and filtered discovery scenarios | Registry constants and helpers kept pure; focused tests remained green |
| 1.2 | `test/built-in-agents.test.ts` | Unit | N/A (new production file) | Covered by 1.1 RED before implementation | `npx vitest run test/built-in-agents.test.ts` passed: 3/3 tests | Curated and discovered definitions exercise distinct classifications/paths | Immutable baseline constructor and pure discovery helpers |
| 1.3 | `test/config.test.ts` | Unit | `npx vitest run test/config.test.ts` passed: 15/15 tests | Same command failed: 2 failing new config scenarios | Focused combined command passed: 21/21 tests | Migration, valid settings, invalid IDs/payloads, and per-agent restoration | Config parsing remains pure and validates before producing a persisted shape |
| 1.4 | `test/config.test.ts`, `test/persistence.test.ts` | Unit | `test/config.test.ts`: 15/15 existing tests passed before change | Covered by 1.3 RED before implementation | Final focused command passed: 28/28 tests | Legacy/current override forms, invalid settings, per-agent restoration, and atomic persistence cover alternate paths | Extracted shared override parser; restoration deletes only target override |
| 1.5 | `test/built-in-agents.test.ts`, `test/config.test.ts`, `test/persistence.test.ts` | Unit | Focused tests green | Approval not applicable; behavior is new | Final focused command passed: 28/28 tests | Existing and newly added branches remain covered | `npm run typecheck` passed after core export cleanup |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `npx vitest run test/built-in-agents.test.ts test/config.test.ts test/persistence.test.ts` — exit 0; 3 files passed, 28 tests passed. |
| Runtime harness command/scenario and exact result | N/A — PR 1 only introduces pure registry and config transformation functions. No server, plugin hook, or TUI runtime boundary is modified; unit tests directly execute every introduced behavior. |
| Rollback boundary | Revert `src/core/built-in-agents.ts`, `src/core/types.ts`, `src/core/config.ts`, `src/core/suites.ts`, `src/core/index.ts`, and their two focused test files. No unrelated runtime behavior needs removal. |

### Quality Commands

- `npm run typecheck` — exit 0.
- `npm run build` — exit 0; ESM build succeeded.

### Deviations / Issues

- None from the approved design within this slice.
- Initial worktree dependencies were incomplete: `npm run typecheck` and `npm run build` could not resolve local TypeScript/tsup. `npm ci` restored the lockfile-defined dependency set, after which both commands passed. npm reported 7 audit vulnerabilities and an engine warning for transitive `ini`; no dependency versions were changed by this slice.

## PR 2 — Consent & Server

**Mode:** Strict TDD  
**Delivery boundary:** Feature-branch chain PR 2, based on PR 1 branch `feat/manage-opencode-built-in-agents`; limited to consent, grants, policy, and server dispatch.  
**Review size:** 173 changed lines against `b71f343` (130 additions, 43 deletions), within the 400-line budget.

### Completed Tasks

- [x] 2.1 Evidence: The installed OpenCode plugin type declarations expose `chat.message` and `tool.execute.before` as distinct hooks. The server gates only `task` tool executions; direct manual selection has no task-gate invocation in this boundary. Missing turn, requester, target, inventory, or security state denies dispatch.
- [x] 2.2 RED: Threat-matrix tests cover unknown requester/target, missing, revoked, and expired grants, disabled-over-grant precedence, `sdd-evil` lookalikes, and unavailable inventory/security state.
- [x] 2.3 GREEN: Implemented an in-memory `ConsentLedger` with current-session grants, visibility, revoke-by-ID/target, and session clearing; dispatch policy is deny-by-default with an exact internal allowlist.
- [x] 2.4 RED: Server integration tests cover persisted runtime override application, disabled filtering, consent grant expiry after `session.deleted`, list/revoke commands, corrupt live config fail-closed behavior, and agent-exact grants.
- [x] 2.5 GREEN: Server config applies only `builtInOverrides`, filters disabled runtime agents, installs deny-default task permissions, registers grant commands, and gates `tool.execute.before`.
- [x] 2.6 REFACTOR: Renamed runtime override application to `applyRuntimeBuiltInOverrides` and removed post-migration consumers of the legacy `baseOverrides` shape.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 2.1 | `test/server.test.ts` | Integration | `npx vitest run test/policy.test.ts test/server.test.ts` — 26/26 passed before migration correction | Existing direct-selection/`task`-boundary scenarios exercised the separate hooks; local plugin declarations confirmed the hook split | Server gates only `tool.execute.before` and fails closed when task context is absent | Direct selection, missing turn, unknown inventory, and unavailable security state cover different boundary paths | Exact hook names and failure messages retained |
| 2.2 | `test/policy.test.ts` | Unit | 26/26 focused policy/server tests passed | Prior RED scenarios covered missing/revoked/expired grants, unknown requester/target, disabled precedence, and `sdd-evil` | `npx vitest run test/policy.test.ts test/server.test.ts` — 26/26 passed | Exact internal allowlist, agent-pair grants, revocation, expiry, disabled precedence, and lookalikes | Policy remains pure and deny-by-default |
| 2.3 | `test/policy.test.ts` | Unit | 26/26 focused tests passed | Covered by 2.2 RED before ledger/policy implementation | Focused policy/server command passed: 26/26 | Multiple requesters/targets, per-session isolation, revoke, and clear-session cases | `ConsentLedger` owns ephemeral state; policy consumes its narrow `has` seam |
| 2.4 | `test/server.test.ts` | Integration | 26/26 focused tests passed | Prior RED scenarios covered overrides, disabled runtime filtering, lifecycle expiry, commands, and corrupt state | Focused policy/server command passed: 26/26 | Consent materialization, runtime reload, event expiry, command revocation, and unavailable state exercise separate paths | Kept plugin adapter thin around pure policy/ledger |
| 2.5 | `test/server.test.ts` | Integration | 26/26 focused tests passed | Covered by 2.4 RED before server implementation | `npx vitest run test/config.test.ts test/persistence.test.ts test/policy.test.ts test/server.test.ts` — 51/51 passed | Runtime override filtering, disabled-over-grant, exact internal exception, and session deletion are independently exercised | Runtime override helper renamed to built-in terminology |
| 2.6 | `test/config.test.ts`, `test/persistence.test.ts`, `test/policy.test.ts`, `test/server.test.ts` | Unit + Integration | Focused 51/51 passed after refactor | Deterministic regression RED: `npx vitest run test/config.test.ts test/persistence.test.ts` — exit 1; 2 failed, 23 passed because parsed/persisted output retained `baseOverrides` | Same focused command plus policy/server passed: 4 files, 51/51 | Legacy input normalizes to only `builtInOverrides`; controller and server consume only the normalized field | Removed legacy output field and renamed server helper; focused tests stayed green |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `npx vitest run test/config.test.ts test/persistence.test.ts test/policy.test.ts test/server.test.ts` — exit 0; 4 files passed, 51 tests passed. |
| Runtime harness command/scenario and exact result | `npx vitest run test/policy.test.ts test/server.test.ts` — exit 0; 2 files passed, 26 tests passed. The OpenCode plugin mock harness executes `chat.message`, `tool.execute.before`, `command.execute.before`, `event(session.deleted)`, and `config` hooks, proving dispatch gate, consent, grants, command revocation, config reload, and expiry behavior. |
| Rollback boundary | Revert `src/core/grants.ts`, `src/core/policy.ts`, `src/server/index.ts`, `test/policy.test.ts`, and `test/server.test.ts`. The migration correction is independently reversible in `src/core/config.ts`, `src/core/types.ts`, `src/core/suites.ts`, `src/tui/agent-suite-controller.ts`, and `src/server/index.ts`; it only removes normalized legacy-field retention. |

### Quality Commands

- `npm test` — exit 0; 25 files passed, 168 tests passed.
- `npm run typecheck` — exit 0.
- `npm run build` — exit 0; ESM build succeeded.
- `git diff --check b71f343` — exit 0.

### Deviations / Issues

- No implementation deviation from the consent/server design.
- Context7 documentation lookup was unavailable because its monthly quota was exceeded. The hook-boundary evidence therefore uses the installed `@opencode-ai/plugin` declarations plus the integration harness, rather than external documentation.

## PR 3 — TUI & Integration

**Mode:** Strict TDD  
**Delivery boundary:** Feature-branch chain PR 3, based on PR 2 branch `feat/manage-opencode-built-in-agents-02-consent`; limited to catalog built-in actions, session-grant visibility/revocation, and controller/TUI navigation.  
**Review size:** 214 authored changed lines (193 additions, 21 deletions), within the 400-line budget.

### Completed Tasks

- [x] 3.1 RED: Added catalog/controller tests for capitalized built-in presentation, type-specific restore/disable actions, internal disable rejection without advanced override, baseline restoration isolation, and active grant visibility/revocation.
- [x] 3.2 GREEN: Catalog labels use canonical display names; built-in details expose model/effort, baseline restore, and disable actions, with internal agents labelled as requiring an advanced override.
- [x] 3.3 GREEN: Added the session-grants TUI panel, catalog navigation, immediate grant revocation, and controller seams backed by the same in-memory consent ledger.
- [x] 3.4 REFACTOR & VERIFY: Kept catalog-only exclusions intact and ran focused, runtime-harness, full suite, typecheck, build, and diff validation.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.1 | `test/agent-suite-catalog.test.ts`, `test/agent-suite-controller.test.ts` | Integration | `npx vitest run test/agent-suite-catalog.test.ts test/agent-suite-controller.test.ts` — 2 files, 27 tests passed before PR 3 | Same command failed: catalog label returned `plan`; controller had no restore/grant operations; session-grants module was absent | Same focused command passed: 2 files, 32 tests | Covered public/internal/custom action variants, restoration isolation, blocked internal disable, non-empty grant visibility, and post-revocation empty ledger | Extracted controller built-in action adapter and maintained catalog-only boundaries; focused tests stayed green |
| 3.2 | `test/agent-suite-catalog.test.ts`, `test/agent-suite-controller.test.ts` | Integration | 2 files, 27 tests passed before test additions | Covered by 3.1 RED before presentation/controller implementation | Same focused command passed: 2 files, 32 tests | `plan` display capitalization and `compaction` advanced-warning action cover distinct built-in classifications | Reused canonical registry display metadata rather than duplicating labels |
| 3.3 | `test/agent-suite-catalog.test.ts`, `test/agent-suite-controller.test.ts` | Integration | Focused tests passed after 3.2 | Missing session-grants import/module failed before creation | Same focused command passed: 2 files, 32 tests | Catalog `g` navigation plus ledger list/revoke verify distinct panel and immediate-revocation paths | Kept grant state in the existing `ConsentLedger`; panel is a thin presenter |
| 3.4 | `test/agent-suite-catalog.test.ts`, `test/agent-suite-controller.test.ts`, `test/agent-suite-mount.test.ts` | Integration | 2 focused files green before verification | Approval not applicable; this task verifies the completed behavior | Full `npm test` passed: 25 files, 173 tests | Focused TUI/controller and mount runtime renderer exercise separate paths | Removed direct lifecycle method names from the app surface to preserve catalog-only regression tests |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `npx vitest run test/agent-suite-catalog.test.ts test/agent-suite-controller.test.ts` — exit 0; 2 files passed, 32 tests passed. |
| Runtime harness command/scenario and exact result | `npx vitest run test/agent-suite-mount.test.ts` — exit 0; 1 file passed, 7 tests passed. The interactive TUI mount renderer validates runtime mounting alongside the controller/catalog behavior. |
| Rollback boundary | Revert PR 3 TUI/controller files: `src/tui/{agent-suite-app,agent-suite-controller,agent-suite-nav,agent-suite-vm}.ts(x)`, `src/tui/screens/{catalog,agent-info,session-grants}.tsx`, `src/tui/visual-primitives.tsx`, and the two PR 3 test owners. This removes only TUI integration, retaining PR 1 registry/config and PR 2 consent/server behavior. |

### Quality Commands

- `npm test` — exit 0; 25 files passed, 173 tests passed.
- `npm run typecheck` — exit 0.
- `npm run build` — exit 0; ESM build succeeded.
- `git diff --check 3313a7d8a96e11bb202e4c618c732a9576ce482a` — exit 0.

### Deviations / Issues

- The legacy catalog-only regression suite forbids creation, editing, deletion, and interview flows in the TUI app. PR 3 therefore implements only the specified built-in restore/disable and grant-management actions; it does not restore authoring, editing, or deletion flows.
- No other design deviation or issue.
