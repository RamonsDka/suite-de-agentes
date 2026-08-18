# Apply Progress: AI Coordinator & Assisted Agent Authoring

## Slice 1 — Visual Polish & Config Schema

**Status:** Complete

**Delivery boundary:** PR 1 in the `feature-branch-chain`, targeting the tracker draft/no-merge branch. This slice adds only the optional persisted coordinator shape, the direct SDK runtime dependency, and shared visual polish. It does not add coordinator settings, model discovery, a runner, skills, assisted authoring, ingestion, or archive work.

## Completed Tasks

- [x] 1.1 RED: Added observable configuration and persistence tests for a valid coordinator, dynamic effort variants, corrupt coordinator input, byte preservation, and compatibility with registries that omit `coordinator`.
- [x] 1.2 GREEN: Promoted `@opencode-ai/sdk` 1.18.5 to a direct runtime dependency and added the optional `CoordinatorConfig` schema validation and persistence path.
- [x] 1.3 GREEN: Added semantic visual tokens and primitive presentations for yellow `Finalizar`, blue labels/headers, white values, and a translucent blue catalog search field with a focused blue border.
- [x] 1.4 REFACTOR: Kept the change localized to existing core/TUI ownership and ran focused plus complete verification.

## TDD Cycle Evidence

| Task | Test layer / owner | Safety net | RED | GREEN | Triangulation | Refactor |
|---|---|---|---|---|---|---|
| 1.1 | Unit + persistence integration — `test/config.test.ts`, `test/persistence.test.ts` | `npm test -- test/config.test.ts test/persistence.test.ts test/visual-tokens.test.ts test/visual-primitives.test.ts test/agent-suite-modify.test.ts` → 5 files, 38 passed | Same focused command after new cases → 4 failed, 31 passed; failures were absent `coordinator` whitelist/persistence behavior | Same command after implementation → 4 files, 35 passed | Valid full shape with `extra-high`, omitted coordinator, empty/unsafe provider/model/effort, and failed save retaining prior bytes | Added coordinator-key whitelist; focused tests remained green |
| 1.2 | Unit + persistence integration — `test/config.test.ts`, `test/persistence.test.ts` | Same 38-pass baseline | Reused task 1.1 contract RED; no production code was written before that failure | Focused command → 35 passed; `npm ls @opencode-ai/sdk --omit=dev` verifies direct runtime resolution | Config parse and atomic save/reload exercise different input and persistence paths | Kept validation as a private parser helper and reused `validateVariantId` for dynamic safe identifiers |
| 1.3 | Pure TUI presentation — `test/visual-tokens.test.ts`, `test/visual-primitives.test.ts` | Same 38-pass baseline | Focused command after new cases → visual-token and presentation expectations failed because semantic tokens/helpers were absent | Focused command → 35 passed | Completion action, blue label/white value hierarchy, translucent RGB/alpha search background, and focused border each have distinct assertions | Routed consumers through shared token/primitives instead of duplicating screen-local colors |
| 1.4 | Focused integration/runtime verification | Same 38-pass baseline | N/A — verification-only task; no new production behavior was introduced | `npm test` → 24 files, 182 passed | Focused 7-owner command → 7 files, 60 passed; full suite independently exercised remaining paths | `npm run typecheck` and `npm run build` remained green after the final minimal cleanup |

## Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused tests | `npm test -- test/config.test.ts test/persistence.test.ts test/visual-tokens.test.ts test/visual-primitives.test.ts test/agent-suite-catalog.test.ts test/agent-suite-create.test.ts test/agent-suite-modify.test.ts` → exit 0; 7 files, 60 tests passed. |
| Complete test suite | `npm test` → exit 0; 24 files, 182 tests passed. |
| Type check | `npm run typecheck` → exit 0 (`tsc --noEmit`). |
| Runtime/build harness | `npm run build` → exit 0; built the `server`, `tui`, and `core/index` ESM entries. The catalog uses the shared translucent search presentation at render time; the final create step sends its `Finalizar` keybar through `SuiteShell` to the yellow-aware `KeyHintBar`. |
| Direct dependency harness | `npm ls @opencode-ai/sdk --omit=dev` → expected direct production dependency at `@opencode-ai/sdk@1.18.5`. |
| Rollback boundary | Revert this slice’s coordinator additions in `package.json`, `package-lock.json`, `src/core/types.ts`, and `src/core/config.ts`; revert the shared visual additions in `src/tui/visual-tokens.ts`, `src/tui/visual-primitives.tsx`, and the catalog wrapper. Existing registries without `coordinator` remain byte-compatible and do not require migration. |

## Files Touched by This Slice

| File | Change |
|---|---|
| `package.json` | Added direct runtime dependency `@opencode-ai/sdk` 1.18.5. |
| `package-lock.json` | Recorded the direct production dependency without unrelated version changes. |
| `src/core/types.ts` | Added `CoordinatorConfig` and optional `SuiteConfig.coordinator`. |
| `src/core/config.ts` | Whitelisted and validated the optional coordinator object. |
| `src/tui/visual-tokens.ts` | Added semantic action, form, and search tokens. |
| `src/tui/visual-primitives.tsx` | Added finalization keybar and search presentations; applied label/value colors. |
| `src/tui/screens/catalog.tsx` | Rendered the catalog search field with the shared translucent/focus presentation. |
| `test/config.test.ts` | Added coordinator parsing and malformed-input cases. |
| `test/persistence.test.ts` | Added persistence round trip and previous-byte preservation coverage. |
| `test/visual-tokens.test.ts` | Added semantic visual-token behavior tests. |
| `test/visual-primitives.test.ts` | Added finalization/search presentation tests. |
| `tasks.md` | Marked Slice 1 tasks complete. |

## Dirty Work Isolation

The worktree already contained unrelated tracked edits and untracked visual primitives/tests before this slice started. They were neither reverted nor reformatted. The visual files listed above were pre-existing untracked files; this slice adds only the described coordinator and semantic-presentation behavior on top of their current state.

## Review Budget

The authored incremental changes for Slice 1 are estimated at approximately 150 additions plus deletions, excluding pre-existing dirty/untracked file contents. This remains below the 400-line PR 1 budget. Because the worktree is polluted, a delivery owner must construct the PR diff from the intended slice only rather than using the raw worktree diff.

## Remaining Tasks

## Slice 2 — Coordinator Settings & Deny-All Runner

**Status:** Complete

**Delivery boundary:** PR 2 in the `feature-branch-chain`, based on PR 1. This slice adds only tool-less coordinator session foundations and persistent coordinator settings/navigation. It does not add skills, assisted authoring, ingestion, or archive work.

## Completed Tasks

- [x] 2.1 RED: Added SDK-adapter tests for a deny-all map that covers built-in and dynamic MCP identifiers, rejects unproven/empty/incomplete inventories, uses an injected explicit base URL, and aborts before session prompting.
- [x] 2.2 RED: Added navigation tests for the exact three Spanish landing options, red/green coordinator status, runtime provider → model → dynamic effort selection, gating, cancellation, and return-intent preservation.
- [x] 2.3 GREEN: Added the core `CoordinatorSession` port and a fail-closed SDK adapter. It queries the SDK 1.18.5 documented `tool.ids()` endpoint before creating a session, uses every returned identifier in a null-prototype false map, and sends no prompt if the inventory cannot be proven.
- [x] 2.4 GREEN: Added controller-owned coordinator persistence and a settings screen routed from `⚙ Configuración`; runtime provider data is supplied by the TUI host and the flow persists provider/model/optional effort through the controller.
- [x] 2.5 REFACTOR: Centralized the runtime selection builder, preserved non-AI paths, and completed focused plus whole-project verification.

## TDD Cycle Evidence

| Task | Test layer / owner | Safety net | RED | GREEN | Triangulation | Refactor |
|---|---|---|---|---|---|---|
| 2.1 | SDK adapter integration — `test/coordinator-session.test.ts` | New owner file | `npm test -- test/coordinator-session.test.ts test/agent-suite-nav.test.ts` → exit 1; missing adapter module prevented collection | Same focused command → exit 0; 2 files, 23 tests passed | Built-ins plus dynamic MCP identifiers; empty/duplicate/malformed/unproven inventories; explicit HTTP(S) base URL; pre- and mid-session cancellation | Moved shared option selection to a pure builder and used a null-prototype map for hostile dynamic identifiers; tests remained green |
| 2.2 | TUI navigation unit — `test/agent-suite-nav.test.ts`, `test/host-compat.test.ts`, `test/visual-primitives.test.ts` | `npm test -- test/agent-suite-nav.test.ts test/agent-suite-controller.test.ts test/agent-suite-model-effort.test.ts` → exit 0; 3 files, 35 tests passed | Initial focused command → exit 1; missing coordinator config screen and navigation events prevented collection | `npm test -- test/agent-suite-nav.test.ts` → exit 0; 15 tests passed | Root focus `0|1|2`; red/green status; provider/model/dynamic effort; keyboard path; cancel preservation and configure return intent | Centralized provider/model/effort option derivation; tests remained green |
| 2.3 | Core port + SDK adapter integration — `test/coordinator-session.test.ts` | New core/adapter files | Task 2.1 RED above | `npm test -- test/coordinator-session.test.ts` → exit 0; 7 tests passed | Success, invalid inventory before session creation, explicit base URL, dynamic MCP tool IDs, and cancellation after session creation | Exported the port from the core public surface without placing SDK dependencies in core |
| 2.4 | Controller + TUI navigation integration — `test/agent-suite-controller.test.ts`, `test/agent-suite-nav.test.ts`, `test/host-compat.test.ts` | Same 35-pass navigation/controller baseline | Task 2.2 RED above | `npm test -- test/agent-suite-nav.test.ts test/agent-suite-controller.test.ts test/host-compat.test.ts test/visual-primitives.test.ts` → exit 0; 4 files, 38 tests passed | Persist/reload via controller; exact root options; status colors; runtime variants; configuring/cancel return behavior | Routed persistence through `setCoordinator()` rather than duplicating config serialization in the screen |
| 2.5 | Refactor and integration verification | Focused owner suite → exit 0; 5 files, 50 tests passed | N/A — verification/refactor task | `npm test` → exit 0; 25 files, 197 tests passed | Full suite, TypeScript compile, production build, and whitespace check independently exercised integration | Extracted `coordinatorSelectionOptions`; all checks stayed green |

## Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused tests | `npm test -- test/coordinator-session.test.ts test/agent-suite-nav.test.ts test/agent-suite-controller.test.ts test/host-compat.test.ts test/visual-primitives.test.ts` → exit 0; 5 files, 50 tests passed. |
| Complete test suite | `npm test` → exit 0; 25 files, 197 tests passed. |
| Type check | `npm run typecheck` → exit 0 (`tsc --noEmit`). |
| Runtime/build harness | `npm run build` → exit 0; the server, TUI, and core ESM entries built successfully. The TUI integration passes runtime providers into the coordinator configuration screen and calls controller persistence from the provider → model → effort route. |
| Formatting/patch integrity | `git diff --check` → exit 0. |
| SDK contract evidence | Installed `@opencode-ai/sdk@1.18.5` type source exposes `createOpencodeClient({ baseUrl })`, `tool.ids()` as “including built-in and dynamically registered”, and `session.prompt(... tools: Record<string, boolean>)`; the adapter requires the inventory response before session creation. |
| Rollback boundary | Revert `src/core/coordinator.ts`, `src/tui/ai/coordinator-session.ts`, `src/tui/screens/coordinator-config.tsx`, plus the coordinator branches in the listed TUI/controller files and their Slice 2 tests. `coordinator` remains optional in existing persisted configuration; non-AI catalog/create/modify workflows remain available. |

## Files Touched by This Slice

| File | Change |
|---|---|
| `src/core/coordinator.ts`, `src/core/index.ts` | Added and exported the SDK-independent `CoordinatorSession` port. |
| `src/tui/ai/coordinator-session.ts` | Added injected-base-URL SDK client factory, complete tool inventory verification, false denial map, prompt/abort foundation. |
| `src/tui/screens/coordinator-config.tsx` | Added settings/status presentation and runtime option builders. |
| `src/tui/agent-suite-controller.ts` | Added controller-owned `coordinator()` and `setCoordinator()` persistence methods. |
| `src/tui/agent-suite-nav.ts`, `agent-suite-app.tsx`, `agent-suite-mount.tsx`, `agent-suite-vm.ts`, `index.tsx`, `screens/landing.tsx`, `visual-primitives.tsx` | Added the exact third landing row, coordinator navigation states, runtime provider wiring, key hints, status presentation, and foundational gate state. |
| `test/coordinator-session.test.ts`, `test/agent-suite-nav.test.ts`, `test/agent-suite-controller.test.ts`, `test/host-compat.test.ts`, `test/visual-primitives.test.ts` | Added/updated observable security, persistence, route, status, and root-menu contracts. |
| `tasks.md` | Marked only Slice 2 tasks complete. |

## Dirty Work Isolation

The worktree was already dirty, including overlapping TUI/controller files and untracked visual primitives. The slice neither reverted nor reformatted unrelated work. The PR 2 authored overlay is identified by the coordinator port, adapter, settings screen, coordinator-only branches, and the listed owner tests; delivery must not use the raw polluted worktree diff.

## Review Budget

The four coordinator-specific new files account for 244 additions alone. Because the shared TUI/controller/test files were already dirty before this slice, a raw worktree diff cannot prove the exact authored incremental overlay. The 400-line PR 2 ceiling therefore remains **unverified**; no `size:exception` was requested. A delivery owner must reconstruct the coordinator-only diff against PR 1 before treating this work unit as deliverable or starting verification for the chained PR.

## Remaining Tasks

- [ ] 4.1–4.4 Conversational Authoring & Preview
- [ ] 5.1–5.5 Safe HTTPS Ingestion & Rollback

## Slice 3 — Skill Discovery, Picker & Conflicts

**Status:** Complete — tasks 3.1–3.4.

**Delivery boundary:** PR 3 in the `feature-branch-chain`, based on PR 2. This slice adds discovery-only installed-skill adaptation, deterministic recommendation/conflict/variant core rules, and the searchable assignment picker. It does not perform remote HTTPS ingestion, install/write/journal operations, coordinator authoring, or Slice 4/5 work.

## Completed Tasks

- [x] 3.1 RED: Added cohesive installed discovery, dynamic filtering, installed → skills.sh → verified GitHub → generation ranking, conflict action, unique rename, near-match variant, and picker-route tests.
- [x] 3.2 GREEN: Added pure catalog ranking, explicit conflict resolution, safe unique identifiers, variants, and an SDK `client.app.skills()` discovery-only adapter.
- [x] 3.3 GREEN: Added an installed-skills picker with search/filtering and attachment state, plus a conflict comparison presentation exposing Replace, Keep existing, and Rename; wired the picker through host → mount → app → navigation.
- [x] 3.4 REFACTOR: Kept the core pure and compact, retained the existing editor persistence path, and completed focused, full, type, build, and patch-integrity checks.

## TDD Cycle Evidence

| Task | Test layer / owner | Safety net | RED | GREEN | Triangulation | Refactor |
|---|---|---|---|---|---|---|
| 3.1 | Unit + TUI navigation — `test/skill-catalog.test.ts`, `test/agent-suite-nav.test.ts` | `npm test -- test/agent-suite-nav.test.ts test/agent-suite-modify.test.ts` → exit 0; 2 files, 25 passed | `npm test -- test/skill-catalog.test.ts test/agent-suite-nav.test.ts` → exit 1; 2 suites failed collection because `skill-catalog`, `skill-sources`, and `skill-picker` did not exist | After minimum implementation, focused 4-owner command → exit 0; 4 files, 51 passed | Installed discovery valid/malformed responses; installed then skills.sh then GitHub then generation; collision action outcomes; multiple rename/variant suffixes; picker search and attach route | Ranking and conflict operations remain pure; source adapter remains discovery-only |
| 3.2 | Core unit + SDK-adapter integration — `test/skill-catalog.test.ts` | New owners; prior related navigation baseline above | Task 3.1 RED above | `npm test -- test/skill-catalog.test.ts` included in focused suite → exit 0; 8 catalog tests passed | Valid SDK payload versus malformed result, collision/no-collision, Replace/Keep/Rename, and near-match/no-match variants | Kept SDK types at the adapter boundary and exported only pure core contracts |
| 3.3 | TUI navigation + presentation unit — `test/agent-suite-nav.test.ts`, `test/skill-catalog.test.ts` | Same 25-pass baseline | Task 3.1 RED included absent picker import and absent picker navigation events | Focused suite → exit 0; picker route persists selected assignment back to the existing skills draft | Query starts empty then filters; unattached skill attaches; already-assigned selection is retained; conflict presentation exposes all three labels | Reused existing search and selectable-row primitives; no new controller/persistence path |
| 3.4 | Refactor / integrated verification | Focused 4-file suite → exit 0; 51 passed | N/A — verification-only task | `npm test` → exit 0; 26 files, 206 passed | Typecheck, build, and whitespace checks independently exercised public core and TUI entry points | No behavior-changing refactor after green; all checks stayed green |

## Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused tests | `npm test -- test/skill-catalog.test.ts test/agent-suite-nav.test.ts test/agent-suite-edit.test.ts test/agent-suite-modify.test.ts` → exit 0; 4 files, 51 tests passed. |
| Runtime harness | `npm run build` → exit 0; built `server`, `tui`, and `core/index` ESM entries. The TUI host provides its runtime SDK client to the discovery-only adapter; the mounted app opens the picker from the existing skills editor and returns the selected IDs to the existing persistence route. |
| Complete test suite | `npm test` → exit 0; 26 files, 206 tests passed. |
| Type check | `npm run typecheck` → exit 0 (`tsc --noEmit`). |
| Patch integrity | `git diff --check` → exit 0. |
| Rollback boundary | Revert `src/core/skill-catalog.ts`, `src/tui/ai/skill-sources.ts`, `src/tui/screens/skill-picker.tsx`, their core export, the picker-specific host/mount/app/nav branches, and `test/skill-catalog.test.ts` / picker-route test block. This removes discovery/picker behavior without changing existing manual skill editing or coordinator functionality. |

## Files Touched by This Slice

| File | Change |
|---|---|
| `src/core/skill-catalog.ts`, `src/core/index.ts` | Added pure discovery filtering, recommendation order, explicit conflict actions, safe rename, variants, and public export. |
| `src/tui/ai/skill-sources.ts` | Added discovery-only `client.app.skills()` adaptation; no remote request, installation, or disk mutation. |
| `src/tui/screens/skill-picker.tsx` | Added searchable installed picker and conflict comparison presentation. |
| `src/tui/agent-suite-nav.ts`, `agent-suite-app.tsx`, `agent-suite-mount.tsx`, `agent-suite-vm.ts`, `index.tsx`, `visual-primitives.tsx` | Routed runtime installed skills into the picker and returned selected IDs to the established modify-skills draft/persistence path. |
| `test/skill-catalog.test.ts`, `test/agent-suite-nav.test.ts` | Added core, adapter, conflict, variant, filtering, and picker-route coverage. |
| `tasks.md` | Marked only Slice 3 tasks complete. |

## Dirty Work Isolation

The worktree was already dirty before Slice 3, including the shared TUI files changed by Slices 1 and 2. No pre-existing changes were reverted or reformatted. The Slice 3 overlay is limited to the listed catalog/source/picker files and picker-specific branches/tests; delivery must diff against PR 2 rather than use the raw worktree diff.

## Review Budget

The native Slice 3 attempt recorded 51 changed lines against its acquired PR 2 baseline, within the 400-line PR 3 budget. The raw `HEAD` diff reports unrelated prior dirty work in shared files and cannot be used as the PR 3 line count. No `size:exception` was requested.

## Cumulative State

- Completed: 17/22 tasks.
- Remaining: 5.1–5.5 Safe HTTPS Ingestion & Rollback.
- Slice 5 was not started.

## Slice 4 — Conversational Authoring & Preview

**Status:** Complete — tasks 4.1–4.4.

**Delivery boundary:** PR 4 in the `feature-branch-chain`, based on PR 3. This slice adds only in-memory conversational draft parsing, mandatory preview actions, and the validated create `Finalizar` lifecycle. It does not fetch URLs, install skills, write skill packages, journal, rollback, or audit.

## Completed Tasks

- [x] 4.1 RED: Added cohesive `coordinator` and `ai-preview` tests that initially failed for the absent prompt/parser/conversation/preview/finalization contracts.
- [x] 4.2 GREEN: Added pure prompt construction, strict schema parsing and normalization compatible with the existing ID/model/effort/skill validators, plus cancellation-aware conversation execution.
- [x] 4.3 GREEN: Added a three-action preview with `Approve`, `Request changes`, and `Discard`; approving replaces only the in-memory create draft. `Finalizar` delegates persistence to the existing controller and closes only after it succeeds.
- [x] 4.4 REFACTOR: Completed focused, full, type, build, and patch-integrity verification. Existing unconfigured/manual authoring remains available; this slice introduces no automatic AI invocation.

## TDD Cycle Evidence — Slice 4

| Task | Test layer / owner | Safety net | RED | GREEN | Triangulation | Refactor |
|---|---|---|---|---|---|---|
| 4.1 | Unit + navigation integration — `test/coordinator.test.ts`, `test/ai-preview.test.ts` | `npm test -- test/agent-suite-create.test.ts test/agent-suite-modify.test.ts test/agent-suite-nav.test.ts test/agent-suite-controller.test.ts` → exit 0; 4 files, 47 passed | `npm test -- test/coordinator.test.ts test/ai-preview.test.ts` → exit 1; absent exports/screen plus six failing contract cases | Same command → exit 0; 2 files, 6 tests passed | Valid versus incomplete/extra/unsafe drafts; active versus pre-cancelled conversation; approve/request/discard plus valid/invalid finalization | Parser stays pure and reuses existing config validators. |
| 4.2 | Pure core unit — `test/coordinator.test.ts` | New behavior in existing core port | Same 4.1 RED | Focused coordinator owner → exit 0; 3 tests passed | Prompt inputs, strict malformed input, normalization, progress, and cancellation paths | No SDK or persistence dependency entered core. |
| 4.3 | TUI navigation / controller boundary — `test/ai-preview.test.ts`, `test/agent-suite-create.test.ts` | Existing create/controller safety net above | Same 4.1 RED | Focused preview/create owners → exit 0; 4 preview/create tests passed | All three preview exits, persisted close on success, and invalid-finalize no-close | Reused `applyCreateSubmission` and controller persistence; no duplicate writer. |
| 4.4 | Integration verification | Focused ten-owner GREEN suite → exit 0; 10 files, 100 passed | N/A — verification-only task | `npm test` → exit 0; 28 files, 220 passed | `npm run typecheck`, `npm run build`, and `git diff --check` all exited 0 | Added only the bounded successor wiring after its RED tests. |

## Work Unit Evidence — Slice 4

| Evidence | Exact result |
|---|---|
| Focused tests | `npm test -- test/coordinator-session.test.ts test/coordinator.test.ts test/ai-preview.test.ts test/agent-suite-create.test.ts test/agent-suite-edit.test.ts test/agent-suite-modify.test.ts test/agent-suite-nav.test.ts test/agent-suite-controller.test.ts test/agent-suite-mount.test.ts test/tui-registration.test.ts` → exit 0; 10 files, 100 tests passed. |
| Runtime harness | `npm run build` → exit 0; built server, TUI, and core ESM entries. The mounted host client is adapted to the existing deny-all coordinator session, draft progress opens preview only, and F10 finalization remains controller-backed. |
| Complete test suite | `npm test` → exit 0; 28 files, 220 tests passed. |
| Type / patch integrity | `npm run typecheck` and `git diff --check` → exit 0. |
| Rollback boundary | Revert `src/core/coordinator.ts`, `src/tui/screens/ai-preview.tsx`, the preview/finalize branches in nav/app/viewmodel/visual/create files, and Slice 4 tests. Existing manual create/modify, optional coordinator settings, and controller persistence remain. |

## Files Touched by This Slice

| File | Change |
|---|---|
| `src/core/coordinator.ts` | Added tool-less prompt builders, strict `parseAgentDraft`, and cancellation-aware conversation runner. |
| `src/tui/screens/ai-preview.tsx` | Added mandatory three-action in-memory preview and save-status helper. |
| `src/tui/ai/coordinator-session.ts`, `index.tsx`, `agent-suite-mount.tsx` | Adapted the mounted host client into the pre-existing fail-closed tool-less coordinator session and passed it to the app. |
| `src/tui/agent-suite-nav.ts`, `agent-suite-vm.ts`, `visual-primitives.tsx` | Added preview route, focus/actions, title, and key hints. |
| `src/tui/agent-suite-app.tsx`, `screens/create-agent.tsx`, `screens/modify-panel.tsx` | Invoked authoring after description/operations, surfaced cancellable progress, previewed in memory, and wired F10 `Finalizar` with saved/pending state. |
| `test/coordinator.test.ts`, `test/coordinator-session.test.ts`, `test/ai-preview.test.ts`, TUI owner tests | Added RED/GREEN core, host-adapter, cancellation, preview, and finalization evidence. |
| `tasks.md` | Marked only Slice 4 tasks complete. |

## Dirty Work Isolation

The worktree was already dirty, including shared app/nav/create files. No pre-existing changes were reverted, reformatted, or included intentionally. The Slice 4 overlay is limited to the authoring parser/preview/finalize branches and listed tests; delivery must isolate it against PR 3 rather than use the raw worktree diff.

## Review Budget

The failed predecessor recorded 41 changed lines. The bounded successor adds only the missing mounted session and finalization routes; no `size:exception` was requested. The raw worktree diff remains polluted, so delivery must still isolate the Slice 4 overlay against PR 3.

## Native Attempt

- Attempt 4: settled `failed` only because the initial raw-worktree accounting check was conservatively treated as unprovable before native status confirmed the bounded 41-line result.
- Evidence revision: `sha256:931e273a56b51c4d797d44176e109ab544e197dcf65402c972120b557f8a8dcd`.
- Successor attempt 5: maintainer-reset bounded remediation that completes the mounted coordinator trigger and modify `Finalizar` path; its passed settlement remediates the failed evidence revision above.

## Successor Completion

The mounted app now adapts the host SDK client through the existing fail-closed coordinator adapter. At the operations step, a configured coordinator generates an in-memory draft, forwards progress, honors Escape cancellation, and opens mandatory preview. Runtime absence, failure, or cancellation keeps manual progression usable and persists nothing. Modify-menu F10 exposes `Finalizar`, refreshes through the existing controller, and closes only after success; saved/pending status remains near the action.

## Slice 5 — Safe HTTPS Ingestion & Rollback

**Status:** Complete — tasks 5.1–5.5. **Delivery boundary:** PR 5 in the `feature-branch-chain`, based on PR 4. This slice adds only deterministic guarded retrieval, package validation and frozen planning, global skill installation with bounded rollback, an append-only summarized audit, and the minimal plan-review presentation. It does not contact the network, mutate the real home directory, invoke a shell, create a branch, commit, PR, review, verify, or archive.

## Completed Tasks

- [x] 5.1 RED: Added deterministic injected DNS/fetch tests for HTTPS-only retrieval, unsafe IPv4/IPv6 and literal-IP SSRF rejection, ambiguous DNS, redirect validation and limits, malformed redirects, and streaming size enforcement.
- [x] 5.2 RED: Added package and installation tests for strict `SKILL.md` frontmatter, traversal/drive/UNC/mixed-separator/symlink escapes, prohibited execution patterns, the plural global skills path, frozen plans, rollback, assignment sequencing, and redacted append-only audit outcomes.
- [x] 5.3 GREEN: Added `net-guard.ts` and `skill-package.ts` with fail-closed DNS checks, manual redirects, bounded streaming, strict package validation, and immutable integration plans.
- [x] 5.4 GREEN: Added path-pinned atomic skill writes, multi-file journal rollback, post-install validation before assignment, summarized audit, and immutable plan-review presentation.
- [x] 5.5 REFACTOR: Ran focused, full, type, build, and patch-integrity checks after the minimum implementation; no behavior-changing cleanup was needed.

## TDD Cycle Evidence — Slice 5

| Task | Test layer / owner | Safety net | RED | GREEN | Triangulation | Refactor |
|---|---|---|---|---|---|---|
| 5.1 | Core unit/integration — `test/net-guard.test.ts` | `npm test -- test/agents.test.ts test/persistence.test.ts test/skill-catalog.test.ts` → exit 0; 3 files, 20 tests passed | `npm test -- test/net-guard.test.ts test/skill-package.test.ts test/skill-install.test.ts` → exit 1; 3 suites failed collection because `net-guard`, `skill-package`, and `skill-install` did not exist | Same focused command → exit 0; 3 files, 8 tests passed | HTTP and literal/private/loopback/link-local/unspecified/multicast/reserved IPv4+IPv6, absent/ambiguous DNS, malformed/private redirects, four-hop limit, successful public fetch, and streaming over-limit cases | Extracted narrowly scoped address/target checks; final focused suite remained green. |
| 5.2 | Core + temp-home integration — `test/skill-package.test.ts`, `test/skill-install.test.ts` | Same 20-pass owner baseline | Same missing-module RED above, written before production modules | Same focused command → exit 0; package, install, rollback, symlink, and audit cases passed | Valid frontmatter/frozen plan versus malformed frontmatter; POSIX/Windows/UNC/mixed traversal; destructive/piped/shell/API execution patterns; success versus post-install failure and symlink escape | Kept the journal and atomic writer local to the installer; final focused suite remained green. |
| 5.3 | Pure core unit — `test/net-guard.test.ts`, `test/skill-package.test.ts` | New production modules; prior adjacent owner baseline above | Tasks 5.1–5.2 RED | Focused command → exit 0; security guards and immutable plans exercised | Public versus unsafe destinations and valid versus hostile package inputs force distinct branches | Literal-IP validation and `bash -c` denial were added only after their RED assertions; no additional refactor needed. |
| 5.4 | Temp-home integration + TUI presentation — `test/skill-install.test.ts` | Existing atomic-write owner baseline above | Task 5.2 RED | Focused command → exit 0; install, rollback, scoped assignment ordering, audit, and `integrationPlanRows` passed | Existing-file restoration versus newly-created-file removal; success audit versus failure audit; normal directory versus symlink escape | Reused repository temp-plus-rename discipline; no controller/app route was required for the standalone approved plan boundary. |
| 5.5 | Full project integration | Focused 3-owner GREEN suite → exit 0; 8 tests passed | N/A — verification/refactor task | `npm test` → exit 0; 31 files, 228 tests passed | Typecheck, production build, and whitespace integrity independently exercised public core/TUI entry points | No behavior-changing cleanup after GREEN. |

## Work Unit Evidence — Slice 5

| Evidence | Exact result |
|---|---|
| Focused tests | `npm test -- test/net-guard.test.ts test/skill-package.test.ts test/skill-install.test.ts` → exit 0; 3 files, 8 tests passed. |
| Runtime/integration harness | The focused install suite uses unique `tmpdir()` homes, injected DNS/fetch, and injected post-install/assignment callbacks. It performed no live HTTP request, real HOME write, or shell command; it passed 8 tests, including all-files rollback, absent-file cleanup, assignment suppression, and symlink escape rejection. |
| Complete test suite | `npm test` → exit 0; 31 files, 228 tests passed. |
| Type check | `npm run typecheck` → exit 0 (`tsc --noEmit`). |
| Build | `npm run build` → exit 0; built the `server`, `tui`, and `core/index` ESM entries. |
| Patch integrity | `git diff --check` → exit 0. |
| Threat cases | HTTPS-only; private/loopback/link-local/unspecified/multicast/reserved IPv4 and IPv6; literal IP; absent/ambiguous DNS; per-hop redirect validation; malformed redirect; three-redirect maximum; streamed body cap; malformed frontmatter; POSIX/Windows/UNC/mixed path escapes; symlink escape; destructive/shell/API execution patterns; rollback and audit redaction. |
| Rollback boundary | Revert `src/core/net-guard.ts`, `src/core/skill-package.ts`, `src/core/skill-install.ts`, `src/tui/screens/plan-review.tsx`, their three `src/core/index.ts` exports, and Slice 5 tests. At runtime, a failed installation restores prior bytes and removes paths absent before the attempt before it can report failure; assignment runs only after validation. |

## Files Touched by This Slice

| File | Change |
|---|---|
| `src/core/net-guard.ts` | Added injected DNS/fetch guarded HTTPS retrieval with public-address validation, manual redirect checks, and bounded streamed response accumulation. |
| `src/core/skill-package.ts` | Added strict package/frontmatter/security validation and deeply frozen integration plans. |
| `src/core/skill-install.ts` | Added plural global skill path construction, path-pinned atomic writes, rollback journal, post-install-before-assignment sequence, and summarized JSONL audit records. |
| `src/tui/screens/plan-review.tsx` | Added minimal immutable plan row/review presentation. |
| `src/core/index.ts` | Exported the Slice 5 core contracts. |
| `test/net-guard.test.ts`, `test/skill-package.test.ts`, `test/skill-install.test.ts` | Added deterministic RED/GREEN threat, package, installer, rollback, audit, and plan-presentation coverage. |
| `tasks.md` | Marked only Slice 5 tasks complete after the required evidence passed. |

## Dirty Work Isolation and Review Budget

The repository was already substantially dirty before Slice 5, including all prior Slice overlays and unrelated product work. This slice did not revert, reformat, stage, commit, or otherwise alter that work. Native attempt 6 settled `passed` with evidence revision `sha256:1e4a3b813598fb0135cdb30d0ce66fb88e7261503864f97037023c7a278adb35`; native candidate accounting recorded 3 changed lines. A conservative independent count of the new untracked Slice 5 modules/tests plus the current `src/core/index.ts` diff is 267 changed lines, also below the 400-line PR 5 budget. No `size:exception` was requested.

## Cumulative State

- Completed: 22/22 tasks.
- Native attempt: acquired with `sha256:edfd995751f830aef75e8cab2ca83fd95b68165d3b1a2e450b0921497085bf6b`; settled once as `passed` with the evidence revision above.
- Next recommended: `sdd-verify`.
