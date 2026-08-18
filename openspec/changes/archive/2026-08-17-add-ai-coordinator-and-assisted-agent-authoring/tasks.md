# Tasks: AI Coordinator & Assisted Agent Authoring

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

| PR | Base | Scope | Forecast |
|---|---|---|---|
| PR 1 | tracker | Visual polish, `CoordinatorConfig` schema, direct SDK dep | ≤350 |
| PR 2 | PR 1 | Coordinator settings, model discovery, deny-all runner | ≤380 |
| PR 3 | PR 2 | Skill discovery, picker, recommend, conflict diff | ≤390 |
| PR 4 | PR 3 | Conversational authoring, preview, `Finalizar` lifecycle | ≤370 |
| PR 5 | PR 4 | Safe HTTPS ingest, net guard, install, rollback journal | ≤390 |

Total estimate: 1,400–1,850 lines (auto-chain); colocated tests; independent rollback.

## Phase 1: Visual Polish & Config Schema (PR 1)

- [x] 1.1 RED: Tests in `test/config.test.ts` & `test/persistence.test.ts` for `CoordinatorConfig`, dynamic variants, corrupt config.
- [x] 1.2 GREEN: Direct SDK dep in `package.json`; add `CoordinatorConfig` in `types.ts`, `config.ts`, `persistence.ts`.
- [x] 1.3 GREEN: Update `visual-tokens.ts`, `visual-primitives.tsx` for yellow `Finalizar`, blue/white labels, search.
- [x] 1.4 REFACTOR: Verify Phase 1 suites pass.

## Phase 2: Coordinator Settings & Deny-All Runner (PR 2)

- [x] 2.1 RED: Tests in `test/coordinator-session.test.ts` for deny-all map (built-ins + MCPs false; bare `{}` forbidden; abort unproven) & SDK base-URL.
- [x] 2.2 RED: Tests in `test/agent-suite-nav.test.ts` for 3 landing rows (`0|1|2`), gear icon, provider/model/effort, gating.
- [x] 2.3 GREEN: Implement `CoordinatorSession` in `src/core/coordinator.ts` & SDK adapter in `src/tui/ai/coordinator-session.ts`.
- [x] 2.4 GREEN: Add settings in `src/tui/screens/coordinator-config.tsx`; wire navigation.
- [x] 2.5 REFACTOR: Verify Phase 2 suites pass.

## Phase 3: Skill Discovery, Picker & Conflicts (PR 3)

- [x] 3.1 RED: Tests in `test/skill-catalog.test.ts` for discovery, ranking (installed→remote→generate), diff (Replace/Keep/Rename), variants.
- [x] 3.2 GREEN: Implement ranking, conflicts, variants in `src/core/skill-catalog.ts` & adapters in `src/tui/ai/skill-sources.ts`.
- [x] 3.3 GREEN: Implement picker in `src/tui/screens/skill-picker.tsx` with conflict dialogs; wire screens.
- [x] 3.4 REFACTOR: Verify Phase 3 suites pass.

## Phase 4: Conversational Authoring & Preview (PR 4)

- [x] 4.1 RED: Tests in `test/coordinator.test.ts` & `test/ai-preview.test.ts` for prompts, `parseAgentDraft`, streaming, cancel, `Finalizar`.
- [x] 4.2 GREEN: Implement prompt builders, draft parser, conversation state in `src/core/coordinator.ts`.
- [x] 4.3 GREEN: Implement `src/tui/screens/ai-preview.tsx` (Approve/Request changes/Discard); wire `Finalizar` in `agent-suite-app.tsx`.
- [x] 4.4 REFACTOR: Verify Phase 4 suites pass with fail-open fallback.

## Phase 5: Safe HTTPS Ingestion & Rollback (PR 5)

- [x] 5.1 RED: Tests in `test/net-guard.test.ts` for SSRF (reject HTTP, private/loopback DNS, redirect-to-private, max 3 redirects, size cap).
- [x] 5.2 RED: Tests in `test/skill-package.test.ts` & `test/skill-install.test.ts` for traversal (`../`), shell denial, `~/.config/opencode/skills/{id}/SKILL.md`, multi-file journal, tests.
- [x] 5.3 GREEN: Implement network guard in `src/core/net-guard.ts` & validation in `src/core/skill-package.ts`.
- [x] 5.4 GREEN: Implement installer, multi-file journal, agent assignment, audit in `src/core/skill-install.ts` & `plan-review.tsx`.
- [x] 5.5 REFACTOR: Run full test suite (`npm test`), typecheck, and build.
