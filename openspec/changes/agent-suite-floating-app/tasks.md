# Tasks: Agent Suite Floating App — Phase 1

> Gen-1 WU1 invalidated: 1,573 vs 800 + missing 80x24 harness. Reset sha256:d018…10bd preserved code; no rollback. Provenance only.

## Review Workload Forecast

| Field | Value |
|---|---|
| 400-line risk | High |
| Chained PRs | Yes |
| Split | WU1A→B→C→D→WU2→WU3→WU4 |
| Delivery | auto-chain |
| Chain | stacked-to-main |
| size:exception | WU1D ONLY — maintainer-authorized (~1,285); no other excepted |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

> Maintainer decisions: WU1D ~1,285 = sole `size:exception`; A/B/C bounded (<800). 80x24 Alt+S smoke deferred to deployed dist (source-only; OpenCode runs dist; stale dist = invalid).

### Recovery slices (WU1A→B→C→D; D sole excepted)

| # | Goal | Test | Harness | Rollback |
|---|------|----|---------|----|
| WU1A | nav+vm+tests | `vitest run test/agent-suite-nav.test.ts` | N/A | revert nav/vm/nav.test |
| WU1B | app/mount/shell/ctrl/error+tests | `vitest run test/agent-suite-mount.test.ts` | N/A | revert app/mount/ctrl/shell/landing/error/test |
| WU1C | index.tsx rewrite | `vitest run test/tui-registration.test.ts` | DEFERRED (SMOKE.1) | revert index.tsx |
| WU1D | tui-reg+delete legacy | `vitest run tui-registration.test.ts`+`typecheck` | DEFERRED (SMOKE.1/2) | revert+restore legacy — **size:exception (~1,285)** |

## P1: Foundation — WU1 Recovery/Acceptance (gates WU2)

- [x] 1A.1 Validate nav+vm vs `agent-suite-nav.test.ts`; exit 0
- [x] 1A.2 Confirm titlebar map, MAX_VISIBLE_ROWS=6, 3-seed/5-custom
- [x] 1B.1 Validate app+mount+ctrl+shell+landing+error; exit 0
- [x] 1B.2 Confirm closeOnce idempotency + replace=1/clear=0/clear=1
- [x] 1C.1 Validate `index.tsx`: safeHostAction+dialog.replace, onDispose, no routes
- [x] 1C.2 Maintainer-approved smoke deferral (DECISION, NOT runtime PASS): 80x24 Alt+S deferred to deployed dist; no smoke ran; 1C.1 stands
- [x] 1D.1 Validate tui-registration: zero route.* (TM Routing); disposers once; no slot
- [x] 1D.2 Confirm legacy deletions coherent w/ import graph; `typecheck` exit 0
- [x] 1D.3 Smoke decision recorded (DEFERRED): 80x24 Alt+S+`/agent-suite`+Back on first external dist; sole WU1D `size:exception` (~1,285) — no smoke ran; SMOKE.1/2/G remain pending
- [x] 1D.4 Acceptance gate: WU1A–D fresh-evidenced; code-contract recovery accepted; final runtime remains blocked by SMOKE.1/2/G

## P1b: Deployed-Runtime Smoke Gate (MANDATORY before final verify/archive)

- [ ] SMOKE.1 80x24 Alt+S on first external dist/server.js: one dialog, Esc closes once, caller route preserved, no clip/ghost
- [x] SMOKE.2 Max-height: 7 screens + modify no clip — deployed OpenCode 1.18.18 PASS after P1c (240x60; seven screens + modify, nested Esc, exact 3/5 options, Skills/Operaciones inline, warning/create, bounded frame)
- [ ] SMOKE.G Dispatcher gate: SMOKE.1+SMOKE.2 PASS before verify/archive; no completion until both pass

## P2: Catálogo+Info (WU2)

- [x] 2.1 RED `agent-suite-catalog.test.ts` — paging, focus, row capture
- [x] 2.2 RED `agent-suite-info.test.ts` — skills/ops/model/effort; keys
- [x] 2.3 GREEN `screens/{catalog,agent-info}.tsx`

## P3: Modify/Model/Effort/Delete (WU3)

- [x] 3.1 RED `agent-suite-modify.test.ts` — F5→menu; seed/custom; BACK
- [x] 3.2 GREEN `modify-panel.tsx` menu mode
- [x] 3.3 RED `agent-suite-model-effort.test.ts` — SELECT_* refresh+pop
- [x] 3.4 GREEN `screens/{model-select,effort-select}.tsx`
- [x] 3.5 RED `agent-suite-delete.test.ts` — unconfirmed rejects; write fail (TM FS)
- [x] 3.6 GREEN `delete-warning.tsx`+reducer delete

## P4: Crear+Edit+Adapter (WU4)

- [x] 4.1 RED `agent-suite-edit.test.ts` — EDIT_* commit+refresh; cancel discards (TM FS)
- [x] 4.2 GREEN extend `modify-panel.tsx` inline skills/ops+EDIT_*
- [x] 4.3 RED `agent-suite-create.test.ts` — 6 fields 0-5; required; createAgent once
- [x] 4.4 GREEN `create-agent.tsx`+reducer create
- [x] 4.5 GREEN complete `controller.ts` — busy/error/refresh; core untouched
- [x] 4.6 REFACTOR no native mid-flow; Enter→Input; theme reactive
- [x] 4.7 Deployed-smoke linkage/deferral recorded only; runtime not claimed. SMOKE.1/SMOKE.2/SMOKE.G remain pending.

## P1c: Deployed-Runtime Critical Corrections (forced chained slice)

- [x] FIX.1 RED/GREEN layout regression coverage and host-compatible bounded dialog correction for 80x24 and 240x60 geometry.
- [x] FIX.2 RED/GREEN nested Escape regression coverage and host keymap-layer Back interception; landing Escape remains host close.
- [x] FIX.G Focused tests, full source tests, typecheck, and Bun/OpenTUI geometry harness pass; deployed SMOKE.1/SMOKE.2/SMOKE.G remain unchecked until fresh external dist smoke.
