# Tasks: Fix Suite de Agentes TUI Runtime Bugs

## Review Workload Forecast

Estimated changed lines: ~500-700 across `src/tui/index.tsx`, `src/tui/layout.ts`, `src/tui/screens/{landing,catalog,detail,modify,create}.tsx`, `src/tui/screens/nav.ts`, `src/tui/host-compat.ts`, plus new/expanded tests. 800-line budget risk: Low-Medium. Chained PRs recommended: No at this estimate (single work-unit PR fits comfortably under the 800-line budget chosen for this session). Decision needed before apply: No — proceed as a single work-unit under `auto-forecast` delivery strategy.

## 1. Dimension-source fix (Symptom 1: window clipping/ghost, Symptom 3: mouse hit-testing)

- [x] 1.1 RED: wrote a failing pure-function test for `resolveScreenBox()`.
- [x] 1.2 GREEN: implemented the pure helper with predictable allocated-box/fallback behavior.
- [ ] 1.3 RED: the required `testRender`-based screen assertion remains pending. Direct `testRender` initialization was attempted but fails because OpenTUI native FFI is unavailable in this Node runtime.
- [x] 1.4 GREEN: threaded the optional resolved box through `Landing.tsx` and `Catalog.tsx`; custom Dialog mounts request `xlarge`.
- [x] 1.5 REFACTOR: removed duplicated dimension-reading logic; verified `Detail`, `Modify`, and `Create` do not call `useTerminalDimensions()`.

## 2. Deferred navigation (Symptom 4: Enter does nothing)

- [ ] 2.1 RED: the required `testRender` + `mockInput` same-dispatch assertion remains pending because the native test renderer cannot initialize.
- [x] 2.2 GREEN: added shared `deferScreenAction()` microtask scheduling and applied it to the implemented landing/catalog/Create/Detail paths plus `returnToRoot`.
- [ ] 2.3 RED→GREEN: native renderer interaction test for Landing Enter remains pending.
- [ ] 2.4 RED→GREEN: native renderer interaction tests for Catalog/Detail/Modify remain pending.

## 3. Landing keyboard-handler parity (Judgment Day finding)

- [ ] 3.1 RED: a direct key-event assertion for Landing `preventDefault()` remains pending because native interaction setup is unavailable.
- [x] 3.2 GREEN: added `preventDefault()` to Landing arrow and Enter branches.

## 4. Guaranteed exit path (Symptom 5: no way to exit)

- [x] 4.1 RED: registration test asserts the independent host-level exit binding and command.
- [x] 4.2 GREEN: registered `ctrl+q` / `:agent-suite-close` alongside Alt+S and wired plugin init to `close(api)`.
- [x] 4.3 Confirmed `TuiKeymap`/`TuiKeys` declarations expose no reserved-key list; `ctrl+q` is the selected plugin-owned chord.

## 5. Catalog bidirectional pagination (Judgment Day finding, ADDED requirement)

- [x] 5.1 Verified `reduceScreen` already clamps catalog `page` for `delta: -1`.
- [ ] 5.2 RED: the required Catalog `testRender`/keyboard interaction assertion remains pending because native FFI is unavailable.
- [x] 5.3 GREEN: Catalog handles `pageup` and reports the previous page; the host callback remains side-effect free because screen state owns the page.

## 6. `safeScreenMount` real fallback signature (Judgment Day finding)

- [x] 6.1 RED: added a failing-then-passing unit assertion for the third fallback callback.
- [x] 6.2 GREEN: `safeScreenMount` accepts and invokes `onFailure`; existing call sites pass cleanup callbacks.

## 7. Renderer-missing diagnostic logging (ADDED requirement)

- [x] 7.1 RED: added a one-shot logging regression test.
- [x] 7.2 GREEN: `rendererMissingReported` now guards a de-duplicated `console.error` diagnostic.

## 8. `Create` screen Enter/`onSubmit` double-fire guard (Judgment Day finding)

- [ ] 8.1 RED: the required mounted text-input double-fire interaction assertion remains pending because native FFI is unavailable; deterministic step-ownership unit coverage was added instead.
- [x] 8.2 GREEN: keyboard Enter handles only model/skills/confirm; text-input steps remain owned by input `onSubmit`.

## 9. Full verification

- [x] 9.1 `npm test` passed: `Test Files  14 passed (14)` and `Tests  81 passed (81)`; `npm run typecheck` exited 0 with no diagnostics.
- [x] 9.2 No build was run.
- [ ] 9.3 Exploration checklist status not updated; optional traceability item.
- [x] 9.4 Manual real-terminal Alt+S smoke test remains required after an explicitly authorized rebuild and OpenCode restart; this session did not build or deploy.
