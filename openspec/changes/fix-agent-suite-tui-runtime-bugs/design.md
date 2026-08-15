# Design: Fix Suite de Agentes TUI Runtime Bugs

## Technical Approach

This is a defect-fix design layered on the existing `redesign-agent-suite-tui` architecture (owned OpenTUI/Solid screens mounted via `api.ui.dialog.replace(() => api.ui.Dialog({ size, children }))`, pure `reduceScreen` state machine, `safeScreenMount`/`safeSlotRender` degrade-to-legacy guards). No new mount surface, no new capability, no visual redesign.

### Key discovery that shapes the test strategy

`@opentui/solid` exports `testRender(node, renderConfig?)` (`node_modules/@opentui/solid/index.d.ts:5`), which wraps `@opentui/core/testing`'s `createTestRenderer` — a **pure-JS mock renderer that does not require native FFI or a real terminal**. It accepts `{ width, height }` (so a test can simulate exactly the box a `size:"large"` Dialog would allocate) and returns `{ renderer, mockInput, mockMouse, renderOnce, flush, waitFor, waitForFrame, waitForVisualIdle, externalOutput }`. `mockInput`/`mockMouse` come from `createMockKeys`/`createMockMouse` (`node_modules/@opentui/core/testing/{mock-keys,mock-mouse}.d.ts`) and can send real `return`/`linefeed`/`escape`/arrow keypresses and real mouse-down events into the same `renderer.keyInput`/mouse dispatch path the production code uses.

This means the prior "OpenTUI native FFI is unavailable in the current Node runtime, so host-double tests provide runtime evidence" limitation (Engram id 5834) does **not** apply to this testing module — `createTestRenderer` is designed exactly to test without native FFI or a live terminal. The original test suite simply never used it. Closing the test-coverage gap is therefore a real, achievable, non-blocked task, not a repeat of the prior limitation.

## Architecture Decisions

| Decision | Alternatives | Choice | Rationale |
|---|---|---|---|
| Dimension source for layout | Keep `useTerminalDimensions()` everywhere | Introduce a `resolveScreenBox()` helper: prefer an explicit allocated-box size if the host API exposes one; otherwise require `size:"xlarge"` and document that as "we assume xlarge is full-bleed" | Fixes the root cause of Symptom 1 without inventing an unverifiable host API; keeps the assumption explicit and testable |
| Navigation timing | Keep synchronous `close`+`replace` inside `useKeyboard` callbacks | Wrap the mutation in `queueMicrotask(() => { ... })` at the single `close`/`returnToRoot`/screen-transition call sites, not per-screen duplicated logic | One shared deferral point (`src/tui/index.tsx`'s `close`/transition helpers) keeps the fix DRY and testable once |
| Guaranteed exit | Rely only on embedded `useKeyboard` Escape | Add a second `api.keymap.registerLayer` binding (e.g. a distinct chorded key) that calls `close(api)` directly, registered alongside `registerSuiteKeymap` | Host-level keymap registration is already a proven, tested seam (`registerSuiteKeymap`); reuses it instead of inventing new host API surface |
| Pagination model | Keep forward-only `page+1` | Extend `ScreenState`'s `catalog` variant handling and `Catalog`'s `useKeyboard`/`onPage` wiring to support `pageup` decrementing, matching the existing `reduceScreen` `"page"` event (`delta: -1 \| 1`) which ALREADY supports backward paging in `nav.ts` — the screen component just never wires it | `nav.ts`'s reducer already models `-1` deltas; this is a wiring gap, not a new state-machine design |
| Test interaction harness | Keep `toBeTypeOf("function")` + expand `dialogHost()` mock | Add a new `test/screen-interaction.test.ts` using `testRender`/`createMockKeys`/`createMockMouse` per screen, alongside (not replacing) the existing pure-helper unit tests | Additive; does not risk breaking the currently-passing pure-logic coverage while adding the missing interaction layer |
| Renderer-missing diagnostics | Leave silent | Use the existing (currently dead) `rendererMissingReported` flag: log once via `console.error` the first time it flips true, never again per process | Reuses existing state instead of adding new state; satisfies "at least one diagnostic" without spamming |

## Fix Plan by Symptom → Requirement → Implementation

1. **Symptom 1 (window clipping/ghost)** → Requirement "Responsive layout adapts to terminal size" (MODIFIED) → `resolveScreenBox()` helper in `src/tui/layout.ts`; thread through `Landing.compact()`, `Catalog`'s `dimensions()` usage (both `catalogColumns(width)` and page-size-by-height).
2. **Symptom 4 (Enter does nothing) / Symptom 5 (no exit)** → Requirement "Keyboard focus and navigation model" (MODIFIED, deferred mutation + preventDefault parity) + "Suite dialog always has a guaranteed exit path" (MODIFIED) → `queueMicrotask` deferral around `close`/`dialog.replace` transition points in `src/tui/index.tsx`; `Landing.tsx` `preventDefault()` on every branch; new keymap-layer exit binding in `registerSuiteKeymap`/plugin init.
3. **Symptom 3 (mouse clicks)** → same "Responsive layout" fix (hit-test alignment follows from correct box sizing); no separate handler change needed since `onMouseDown` wiring is already correct per the audit.
4. **Symptom 2 (general shortcuts)** → covered by 2 and 3; no independent fix identified.
5. **Judgment Day hygiene items** → "Catalog pagination supports moving backward" (ADDED) → wire `Catalog`'s `useKeyboard`/`onPage` to the existing `-1`/`+1` `reduceScreen` "page" event; `safeScreenMount` real 3-arg signature; `create.tsx` Enter/`onSubmit` guard (pick one authority per step, not both); "Renderer-unavailable failures are diagnosable" (ADDED) → the `rendererMissingReported` one-shot log.

## Test Strategy (Strict TDD)

- RED: for each fix, write a failing test first.
  - Layout: pure-function tests for `resolveScreenBox()`/`catalogColumns`/page-size math (fast, no renderer needed) — extend `test/layout.test.ts`-style coverage.
  - Interaction: new `test/screen-interaction.test.ts` using `testRender(() => <Landing .../>, { width, height })` + `mockInput.pressKey(...)`/`mockMouse.click(...)` (exact API per `mock-keys.d.ts`/`mock-mouse.d.ts` — read before use) to assert Enter selects the focused action, Escape closes, and a mouse click on a rendered button's real box selects it, at both a "large"-simulated size and a full-terminal size, to reproduce and then verify the fix for the dimension mismatch.
  - Pagination: extend `nav.ts` reducer tests (already covers `page` events) plus a `Catalog` interaction test asserting `pagedown` then `pageup` returns to the first page.
- GREEN: minimal implementation per fix.
- REFACTOR: dedupe the deferred-navigation and box-resolution logic across screens if repeated.
- Full `npm test` + `npm run typecheck` after each work unit; no `npm run build` (per global "never build" rule) unless the user explicitly authorizes a deploy step at the end, same as the prior change.

## Risks / Assumptions

- The exact `mockInput`/`mockMouse` API surface (method names, coordinate model) must be read from `node_modules/@opentui/core/testing/{mock-keys,mock-mouse}.d.ts` at implementation time rather than assumed here — this design intentionally does not guess exact method signatures.
- Whether the host actually exposes an allocated-Dialog-box size, or whether `"xlarge"` is effectively full-terminal, remains unconfirmed from this repo (see exploration.md Open Questions). The `resolveScreenBox()` helper is designed so either answer can be plugged in without changing its call sites.
- Manual verification in a real terminal after implementation is still required before considering Symptoms 1/3/4/5 fully resolved in production, since even the improved test harness is a faithful mock, not the real host-embedded renderer.
