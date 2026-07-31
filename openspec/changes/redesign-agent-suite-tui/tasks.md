# Tasks: Redesign Suite de Agentes TUI

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1 200 (5 new screens + 2 new core files + 3 new test files + 2 modified files + 2 modified test files) |
| 800-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 → PR2 → PR3 → PR4 → PR5 (stacked to main) |
| Delivery strategy | auto-forecast |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | `core/effort.ts` + `tui/layout.ts` | PR1 | `npm test -- effort layout` | N/A — pure mappers, no UI mount | Delete `effort.ts`, `layout.ts`, revert `host-compat.ts` effort import |
| 2 | `screens/nav.ts` + landing + fallback guard | PR2 | `npm test -- nav landing tui-registration` | Alt+S opens landing in local dev plugin | Delete `screens/nav.ts`, `screens/landing.tsx`; restore `index.tsx` |
| 3 | `screens/catalog.tsx` + responsive matrix | PR3 | `npm test -- catalog screens` | Navigate to Catálogo, resize terminal | Delete `screens/catalog.tsx`; revert catalog routing |
| 4 | `screens/detail.tsx` + `screens/modify.tsx` + confirm | PR4 | `npm test -- detail modify screens` | Select agent → Modify/Delete flow | Delete `detail.tsx`, `modify.tsx`; revert nav transitions |
| 5 | `screens/create.tsx` + typecheck clean | PR5 | `npm test && npm run typecheck` | Create agent → verify in catalog | Delete `screens/create.tsx`; revert create nav |

---

## Phase 1 — Core Mapping (PR1 · ~150 LOC)

- [x] 1.1 **RED** `test/effort.test.ts` — failing cases: `default` always first; unsupported variants dropped; empty runtime → only `default`; normalize raw keys.
- [x] 1.2 **GREEN** Create `source/revision-selector-agente/src/core/effort.ts`: export `EFFORT_ORDER`, `normalizeEffortOptions(runtimeVariants)`.
- [x] 1.3 **RED** `test/layout.test.ts` — failing cases: `catalogColumns` breakpoints (60→1, 85→2, 110→3); `paginate` slice+hasMore; `focusedBorderColor` uses `borderActive` token.
- [x] 1.4 **GREEN** Create `source/revision-selector-agente/src/tui/layout.ts`: export `catalogColumns`, `paginate`, `RING_STYLE` (`focusedBorderColor: theme.borderActive`). No logic in `core/effort.ts`.
- [x] 1.5 **REFACTOR** Extract shared `VOCAB` constant; ensure `normalizeEffortOptions` is a pure function with zero side-effects.

## Phase 2 — Nav State Machine + Landing + Fallback (PR2 · ~300 LOC)

- [x] 2.1 **RED** Extend `test/tui-registration.test.ts` — failing: Alt+S → landing mounts; `/agent-suite` → same landing; Esc on landing → no mutation.
- [x] 2.2 **RED** Extend `test/host-compat.test.ts` — failing: `safeScreenMount` with no renderer → returns false and caller falls back to dialog chain.
- [x] 2.3 **GREEN** Create `source/revision-selector-agente/src/tui/screens/nav.ts`: `ScreenState` union type, `reduceScreen` pure reducer, `safeScreenMount` guard (catches `"No renderer found"`).
- [x] 2.4 **GREEN** Create `source/revision-selector-agente/src/tui/screens/landing.tsx`: framed `<box border title focusedBorderColor={theme.borderActive}>`, version from `src/version.ts`, two focus slots `[Catálogo, Crear agente]`, compact mode when `rows < 20`.
- [x] 2.5 **GREEN** Modify `source/revision-selector-agente/src/tui/index.tsx`: call `safeScreenMount(<Dialog>{<Landing/>}</Dialog>)`; on false keep existing dialog chain intact.
- [x] 2.6 **GREEN** Modify `source/revision-selector-agente/src/tui/host-compat.ts`: extend guard to propagate `safeScreenMount` return; existing fallback paths untouched.
- [x] 2.7 **REFACTOR** Verify `reduceScreen` covers all back/cancel paths; remove any dead dialog branches shadowed by screen routing.

## Phase 3 — Catalog Matrix (PR3 · ~300 LOC)

- [x] 3.1 **RED** Add to `test/catalog.test.ts` — failing: 3-col/2-col/1-col layout by width; `Más…` shown when overflow; `Más…` hidden on last page; empty catalog shows Spanish empty-state; `Más…` advances page.
- [x] 3.2 **GREEN** Create `source/revision-selector-agente/src/tui/screens/catalog.tsx`: uses `catalogColumns(useTerminalDimensions().columns)` + `paginate`; wraps boxes in 2-D grid; `Más…` cell at end when `hasMore`; single-column list when `columns===1`; all colors from theme tokens.
- [x] 3.3 **REFACTOR** Extract `CatalogCell` sub-component; verify keyboard ring uses `borderActive` only.

## Phase 4 — Detail, Modify, Confirm Delete (PR4 · ~300 LOC)

- [x] 4.1 **RED** Create `test/screens.test.tsx` — failing: detail shows name, description, skill chips, operations; Modify/Delete shown only for custom agents; confirm-delete focuses `No` by default; Enter without moving focus → decline; model→effort→Esc → detail, model not persisted.
- [x] 4.2 **GREEN** Create `source/revision-selector-agente/src/tui/screens/detail.tsx`: chips, operations list, `[Modificar][Eliminar][Volver]` (Eliminar hidden for seed), confirm-delete inline (`[No][Sí]`, default focus `No`).
- [x] 4.3 **GREEN** Create `source/revision-selector-agente/src/tui/screens/modify.tsx`: two sub-screens — model selector → `reduceScreen("model-chosen")` → effort selector using `normalizeEffortOptions`; Esc on effort returns to detail without persisting.
- [x] 4.4 **REFACTOR** Merge confirm-delete into `detail.tsx` state if same file keeps cohesion; keep component under 150 lines.

## Phase 5 — Create Flow + Typecheck (PR5 · ~150 LOC)

- [x] 5.1 **RED** Extend `test/screens.test.tsx` — failing: create steps complete → save → new agent in catalog; mid-create Esc → no agent persisted; `draft` partial type enforced.
- [x] 5.2 **GREEN** Create `source/revision-selector-agente/src/tui/screens/create.tsx`: multi-step form, `draft: Partial<CustomAgent>`, saves via existing `materializeGlobalAgent`; Esc triggers `reduceScreen("cancel")` → no persistence.
- [x] 5.3 Run `npm run typecheck` (no build); fix any residual type errors across all new files.
- [x] 5.4 Run `npm test`; confirm all pre-existing suites still green; record full test output as implementation evidence.

---

## Specs-to-Tests Mapping

| Spec requirement | Test owner | Scenarios covered |
|------------------|------------|-------------------|
| Fixed effort order + filtering | `test/effort.test.ts` (new) | Default first; unsupported dropped; empty runtime |
| Breakpoints + pagination | `test/layout.test.ts` (new) | 60/85/110 cols; page slice+hasMore |
| `focusedBorderColor` = `borderActive` | `test/layout.test.ts` (new) | Token-only rendering |
| Suite entry (Alt+S, `/agent-suite`) | `test/tui-registration.test.ts` (extended) | Hotkey entry; command entry; Esc no-mutation |
| No-renderer fallback per screen | `test/host-compat.test.ts` (extended) | `safeScreenMount` → false → legacy chain |
| Responsive matrix layout | `test/catalog.test.ts` (extended) | Wide/narrow/short; Más… overflow; empty state |
| Detail content + Modify/Delete access | `test/screens.test.tsx` (new) | Structured detail; seed agent no Delete |
| Confirm-delete defaults No | `test/screens.test.tsx` (new) | Enter without move → decline |
| Cancel/back no mutation | `test/screens.test.tsx` (new) | Modify→Esc; create→Esc |
| Create save + abort | `test/screens.test.tsx` (new) | Save→catalog; Esc→no agent |
| No SuiteConfig schema change | `test/config.test.ts` (existing, no change) | Existing invariant already covers |
