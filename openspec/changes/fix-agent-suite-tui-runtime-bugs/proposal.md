# Proposal: Fix Suite de Agentes TUI Runtime Bugs

## Intent

The graphical redesign (`redesign-agent-suite-tui`, commit `46239be`) shipped with 75/75 tests passing and an approved bounded review, but the real, running plugin is broken for a normal user: the `Alt+S` window renders clipped with a stale/ghost frame behind it, Enter does nothing (arrows work), mouse clicks on buttons do nothing, and there is no way to close the window short of killing the terminal. This change fixes those runtime defects and closes the test-coverage gap that let them ship silently, without weakening the delivered UI/UX design itself.

## Clarifications

- This is a **bugfix on top of** `redesign-agent-suite-tui`, not a re-design. The visual/product design (framed landing, catalog matrix, structured detail, effort ordering) is out of scope and stays as delivered — only runtime correctness changes.
- Root cause is not fully provable from this repo alone for every symptom: some hypotheses depend on OpenCode host-runtime behavior (how the host's dialog stack forwards raw `Enter`/`Escape`/mouse events to a mounted custom-renderer child) that cannot be inspected from the plugin's own source. Where a plugin-side fix is applicable regardless of the exact host behavior (see Approach), we apply it; where only host confirmation can settle the question, we add a host-independent mitigation (guaranteed exit binding) rather than blocking on an answer we cannot get from this repo.
- Two independent adversarial reviewers (Judgment Day, Round 1) read the real source and the audit and found 0 CRITICALs but several concrete, fixable defects — both directly relevant to the reported symptoms and adjacent hygiene issues. All are folded into scope below.

## Scope

### In Scope

- Terminal-dimension handling: stop driving `compact()` / `catalogColumns()` / catalog page size (width **and** height) off `useTerminalDimensions()` (full-terminal size) when the screens are actually mounted inside a `size:"large"` host `Dialog` (a sub-region). Use a size source that reflects what the Dialog actually allocates, or request `size:"xlarge"` and treat it as the full-bleed contract, whichever the host API supports.
- Re-entrant dialog-stack mutation: every selection handler (`Landing.select`, `Catalog.selectFocused`, `Detail`/`Modify` `onSave`, `Create.submitField`) currently calls `close(api)` (`dialog.clear()`) then `dialog.replace(...)` synchronously from inside the active screen's own `useKeyboard` keypress callback — the same `renderer.keyInput` emitter that owns the running handler. Defer this navigation (e.g. a microtask/scheduler tick) so the dialog stack is never mutated mid-dispatch.
- Guaranteed exit: add a host-level `api.keymap.registerLayer` binding for closing the Suite dialog that does not depend on the embedded OpenTUI `useKeyboard` Escape handler, so a user can always get out even if raw-key forwarding into the custom renderer is unreliable for Escape specifically.
- `Landing.tsx` keyboard-handler consistency: call `key.preventDefault()` on every branch (arrow/Enter), matching every other screen, instead of only on `escape`.
- `safeScreenMount` signature/behavior: accept and actually invoke the fallback-close callback every call site already passes (currently silently dropped), and make the "falls back on any error, not just renderer-absence" behavior intentional and documented rather than accidental.
- `Catalog` pagination: wire real forward/back paging (`onPage` is currently a dead no-op; only forward paging exists) so users with more than one page of agents can return to earlier pages without closing and reopening the Suite.
- Diagnostics: log (at least once, de-duplicated) when the custom OpenTUI renderer is unavailable ("No renderer found"), instead of swallowing it with zero signal; remove or genuinely use `rendererMissingReported` (currently write-only dead state).
- `Create` screen: prevent the text-input Enter path from being handled by both `<input onSubmit>` and the component-level `useKeyboard` return handler simultaneously (avoid double-submit/double-advance).
- Test coverage: add interaction-level tests that actually mount screens through a real (or faithful) OpenTUI/Solid renderer double and simulate `keypress`/mouse events, asserting Enter activates the focused item, Escape closes/returns, and a simulated click on a rendered button's real hit-test box selects it. Extend or replace the `dialogHost()` test mock (currently has **no** `api.ui.Dialog` at all, so every existing "integration" test silently falls through to the legacy fallback branch and never exercises the real screens) so these are exercised for real.

### Out of Scope

- Any visual/product redesign of the landing, catalog, detail, modify, or create screens (layout, copy, ordering, colors) beyond what's strictly needed to fix the defects above.
- `SuiteConfig` shape, persistence, migrations, consent semantics, server entrypoint (`src/server/**`), and `src/core/**` business logic unrelated to TUI rendering/input.
- Confirming the exact OpenCode host-runtime behavior for Dialog box sizing or raw key/mouse forwarding beyond what can be verified from this plugin repo — flagged as an explicit residual risk/assumption, mitigated by the guaranteed-exit binding and defensive dimension handling rather than blocked on it.

## Capabilities

### Modified Capabilities

- `agent-suite-screens`: terminal-dimension source for responsive layout, deferred navigation on selection, guaranteed exit path, `Landing` keyboard-handler parity, `Catalog` bidirectional pagination, `Create` Enter double-fire guard.
- (test-only, no capability spec needed) TUI interaction test coverage for keyboard/mouse dispatch.

### New Capabilities

- None — this is a defect-fix change against existing delivered capabilities.

## Approach

1. **Dimension source fix**: introduce a helper that resolves the screens' "available box" from the actual Dialog allocation if the host API exposes it; otherwise fall back to `renderer.width/height` with `size:"xlarge"` requested explicitly, documenting the assumption. Thread this into `compact()`, `catalogColumns()`, and `buildCatalogPage`'s page-size computation (both dimensions).
2. **Deferred navigation**: wrap the `dialog.clear()`/`dialog.replace()` calls triggered from inside `useKeyboard` selection handlers in a microtask/scheduler tick (e.g. `queueMicrotask`) so the mutation happens after the current keypress dispatch completes, applied uniformly across all five screens' selection paths.
3. **Guaranteed exit**: register a dedicated keymap-layer binding (e.g. `Ctrl+Q` or the host's documented dialog-dismiss convention) at plugin-registration time that calls `close(api)` independent of any embedded-screen Escape handling.
4. **Consistency + hygiene fixes**: `Landing.tsx` preventDefault parity; `safeScreenMount` real 3-arg signature; `Catalog` real `onPage` wiring with back-paging; renderer-missing diagnostic logging (or removal of the dead `rendererMissingReported`); `Create` Enter-vs-onSubmit guard.
5. **Test coverage**: extend the test host double so it (a) provides an `api.ui.Dialog` implementation that actually mounts children through a real or faithful OpenTUI/Solid render path, and (b) exposes a way to simulate `renderer.keyInput` keypress events and mouse-down events at a rendered element's real hit-test box, then write assertions for Enter/Escape/click on each of the five screens.
6. Strict TDD throughout (RED failing test per fix → GREEN minimal implementation → REFACTOR), per project convention. Manual re-verification in a real terminal after implementation, given the native-FFI/renderer gap that let the original defects ship unnoticed.

## Review Workload Forecast

Estimated changed lines: ~500-700 (5 screen files + nav.ts + host-compat.ts + layout.ts + new/expanded interaction tests + test host double changes). 800-line budget risk: Low-Medium. Chained PRs: not required at this estimate, but will be reassessed at `sdd-tasks` if the interaction-test-harness work (item 5) grows larger than expected — that item is the least well-scoped piece (depends on what OpenTUI/Solid testing utilities are actually available) and is the most likely source of scope growth.
