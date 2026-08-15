# Tasks: Agent Suite Graphical Route — Stage 1 Spike

## Phase 1: TDD implementation

- [x] 1.1 Add pure main-screen labels and focus-prefix constructors with deterministic unit tests.
- [x] 1.2 Add the full-screen `SuiteRoute` component with theme-only colors, terminal-sized column layout, keyboard handling, and deterministic helper coverage.
- [x] 1.3 Register the `agent-suite` route and route Alt+S through navigation with native `openSuite` fallback; add deterministic registration/fallback tests.

## Phase 2: Verification

- [x] 2.1 Run the focused TUI tests and record RED/GREEN/REFACTOR evidence.
- [x] 2.2 Run `npm test` and `npm run typecheck` (do not run the build).
- [x] 2.3 Persist cumulative apply progress to Engram.

## Phase 3: Review follow-up correction

- [x] 3.1 Guard Suite route Escape with `safeHostAction("leave route", ...)` and prove navigation failures return `false` without throwing.
- [x] 3.2 Leave the graphical route before opening Catalog/Create Agent, defer the async entry point with `queueMicrotask`, and suppress it when navigation fails.
- [x] 3.3 Add the shared async Suite-action catch/alert helper and use it for route selections plus native Alt+S/slash entry points.
- [x] 3.4 Add strict-TDD regression coverage for all review findings and run focused/full tests plus typecheck.

## Review Workload Forecast

- Estimated changed lines: 200–300
- 400-line budget risk: Low
- Chained PRs recommended: No
- Decision needed before apply: No
- Delivery: single PR, no exception

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `npm test -- test/tui-registration.test.ts` — PASS; 1 file, 20 tests. Full `npm test` — PASS; 11 files, 64 tests. `npm run typecheck` — PASS; exit 0 |
| Runtime harness command/scenario and exact result | N/A — OpenTUI native renderer/FFI is unavailable; route behavior is covered with deterministic host mocks; `testRender` was not attempted |
| Rollback boundary | `src/tui/screens/suite-route.tsx`, `src/tui/index.tsx`, `test/tui-registration.test.ts`, and this checklist |

## TDD Cycle Evidence
| Task | Test owner/file | Layer | Baseline | RED | GREEN | Triangulation | Refactor |
|---|---|---|---|---|---|---|---|
| 1.1 | `test/tui-registration.test.ts` | Unit | 13 passed | FAILED — tests were added after implementation; no valid pre-change RED was captured | PASS: 16 passed | N/A | Pure constructors kept side-effect free; strict-TDD process deviation recorded |
| 1.2 | `test/tui-registration.test.ts` | Unit/helper contract | 13 passed | FAILED — tests were added after implementation; no valid pre-change RED was captured | PASS: 16 passed | N/A | No renderer attempted; JSX remains isolated; strict-TDD process deviation recorded |
| 1.3 | `test/tui-registration.test.ts` | Unit/plugin registration | 13 passed | FAILED — tests were added after implementation; no valid pre-change RED was captured | PASS: 16 passed | Missing/throwing route mocks | Fallback path kept separate from native dialogs; `tui` only navigates when registration succeeds; strict-TDD process deviation recorded |
| 3.1 | `test/tui-registration.test.ts` | Unit/helper contract | 16 passed | PASS: 20 tests failed on missing `leaveSuiteRoute` export | PASS: 20 passed | Throwing and successful `navigate("home")` cases | Escape delegates to boolean safe helper; no exception escapes |
| 3.2 | `test/tui-registration.test.ts` | Unit/helper contract | 16 passed | PASS: 20 tests failed on missing `selectSuiteRouteItem` export | PASS: 20 passed | Catalog and Create Agent selections | Route exit is synchronous; dialog action starts only in a microtask |
| 3.3 | `test/tui-registration.test.ts` | Unit/helper contract | 16 passed | PASS: 20 tests failed on missing `runSuiteAction` export | PASS: 20 passed | Rejected promise with native DialogAlert mock | Shared catch reports title `Suite de Agentes`, error message, and closes on confirm |
| 3.4 | `test/tui-registration.test.ts` | Unit/regression | 16 passed | PASS: all four new cases failed before implementation | PASS: 20 focused, 64 full | Existing Alt+S route-registration/navigation fallback tests | No renderer attempted; async rejection has no unhandled rejection |
