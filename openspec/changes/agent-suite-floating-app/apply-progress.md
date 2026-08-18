# Apply Progress: agent-suite-floating-app (cumulative WU1 recovery + WU2 + WU3 + WU4 + critical runtime corrections)

## Status
- Work unit: P1c critical deployed-runtime corrections — bounded dialog geometry + nested Escape interception; WU1 recovery, WU2, WU3, and WU4 evidence preserved below.
- Delivery: auto-chain, stacked-to-main; current slice P1c only; no size exception.
- Apply mode: Strict TDD (Vitest).
- WU4 acceptance: yes for tasks 4.1–4.6; task 4.7 is deployed-smoke linkage/deferral only, not a runtime pass. P1c source correction acceptance: yes; deployed smoke remains pending.
- Attempt token parent: `sha256:918920f0eba0aea029ffaada7e7d5752a03c8d724f9f68bee6ff27af0ad59ba4`
- Request ID: `wu4-apply-20260801-1325`
- WU4 changed-line objective: 757 lines in WU4-owned files, within 800; no size exception. P1c authored delta: 210 additions/deletions including tests and artifact updates; within the 400-line review budget.
- Scope guard: no build, install, dist regeneration, commit, push, review, desktop UI, or deployed smoke was run. Core modules were not changed. `npm test`, `npm run typecheck`, and a source Bun/OpenTUI geometry harness were allowed verification only.

## Preserved WU1/WU2/WU3 Evidence

WU1 recovery provenance, sole WU1D size-exception record, smoke deferral, WU2 focused evidence, and WU3 TDD/work-unit evidence are preserved from the previous cumulative record. WU1 code-contract recovery and WU2/WU3 focused source/test/typecheck acceptance remain accepted. SMOKE.1, SMOKE.2, and SMOKE.G remain pending.

## P1c Critical Runtime Corrections

- `src/tui/agent-suite-mount.tsx` now uses `SUITE_DIALOG_SIZE = "medium"`, matching the host's bounded dialog width instead of the deployed host's clipping `large` width. The mount registers an opening-scoped nested Escape handler and unregisters it on close.
- `src/tui/screens/suite-shell.tsx` now uses intrinsic host-relative bounds (`width/maxWidth/maxHeight: 100%`, `minWidth: 0`, `flexShrink: 1`, `overflow: hidden`) and removes shell padding that consumed narrow host geometry.
- `src/tui/index.tsx` registers `agent-suite.escape` on the host keymap layer at priority 110 with default event consumption. It delegates to the active suite handler only when the app is nested; landing Escape returns false so the host Dialog close command remains responsible for final close.
- `src/tui/agent-suite-app.tsx` exposes a pure `handleNestedScreenEscape` contract and registers it while mounted; root Escape handling remains the exact landing close path and internal Back path.
- Tests extended in `test/agent-suite-mount.test.ts`, `test/agent-suite-edit.test.ts`, and `test/tui-registration.test.ts`.

## WU4 Scope and Files

- `test/agent-suite-edit.test.ts` — strict-TDD RED/GREEN/triangulation for inline skills/operations commit, refresh, cancel, seed restriction, and failure retention.
- `src/tui/screens/modify-panel.tsx` — inline Skills selectable list and Operaciones Input; reactive theme tokens and in-panel errors.
- `test/agent-suite-create.test.ts` — strict-TDD RED/GREEN/triangulation for six ordered fields, required/slug/unique validation, draft retention, and Input Enter ownership.
- `src/tui/screens/create-agent.tsx` — six-step CreateDraft form and pure validation helpers.
- `src/tui/agent-suite-nav.ts` — WU4 edit/create events, editable custom/seed boundary, and draft transitions.
- `src/tui/agent-suite-app.tsx` — adapter operation helpers, create/edit wiring, Input Enter ownership, custom propagation, busy/error handling, reactive screens.
- `src/tui/agent-suite-controller.ts` — adapter boundary for create, model, effort, skills, operations, delete, materialize, snapshot/refresh and persistence; core modules unchanged.
- `test/agent-suite-controller.test.ts` — adapter boundary and defensive snapshot coverage.
- `src/tui/index.tsx` — default persistence-path and runtime-state injection into the controller factory.

## TDD Cycle Evidence — WU4

| Task | Test file | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 4.1 | `test/agent-suite-edit.test.ts` | Unit + adapter boundary | WU3 focused baseline: 5 files, 14 tests passed | `npx vitest run test/agent-suite-edit.test.ts` — exit 1; `applyInlineEdit` missing | `npx vitest run test/agent-suite-edit.test.ts` — exit 0; 1 file, 3 tests passed | Skills toggled through two distinct indexes; operations rejection preserves pending prompt; seed options exclude edit modes | Extracted `applyInlineEdit`; commit/cancel/error stay behind controller boundary |
| 4.2 | `test/agent-suite-edit.test.ts` | Unit + screen contract | Same WU4 edit baseline | Covered by 4.1 RED | `npx vitest run test/agent-suite-edit.test.ts` — exit 0; 3 tests passed | Custom skills and operations paths plus seed restriction | Shared modify option mapping and paired selected foreground/background tokens |
| 4.3 | `test/agent-suite-create.test.ts` | Unit + reducer/controller boundary | WU3 focused baseline: 5 files, 14 tests passed | `npx vitest run test/agent-suite-create.test.ts` — exit 1; missing `create-agent.tsx` import | `npx vitest run test/agent-suite-create.test.ts` — exit 0; initially 3 tests, final 4 tests passed | Six ordered fields, required/invalid/duplicate validation, retained values, and Input-owned Enter | Pure `validateCreateDraft`/field mapping; no creation through modification methods |
| 4.4 | `test/agent-suite-create.test.ts` | Unit + screen contract | Same WU4 create baseline | Covered by 4.3 RED | `npx vitest run test/agent-suite-create.test.ts` — exit 0; 4 tests passed | Full draft passed once to `createAgent`; no `setSkills`/`setOperations` calls | Create form owns Input submit; root key mapping ignores create Enter |
| 4.5 | `test/agent-suite-controller.test.ts` | Unit + adapter boundary | WU4 focused baseline: 8 files, 22 tests passed before final assertion addition | New adapter test initially failed on unknown custom row, then implementation fixed it | `npx vitest run test/agent-suite-controller.test.ts` — exit 0; 2 tests passed | Defensive snapshots, all named operations, custom row mutation, creation row materialization | Centralized mutation/persist/rebuild adapter flow; core modules unchanged |
| 4.6 | `test/agent-suite-create.test.ts`, `test/agent-suite-model-effort.test.ts`, WU3 screen tests | Unit + screen contract | Full WU3/WU4 focused baseline | Enter ownership regression was intentionally made RED: event helper returned `CREATE_NEXT` | `npx vitest run test/agent-suite-create.test.ts test/agent-suite-model-effort.test.ts` — exit 0; 5 tests passed | Reactive `theme.current` remains in screen render closures; busy transitions cover model/effort; no native DialogSelect/Prompt/Confirm/Alert references in WU4 flow | Removed root create Enter transition; retained bounded existing shell/screens |
| 4.7 | deployed smoke gate linkage | Runtime smoke deferred | N/A — deployed runtime is external | N/A — no runtime claim permitted | N/A — no runtime claim permitted | Linkage recorded to SMOKE.2; no smoke executed | N/A |

## TDD Cycle Evidence — P1c Critical Runtime Corrections

| Task | Test file | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| FIX.1 | `test/agent-suite-mount.test.ts` + Bun/OpenTUI harness | Host contract + source runtime geometry | Prior full suite: 21 files, 85 tests passed | New geometry contract was written before the correction; Vitest OpenTUI renderer probe failed with unavailable native FFI, so no fake Vitest rendering layer was introduced. | `npm test` — exit 0; 21 files, 89 tests passed. `npm run typecheck` — exit 0. Bun/OpenTUI geometry harness — exit 0; 80x24 and 240x60 both reported title/right/bottom/bounded true. | Two geometries; host `large` width 88 was checked against OpenCode source and replaced with medium; no FFI tests fabricated. | Consolidated bounds in `SUITE_SHELL_LAYOUT`; no broad screen refactor. |
| FIX.2 | `test/agent-suite-edit.test.ts`, `test/tui-registration.test.ts`, `test/agent-suite-mount.test.ts` | Pure navigation + host keymap contract | Prior focused baseline: 4 files, 21 tests passed | Added nested Escape contract and host binding expectations before implementation; focused RED was expected against missing handler/command. | `npx vitest run test/agent-suite-edit.test.ts test/agent-suite-mount.test.ts test/tui-registration.test.ts test/agent-suite-nav.test.ts` — exit 0; 4 files, 25 tests passed. `npm test` — exit 0; 21 files, 89 tests passed. | Verified nested handler returns Back/consumes exactly once; landing/no-handler returns false, preserving host close. | Kept reducer unchanged; added adapter-level handler and one keymap command only. |

## Work Unit Evidence — WU4

| Evidence | Result |
|---|---|
| Focused test command and exact result | `npx vitest run test/agent-suite-edit.test.ts test/agent-suite-create.test.ts test/agent-suite-controller.test.ts test/agent-suite-modify.test.ts test/agent-suite-model-effort.test.ts test/agent-suite-delete.test.ts test/agent-suite-nav.test.ts test/agent-suite-mount.test.ts` — exit 0; 8 files, 23 tests passed, 0 failed. |
| Broader non-build verification | `npm test` — exit 0; 21 files, 78 tests passed, 0 failed. `npm run typecheck` — exit 0 (`tsc --noEmit`). `git diff --check` — exit 0; whitespace check clean. Build intentionally not run. |
| Runtime harness command/scenario and exact result | **Deferred** — no runtime harness executed. WU4 links to deployed SMOKE.2 (max-height seven-screen/modify no-clip) and the dispatcher gate SMOKE.G; SMOKE.1/SMOKE.2/SMOKE.G remain unchecked. |
| Rollback boundary | Revert exactly WU4-owned `src/tui/agent-suite-controller.ts`, `src/tui/agent-suite-app.tsx` WU4 additions/wiring, `src/tui/agent-suite-nav.ts` WU4 additions, `src/tui/screens/modify-panel.tsx`, `src/tui/screens/create-agent.tsx`, `test/agent-suite-edit.test.ts`, `test/agent-suite-create.test.ts`, `test/agent-suite-controller.test.ts`, and the minimal controller-factory wiring in `src/tui/index.tsx`. Do not revert WU1–WU3 modules, SMOKE artifacts, or unrelated working-tree changes. |

## Work Unit Evidence — P1c Critical Runtime Corrections

| Evidence | Result |
|---|---|
| Focused test command and exact result | `npx vitest run test/agent-suite-edit.test.ts test/agent-suite-mount.test.ts test/tui-registration.test.ts test/agent-suite-nav.test.ts` — exit 0; 4 files, 25 tests passed, 0 failed. |
| Broader non-build verification | `npm test` — exit 0; 21 files, 89 tests passed, 0 failed. `npm run typecheck` — exit 0 (`tsc --noEmit`). `git diff --check` — exit 0. Build intentionally not run. |
| Runtime harness command/scenario and exact result | `bun -e '<source OpenTUI test renderer geometry harness>'` — exit 0; source host wrapper at 80x24 and 240x60 rendered the title and complete right/bottom corners with every captured line bounded by the target width. This is a source runtime harness, not deployed smoke. Deployed SMOKE.1/SMOKE.2/SMOKE.G remain unchecked. |
| Rollback boundary | Revert exactly `src/tui/agent-suite-mount.tsx`, `src/tui/agent-suite-app.tsx`, `src/tui/index.tsx`, `src/tui/screens/suite-shell.tsx`, `test/agent-suite-mount.test.ts`, `test/agent-suite-edit.test.ts`, and `test/tui-registration.test.ts` for this correction slice. Preserve WU1–WU4 behavior, original `verify-report.md` smoke FAIL evidence, and unrelated `.atl` changes. |

## Deviations and Risks

- Adapter construction supports the default suite persistence path and runtime state; deployed runtime rendering remains external to this source-only apply. This is an explicit WU4 integration risk, not a claimed runtime pass.
- The current WU4 tests prove controller operation names and mutation isolation, while deployed host wiring remains source-only until external dist smoke. No runtime PASS is claimed.
- `materialize` remains adapter-owned and confirmation is represented by the existing explicit flow boundary; no native mid-flow UI was introduced.
- Host compatibility finding: OpenCode's Dialog source uses fixed widths (medium 60, large 88) and `maxWidth = terminal width - 2`; the deployed large suite was clipped at both requested geometries. The correction chooses the smallest host-compatible size and bounds the suite shell rather than introducing terminal-dimension math.
- Host keymap finding: OpenCode's Dialog Escape is a host keymap binding, not a renderable child event. The suite's priority-110 `agent-suite.escape` command intercepts only nested screens; returning false on landing preserves the host's close behavior and closeOnce accounting.

## Remaining Tasks and Gates

- [ ] SMOKE.1 80x24 Alt+S on first external dist/server.js
- [x] SMOKE.2 max-height seven-screen/modify gate — deployed OpenCode 1.18.18 PASS after P1c
- [ ] SMOKE.G dispatcher gate

## Status

WU4 assigned tasks 4.1–4.7: **7/7 checked in tasks.md**, with 4.7 explicitly recorded as deployed-smoke linkage/deferral only. P1c FIX.1/FIX.2/FIX.G: **3/3 checked in tasks.md**. Source tests/typecheck and source runtime geometry evidence pass. The fresh external dist rerun below passes SMOKE.2; final verify/archive remain blocked by SMOKE.1 and therefore SMOKE.G.

## Final Deployed-Runtime Rerun — 2026-08-15

- Runtime: actual OpenCode `1.18.18`, isolated ephemeral config pointing to current `dist/server.js` and `dist/tui.js`; no global config mutation.
- Dist identity: server 5042 bytes / SHA256 `D910DB791E6A9B031ED6379BA6649E0EAEA775E1FAB621A785A7C93F1B3BB64E`; TUI 73002 bytes / SHA256 `67CFA61B765E709EDC1446C9FBB55A37A2360C4084B0F5CC5082CEBB7BB6DE90`.
- SMOKE.1 (80x24): **FAIL**. One dialog, close-once, caller route, no ghost, and right-edge bounding pass; outer bottom border/bottom-right corner and lower keybar remain below row 24.
- SMOKE.2 (240x60): **PASS**. All seven screens plus modify traversed; nested Escape walks back; seed/custom options are exactly 3/5; Skills and Operaciones render inline; warning and create flows render; complete bounded frame observed.
- SMOKE.G: **FAIL**, because SMOKE.1 is still failing.
- Task state after rerun: SMOKE.2 checked; SMOKE.1 and SMOKE.G remain unchecked. Final verify/archive remain blocked only by 80x24 vertical fit.
- Evidence: `C:\Users\DELL\AppData\Local\Temp\opencode\suite-smoke-verify\artifacts\p1c-final-smoke1`, `p1c-final-smoke2`, and `p1c-final-operations-probe`; full hashes and canonical evidence preimage are in `verify-report.md`.
