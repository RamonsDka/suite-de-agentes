# Tasks: Native Suite de Agentes TUI

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 900–1,100 gross; deletion-dominant |
| 400-line budget risk | Medium |
| Chained PRs recommended | No |
| Suggested split | Single deletion-dominant work unit |
| Delivery strategy | exception-ok |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Native dialog flow, cleanup, version, and host-mock coverage | Single PR | `npm test -- test/tui-registration.test.ts` — 12 passed | N/A — native host FFI unavailable; dialogHost mock is the runtime boundary | Revert listed `src/tui`, `test`, version, package, and task files |

## Phase 1: Test Contract (Strict TDD)

- [x] 1.1 RED: rewrite `test/tui-registration.test.ts` for native entry/catalog/info/action/modify/create/delete/version/registration scenarios.
- [x] 1.2 GREEN: preserve focused host-mock ownership and make the rewritten contract executable.
- [x] 1.3 REFACTOR: remove obsolete custom-screen imports and duplicate assertions.

## Phase 2: Native Dialog Implementation

- [x] 2.1 RED: add failing assertions for native root, catalog, detail field order, and action gating.
- [x] 2.2 GREEN: rewrite `src/tui/index.tsx` around `selectValue`, `promptValue`, `confirmValue`, and `showAlert`; implement modify/create/delete flows.
- [x] 2.3 REFACTOR: deduplicate pure option/detail builders and keep persistence through existing helpers.

## Phase 3: Removal and Version

- [x] 3.1 RED: assert registration has only open command/binding and no custom-screen/exit symbols.
- [x] 3.2 GREEN: delete `src/tui/screens/`, `src/tui/layout.ts`, obsolete tests, custom mount/exit helpers, and remove `safeScreenMount` re-export.
- [x] 3.3 GREEN: bump `src/version.ts` and `package.json` to `1.0.1`.

## Phase 4: Verification

- [x] 4.1 Run focused Vitest and record RED/GREEN results.
- [x] 4.2 Run full `npm test` — 11 files, 56 tests passed.
- [x] 4.3 Run `npm run typecheck` — exited 0; `tsc --noEmit` passed.
- [x] 4.4 Update all task checkboxes and persist apply-progress evidence.

## Final Verification Group

- [x] V1 All spec scenarios are covered by dialogHost tests.
- [x] V2 `npm test` passes: 11 test files, 56 tests.
- [x] V3 `npm run typecheck` passes: exit code 0.
- [x] V4 No edits under `src/core/**` or `src/server/**`.

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `npm test -- test/tui-registration.test.ts` — 1 file, 12 tests passed; initial RED was 10 failures before implementation, final GREEN passed |
| Runtime harness command/scenario and exact result | N/A — native OpenTUI FFI is unavailable; existing `dialogHost()` mock exercised DialogSelect/DialogAlert/DialogConfirm/DialogPrompt paths |
| Rollback boundary | `src/tui/index.tsx`, `src/tui/host-compat.ts`, deleted `src/tui/screens/**` and `src/tui/layout.ts`, affected `test/**`, `src/version.ts`, `package.json`, this change directory |

## TDD Cycle Evidence

| Task | Test owner/file | RED | GREEN | REFACTOR |
|---|---|---|---|---|
| 1.1–3.3 | `test/tui-registration.test.ts` plus `test/host-compat.test.ts` | `npm test -- test/tui-registration.test.ts` — expected failures against legacy flow (10 failed) | Focused final: 1 file, 12 passed; full final: 11 files, 56 passed | Removed custom-screen tests/support, simplified host registration, deduplicated native flow helpers |
