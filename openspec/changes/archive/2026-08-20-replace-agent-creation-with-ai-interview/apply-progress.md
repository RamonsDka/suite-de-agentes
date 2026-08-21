# Apply Progress: Replace Agent Creation with AI Interview

## Status

- **Change**: `replace-agent-creation-with-ai-interview`
- **Mode**: Strict TDD
- **Artifact store**: OpenSpec
- **Delivery**: `auto-chain`, `feature-branch-chain`
- **Current work unit**: Unit 4 / Phase 4 — wizard retirement, atomic approval persistence, post-approval pending-skill ingestion, and full implementation verification
- **PR 4 boundary**: Targets the immediate Unit 3 branch and contains only legacy-flow retirement, manual review/editor preservation, final controller persistence and pending-skill ingestion, dead one-shot coordinator cleanup, and full implementation checks.
- **Fresh continuation**: Maintainer-authorized native reset completed before this continuation. Same active attempt token: `sha256:df658ac6b651b6b8f5b87526eca85698a99ec1cc2e29b84b28c5ace72d880969`.
- **Native attempt state**: Acquired with `request-id=apply-unit4-ingestion-20260819-1511-worker-acquire`, `work-unit=unit-4-complete-safe-skill-ingestion`, `evidence-goal=TDD proof for post-approval pending-skill ingestion and no-write failure paths`, `max-attempts=2`, and `max-changed-lines=400`; state was `proceed`. Settlement remains parent-owned and was not run by this worker.

## Completed Tasks

### Phase 1 / Unit 1

- [x] 1.1 RED tests for strict turn parsing, quick-reply bounds, malformed-turn fallback, injection rejection, transcript replay, and modify-mode prompt seeding.
- [x] 1.2 GREEN interview type definitions.
- [x] 1.3 GREEN interview prompt builder, parser, replay runner, cancellation, and checkpoint fallback.
- [x] 1.4 REFACTOR contained coordinator helper organization and focused-core verification.

### Phase 2 / Unit 2

- [x] 2.1 RED navigation, gate, transcript-preservation, cancellation, malformed-turn recovery, checkpoint, and focus-order tests.
- [x] 2.2 GREEN `ai-interview` route, `INTERVIEW_*` events, and gated creation navigation.
- [x] 2.3 GREEN focused interview screen with one question, bounded quick replies, free text, checkpoint summary, review seam, retry, and cancel controls.
- [x] 2.4 GREEN app-level in-memory session signal, per-turn coordinator execution, AbortSignal cancellation, retry, and error recovery.
- [x] 2.5 REFACTOR consolidated interview reset/turn handlers, focus mapping, and screen integration.

### Phase 3 / Unit 3

- [x] 3.1 RED safe-field editing, model rationale, three review actions, request-changes re-entry, no-pre-approval persistence, permission-boundary, and pending-skill tests.
- [x] 3.2 GREEN installed-first skill normalization and pending-skill isolation.
- [x] 3.3 GREEN safe-field preview editing, rationale display, and exact `Approve` / `Request changes` / `Discard` actions.
- [x] 3.4 REFACTOR standardized review action handling and product-owned permissions.

### Phase 4 / Unit 4

- [x] 4.1 RED integration tests prove configured `Crear agente` opens `ai-interview`, unconfigured entry opens `ai-gate` with exactly `Configurar ahora` / `Cancelar`, gate cancellation performs no writes, and no `ai-request` or wizard route remains in source or live navigation.
- [x] 4.2 GREEN removed the user-facing wizard route and reduced `create-agent.tsx` to an unused legacy/manual compatibility module; the live app renders only interview, preview, and existing modify surfaces.
- [x] 4.3 GREEN wired final review approval to the live controller/mount safe-ingestion path. Controller persistence runs exactly once before ingestion; installed skills are skipped; pending skills use the existing frozen-plan/atomic installer; invalid approval, Request changes, Discard, cancellation, and persistence failure do not ingest; ingestion errors are surfaced without repeating agent persistence; permissions remain product-owned.
- [x] 4.4 REFACTOR removed one-shot coordinator exports and all `ai-request` route/event/render references; full test, typecheck, build, and whitespace checks pass.

## TDD Cycle Evidence

| Task | Test file | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `test/coordinator.test.ts` | Unit | ✅ 5/5 baseline | ✅ 5 interview cases failed before exports | ✅ 11/11 focused tests | ✅ bounds, malformed fallback, injection, replay, modify seed | ✅ pure parser helpers retained |
| 1.2 | `test/coordinator.test.ts` | Unit/type | ✅ prior core suite | ✅ missing types imported | ✅ focused tests/typecheck passed | ➖ structural type contract | ✅ shared types retained |
| 1.3 | `test/coordinator.test.ts` | Unit | ✅ prior core suite | ✅ missing prompt/parser/runner exports | ✅ 11/11 focused tests | ✅ valid, malformed, injection, replay, cancel | ✅ abort wrapper and normalization isolated |
| 1.4 | `test/coordinator.test.ts` | Unit | ✅ focused core suite | ✅ refactor protected by green tests | ✅ focused tests/typecheck passed | ✅ legacy behavior plus interview paths | ✅ one-shot removal deferred until Unit 4 |
| 2.1 | `test/agent-suite-nav.test.ts` | Unit/integration seam | ✅ 20/20 baseline | ✅ route/gate/session tests failed before route implementation | ✅ 26/26 focused tests | ✅ configured/unconfigured, cancel, retry, malformed, focus | ✅ stable reducer assertions |
| 2.2 | `test/agent-suite-nav.test.ts` | Unit | ✅ navigation baseline | ✅ missing route/events | ✅ 26/26 | ✅ all creation entry events | ✅ explicit route transitions |
| 2.3 | `test/agent-suite-nav.test.ts` | Screen contract | N/A new screen | ✅ missing screen helpers | ✅ focused screen/navigation tests | ✅ reply bounds, free text, summary, actions | ✅ existing TUI primitives reused |
| 2.4 | `test/agent-suite-nav.test.ts` | Integration seam | ✅ navigation baseline | ✅ missing app session helpers | ✅ 26/26 plus typecheck | ✅ abort, retry, checkpoint preservation | ✅ app signal owns session |
| 2.5 | `test/agent-suite-nav.test.ts` | Unit | ✅ 26/26 | ✅ refactor protected | ✅ focused tests passed | ✅ focus/key/title paths | ✅ handler consolidation |
| 3.1 | `test/ai-preview.test.ts`, `test/coordinator.test.ts` | Unit/integration seam | ✅ 54/54 prior focused | ✅ 3 new review tests failed before implementation | ✅ focused review suite passed | ✅ six fields, rationale, three actions, re-entry, pending | ✅ helper extraction |
| 3.2 | `test/coordinator.test.ts` | Unit | ✅ prior coordinator suite | ✅ pending normalization missing | ✅ focused suite passed | ✅ installed vs pending branches | ✅ existing recommend path reused |
| 3.3 | `test/ai-preview.test.ts` | Screen contract | ✅ prior preview suite | ✅ missing helpers | ✅ focused preview suite passed | ✅ safe fields and actions | ✅ review renderer remains compact |
| 3.4 | `test/ai-preview.test.ts`, `test/agent-suite-controller.test.ts` | Integration seam | ✅ 66/66 | ✅ permission-boundary cleanup protected | ✅ 81/81 related tests | ✅ no AI permission/system prompt forwarding | ✅ controller remains authority |
| 4.1 | `test/agent-suite-nav.test.ts`, `test/ai-preview.test.ts` | Integration seam | ✅ 81/81 Unit 1–3 related tests | ✅ route-retirement and approval/no-write tests failed before cleanup | ✅ focused Unit 4 route/preview harness passed | ✅ configured/unconfigured, cancellation, no legacy references, approval, request/discard, validation failure | ✅ assertions use route/source behavior |
| 4.2 | `test/agent-suite-create.test.ts`, `test/agent-suite-nav.test.ts` | Unit/integration seam | ✅ 75/75 related tests | ✅ manual-only/route-retirement assertions failed before cleanup | ✅ focused suite passed | ✅ manual safe-field contract and no step-3 AI branch | ✅ dead wizard navigation removed |
| 4.3 | `test/ai-preview.test.ts`, `test/agent-suite-controller.test.ts`, `test/agent-suite-mount.test.ts` | Mounted/controller integration | ✅ 76-test prior Unit 4 safety net | ✅ New mounted-ingestion tests failed before controller/mount wiring: no controller ingestor, no installer adapter, and no mount prop | ✅ `npm test -- test/agent-suite-nav.test.ts test/agent-suite-create.test.ts test/agent-suite-controller.test.ts test/agent-suite-mount.test.ts test/ai-preview.test.ts test/skill-install.test.ts test/skill-package.test.ts test/skill-catalog.test.ts` → exit 0; 8 files, 101 tests | ✅ create and modify; two pending skills; installed-skill skip; invalid approval; Request changes/Discard/cancel no-write; persistence failure no ingestion; ingestion failure no duplicate persistence; exact permissions; live mount prop and callback | ✅ reused `buildIntegrationPlan`/`installSkill`; controller is the single product-owned adapter |
| 4.4 | Full project | Integration | ✅ focused 112/112 before continuation | ➖ verification/cleanup task; no fabricated RED claim | ✅ `npm test` → exit 0; 31 files, 272 tests | ✅ typecheck, build, diff hygiene | ✅ removed one-shot coordinator exports and `ai-request` route/event/render references |

## Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Baseline focused safety net | `npm test -- test/agent-suite-nav.test.ts test/agent-suite-create.test.ts test/agent-suite-controller.test.ts test/ai-preview.test.ts test/coordinator.test.ts` — exit 0; 5 files, 76 tests passed before the fresh 4.3 continuation edits. |
| Genuine RED for continuation | `npm test -- test/ai-preview.test.ts test/agent-suite-controller.test.ts` — exit 1; 2 files, 3 failures after the new mounted-ingestion tests and before production wiring: controller did not expose `ingestPendingSkills`, the safe installer was not connected, and `applyApprovedInterview` reported that ingestion was unavailable. |
| Focused GREEN/runtime harness | `npm test -- test/agent-suite-nav.test.ts test/agent-suite-create.test.ts test/agent-suite-controller.test.ts test/agent-suite-mount.test.ts test/ai-preview.test.ts test/skill-install.test.ts test/skill-package.test.ts test/skill-catalog.test.ts` — exit 0; 8 files, 101 tests passed. This includes mounted app prop wiring, live controller callback execution, create/update exactly-once persistence, post-persistence installation ordering, two pending skills, installed-skill skip, no-write failure paths, rollback of assignment state, safe installer failure surfacing, and permissions. |
| Final test command | `npm test` — exit 0; 31 files, 272 tests passed. |
| Final typecheck | `npm run typecheck` — exit 0; TypeScript completed without diagnostics. |
| Final build | `npm run build` — exit 0; server, TUI, and core ESM entries built successfully. |
| Final diff hygiene | `git diff --check` — exit 0; no whitespace errors. |
| Native continuation evidence | Same attempt token `sha256:df658ac6b651b6b8f5b87526eca85698a99ec1cc2e29b84b28c5ace72d880969`; acquire returned `state: proceed`. The worker ran `gentle-ai sdd-attempt finish` with request id `apply-unit4-ingestion-20260819-1511-worker-finish`; it returned `outcome: passed`, `evidence_revision: sha256:7350debc83bd450c8cad0d1b38a7443382d63f06a14e3d3fc66c78a0fb75c8f1`, `finish_candidate_identity: sha256:d772f2e2eec5840575d25f8270fe8e5d4e35eb3c501ce99762fe50a0210a0abc`, `finish_candidate_tree: 4a24e053fd312fa8164ced0d008921057ea0d3d3`, and `changed_lines: 129`. No `sdd-attempt settle` command was run; settlement remains parent-owned. |
| Runtime harness boundary | The mounted harness uses the real `mountAgentSuite` prop path and `createAgentSuiteController` safe installer with isolated temporary home/config directories. It performs no live network request, real user-home write, shell execution, commit, review, or PR operation. |
| Rollback boundary | Revert only the continuation additions in `src/core/skill-install.ts`, `src/tui/agent-suite-controller.ts`, `src/tui/agent-suite-app.tsx`, `src/tui/agent-suite-mount.tsx`, `src/tui/index.tsx`, the three Unit 4 owner test files, and this change's tasks/progress artifacts. Preserve Units 1–3 interview core/screen/review behavior and unrelated pre-existing worktree changes. |

## Files Changed in This Continuation

| File | Action | Summary |
|---|---|---|
| `src/core/skill-install.ts` | Modified | Added the minimal pending-skill package adapter and `installPendingSkill`, reusing frozen `IntegrationPlan` validation and the existing atomic rollback/audit installer. |
| `src/tui/agent-suite-controller.ts` | Modified | Added product-owned `ingestPendingSkills`: skip installed skills, install missing skills after persistence, assign only to the active agent, persist assignment, and restore config on ingestion failure. |
| `src/tui/agent-suite-app.tsx` | Modified | Approval now falls back to the controller-owned ingestor when no explicit adapter is supplied, preserving persistence-before-ingestion and no-duplicate-write behavior. |
| `src/tui/agent-suite-mount.tsx` | Modified | Projects the controller safe-ingestion callback into the mounted app. |
| `src/tui/index.tsx` | Modified | Passes the controller-owned callback through the real host mount. |
| `test/ai-preview.test.ts` | Modified | Added mounted create/modify, two-pending-skill, installed-only, invalid/cancel/discard/request, persistence-failure, ingestion-failure, and permission evidence. |
| `test/agent-suite-controller.test.ts` | Modified | Added real controller installer, installed-skill skip, and public adapter contract coverage. |
| `test/agent-suite-mount.test.ts` | Modified | Added mount prop and mounted callback runtime harness coverage. |
| `openspec/changes/replace-agent-creation-with-ai-interview/tasks.md` | Updated | Marked 4.3 complete; all 17 tasks are now checked. |
| `openspec/changes/replace-agent-creation-with-ai-interview/apply-progress.md` | Rewritten cumulatively | Retains Units 1–3 evidence, corrects the stale partial-4.3 claim, and records fresh-budget continuation/TDD/work-unit evidence. |

## Deviations from Design

1. The legacy `create-agent.tsx` module remains on disk as an unused compatibility module because no live caller remains and deleting it would expand the rollback surface; the user-facing wizard route is retired.
2. The pending-skill package factory creates a minimal generated `SKILL.md` from the pending rationale only when the user has already approved the agent. This keeps the app/controller integration on the existing frozen-plan and atomic installer path without inventing remote fetch behavior in this change.
3. The controller owns assignment and rollback after `installSkill` completes; the existing installer still performs file rollback on validation/assignment failure, while the controller restores the agent config snapshot if any pending-skill operation fails.

## Issues Found

1. The prior Unit 4 progress artifact incorrectly described task 4.3 as only partially complete and claimed live wiring was absent. That contradiction is corrected here from current source and fresh mounted tests.
2. The existing safe ingestion module intentionally exposes a frozen-plan installer rather than an app-specific pending-skill API; the continuation adds only the narrow adapter needed to bridge pending rationales into that existing contract.

## Cumulative State

- **Completed**: 17/17 tasks.
- **Pending**: None.
- **Next recommended**: `sdd-verify`, only after the parent records exact native attempt settlement. This worker did not run `sdd-verify`.

## Workload / PR Boundary

- **Mode**: chained PR slice
- **Strategy**: `auto-chain`, `feature-branch-chain`
- **Current work unit**: Unit 4 / Phase 4 — wizard retirement, final persistence/ingestion, dead-code cleanup, and full checks
- **Boundary**: Starts after Unit 3 review bridge; ends after configured/unconfigured route retirement, manual editor-only user flow, exact approval persistence, mounted post-approval pending ingestion, one-shot cleanup, and full checks.
- **Target**: Immediate Unit 3 branch; child diff remains focused on PR 4.
- **Estimated review budget impact**: The continuation is bounded to the fresh native attempt budget; no `size:exception` was used. The raw worktree remains intentionally dirty with unrelated/pre-existing product and artifact changes, so delivery must use native attempt evidence rather than raw whole-tree line counts.

## Next

Task implementation is complete and the required apply checks are green. Parent-owned exact native settlement is the only remaining apply lifecycle action; after settlement, `sdd-verify` is the separate next phase. No review, commit, push, PR creation, or verify phase was run.

## Key Learnings

1. The safe installer already provided the correct frozen-plan and rollback boundary for pending skills.
2. Mounted approval evidence must exercise the controller callback rather than only an injected helper.
3. Installed pending skills should be assigned without rewriting their existing package.
4. Controller configuration rollback prevents partial agent assignments after later ingestion failures.
