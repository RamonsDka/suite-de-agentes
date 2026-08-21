# Tasks: Replace Agent Creation with AI Interview

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~650 lines (350 prod + 300 tests) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (Core Engine) → PR 2 (Screen & Nav) → PR 3 (Skills & Review Bridge) → PR 4 (Retire Wizard & Integration) |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | Core interview engine, types, and strict turn parser | PR 1 | `npm test test/coordinator.test.ts` | N/A (pure core logic) | `src/core/coordinator.ts`, `src/core/types.ts` |
| 2 | Dialogue UI screen and gated navigation flow | PR 2 | `npm test test/agent-suite-nav.test.ts` | Open TUI, select "Crear agente", verify question/replies loop | `src/tui/screens/ai-interview.tsx`, `src/tui/agent-suite-nav.ts` |
| 3 | Skill recommendations, model recommendations, and review bridge | PR 3 | `npm test test/ai-preview.test.ts` | Run interview to review transition, verify skill/model rationale and safe-field edit | `src/tui/screens/ai-preview.tsx`, `src/core/coordinator.ts` skill helpers |
| 4 | Wizard retirement, step-form refactor, and integration tests | PR 4 | `npm test` | Verify "Crear agente" unconfigured gate shows config/cancel, never wizard | `src/tui/screens/create-agent.tsx`, full test suite |

## Phase 1: Foundation & Pure Core Engine

- [x] 1.1 (RED) Add unit tests in `test/coordinator.test.ts` for `parseInterviewTurn` (2-4 quick replies, malformed JSON keeping checkpoint fallback, rejecting injected `permissions`/`systemPrompt` keys), prompt replay, and modify mode transcript seeding.
- [x] 1.2 (GREEN) Add `InterviewTurn`, `InterviewCheckpoint`, `PendingSkill`, and `ModelRecommendation` type definitions in `src/core/types.ts`.
- [x] 1.3 (GREEN) Implement `buildInterviewPrompt`, `parseInterviewTurn`, and `runInterviewTurn` with transcript replay and safe-field checkpointing in `src/core/coordinator.ts`.
- [x] 1.4 (REFACTOR) Clean up contained coordinator helpers and verify pure core tests pass; defer removal of legacy one-shot authoring exports to task 4.4 after their live TUI callers are retired.

## Phase 2: Navigation & Interview Screen

- [x] 2.1 (RED) Add unit tests in `test/agent-suite-nav.test.ts` for `ai-interview` route, gating `Crear agente` (`ACTIVATE_LANDING_ITEM` 1, `CREATE_START`) to `ai-gate` without wizard fallback, and mid-turn cancel preserving transcript in memory.
- [x] 2.2 (GREEN) Update `src/tui/agent-suite-nav.ts` with `ai-interview` route kind, `INTERVIEW_*` events, and gated `Crear agente` navigation.
- [x] 2.3 (GREEN) Create `src/tui/screens/ai-interview.tsx` with single-question display, 2-4 quick replies, free-text input, compact checkpoint summary, review transition prompt, and error retry/cancel controls.
- [x] 2.4 (GREEN) Wire interview session signal, `AbortSignal` cancellation, and state management in `src/tui/agent-suite-app.tsx`.
- [x] 2.5 (REFACTOR) Consolidate navigation event handlers and verify screen transitions and focus order.

## Phase 3: Skills, Model Recommendations & Review Bridge

- [x] 3.1 (RED) Add tests in `test/ai-preview.test.ts` for safe-field inline editing (`id`, `description`, `operations`, `skills`, `model`, `effort`), model recommendation rationale display, and "Request changes" re-entering interview with transcript.
- [x] 3.2 (GREEN) Integrate installed-first skill recommendation and pending skill tracking into `src/core/coordinator.ts` and `src/tui/agent-suite-app.tsx`.
- [x] 3.3 (GREEN) Update `src/tui/screens/ai-preview.tsx` to support inline editing of safe fields, display rationale, and wire `Approve`, `Request changes`, and `Discard`.
- [x] 3.4 (REFACTOR) Standardize review action handlers and verify permissions remain strictly product-owned (`read: allow, edit: ask`).

## Phase 4: Wizard Retirement & Integration Verification

- [x] 4.1 (RED) Add integration tests in `test/agent-suite-nav.test.ts` proving legacy wizard and one-shot `ai-request` routes are unreachable and unconfigured actions gate cleanly.
- [x] 4.2 (GREEN) Refactor `src/tui/screens/create-agent.tsx` into a manual review/edit editor, removing step-3 AI generation triggers and wizard-first flow.
- [x] 4.3 (GREEN) Wire final review `Approve` action to atomic controller persistence and post-approval pending skill ingestion in `src/tui/agent-suite-app.tsx`.
- [x] 4.4 (REFACTOR) Remove dead code/routes and verify full test suite, typecheck, and build (`npm test && npm run typecheck && npm run build`).
