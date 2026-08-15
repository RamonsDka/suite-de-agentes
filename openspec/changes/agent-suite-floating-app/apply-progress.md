# Apply Progress: agent-suite-floating-app (cumulative WU1 recovery + WU2 + WU3 + WU4)

## Status
- Work unit: WU4 — Create + inline Skills/Operaciones + adapter; WU1 recovery, WU2, and WU3 evidence preserved below.
- Delivery: auto-chain, stacked-to-main; current slice WU4 only; no size exception.
- Apply mode: Strict TDD (Vitest).
- WU4 acceptance: yes for tasks 4.1–4.6; task 4.7 is deployed-smoke linkage/deferral only, not a runtime pass.
- Attempt token parent: `sha256:918920f0eba0aea029ffaada7e7d5752a03c8d724f9f68bee6ff27af0ad59ba4`
- Request ID: `wu4-apply-20260801-1325`
- WU4 changed-line objective: 757 lines in WU4-owned files, within 800; no size exception.
- Scope guard: no build, commit, push, review, desktop UI, or runtime smoke was run. Core modules were not changed.

## Preserved WU1/WU2/WU3 Evidence

WU1 recovery provenance, sole WU1D size-exception record, smoke deferral, WU2 focused evidence, and WU3 TDD/work-unit evidence are preserved from the previous cumulative record. WU1 code-contract recovery and WU2/WU3 focused source/test/typecheck acceptance remain accepted. SMOKE.1, SMOKE.2, and SMOKE.G remain pending.

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

## Work Unit Evidence — WU4

| Evidence | Result |
|---|---|
| Focused test command and exact result | `npx vitest run test/agent-suite-edit.test.ts test/agent-suite-create.test.ts test/agent-suite-controller.test.ts test/agent-suite-modify.test.ts test/agent-suite-model-effort.test.ts test/agent-suite-delete.test.ts test/agent-suite-nav.test.ts test/agent-suite-mount.test.ts` — exit 0; 8 files, 23 tests passed, 0 failed. |
| Broader non-build verification | `npm test` — exit 0; 21 files, 78 tests passed, 0 failed. `npm run typecheck` — exit 0 (`tsc --noEmit`). `git diff --check` — exit 0; whitespace check clean. Build intentionally not run. |
| Runtime harness command/scenario and exact result | **Deferred** — no runtime harness executed. WU4 links to deployed SMOKE.2 (max-height seven-screen/modify no-clip) and the dispatcher gate SMOKE.G; SMOKE.1/SMOKE.2/SMOKE.G remain unchecked. |
| Rollback boundary | Revert exactly WU4-owned `src/tui/agent-suite-controller.ts`, `src/tui/agent-suite-app.tsx` WU4 additions/wiring, `src/tui/agent-suite-nav.ts` WU4 additions, `src/tui/screens/modify-panel.tsx`, `src/tui/screens/create-agent.tsx`, `test/agent-suite-edit.test.ts`, `test/agent-suite-create.test.ts`, `test/agent-suite-controller.test.ts`, and the minimal controller-factory wiring in `src/tui/index.tsx`. Do not revert WU1–WU3 modules, SMOKE artifacts, or unrelated working-tree changes. |

## Deviations and Risks

- Adapter construction supports the default suite persistence path and runtime state; deployed runtime rendering remains external to this source-only apply. This is an explicit WU4 integration risk, not a claimed runtime pass.
- The current WU4 tests prove controller operation names and mutation isolation, while deployed host wiring remains source-only until external dist smoke. No runtime PASS is claimed.
- `materialize` remains adapter-owned and confirmation is represented by the existing explicit flow boundary; no native mid-flow UI was introduced.

## Remaining Tasks and Gates

- [ ] SMOKE.1 80x24 Alt+S on first external dist/server.js
- [ ] SMOKE.2 max-height seven-screen/modify gate
- [ ] SMOKE.G dispatcher gate

## Status

WU4 assigned tasks 4.1–4.7: **7/7 checked in tasks.md**, with 4.7 explicitly recorded as deployed-smoke linkage/deferral only. WU4 accepted for source tests/typecheck and adapter/UI contract evidence. Final verify/archive remain blocked by SMOKE.1/SMOKE.2/SMOKE.G.
