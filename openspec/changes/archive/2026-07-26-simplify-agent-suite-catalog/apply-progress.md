# Apply Progress: Simplify Agent Suite Catalog

## Status

- **Change**: `simplify-agent-suite-catalog`
- **Work unit**: `remediate-strict-tdd-scenarios`
- **Attempt**: native attempt ordinal 4, objective generation 4 active; remediation authority generation 1, fix batch 1
- **Active runtime revision**: `sha256:1d9f065722ccd5f5be9014d4c9db4a7107818cad72af4203de99811d29c475f8`
- **Remediation authority**: lineage `review-71041d4a3eca2394`; failed evidence `sha256:82255898f618e8361e2679f03e0384b0390d14966e615df7ad4962c67d877923`
- **Mode**: Strict TDD
- **Delivery**: one bounded remediation; maximum 200 changed lines; no review or Git operations
- **Scope**: direct runtime coverage and native verify-envelope correction only; all prior unit evidence is retained below

## Completed Tasks

- [x] 1.1 Extend `test/config.test.ts` for the minimal registry, invalid and seed-duplicate IDs, Spanish legacy rejection, and removal of merge assertions.
- [x] 1.2 Extend `test/persistence.test.ts` for empty-legacy replacement, atomic minimal round-trip, and byte preservation after failed validation/write.
- [x] 1.3 Create `test/catalog.test.ts` for seed/custom allowlisting, runtime exclusions, absent-seed state, ordering, and consent labels.
- [x] 2.1 Trim `SuiteConfig`; add catalog membership/enabled fields, the seed, and the owned catalog builder.
- [x] 2.2 Implement minimal parsing/persistence, safe legacy splitting, validation-before-atomic-write, and remove CRUD/model merging.
- [x] 2.3 Remove the obsolete suite CRUD test and core references while leaving server, policy, and consent files untouched.
- [x] 3.1 Adapt TUI host-double tests for the two Spanish root options, empty-state alert, native catalog actions, and safe footer fallback.
- [x] 3.2 Rewire the TUI to the owned catalog, retain custom creation, add custom materialize/delete actions, and create `src/version.ts`.
- [x] 3.3 Refactor the TUI labels and versioned host-safe rendering without changing server, policy, or consent code.
- [x] 4.1 Update README/docs and delete obsolete `examples/suites.json`.
- [x] 4.2 Run focused TUI tests, full tests, typecheck, and build; confirm server/consent/policy regressions remain green.
- [x] 5.1 Implement the maintainer-authorized exact internal-agent allowlist, runtime task-permission map, consent-preserving user-agent boundary, docs, and cumulative evidence.

## TDD Cycle Evidence

| Task | Test owner/file | Layer | Baseline | RED | GREEN | Triangulation | Refactor |
|------|-----------------|-------|----------|-----|-------|---------------|----------|
| 1.1 | `test/config.test.ts` | Unit | `npm test -- test/config.test.ts test/persistence.test.ts test/suites.test.ts` — exit 0; 3 files, 4 tests passed | `npm test -- test/catalog.test.ts test/config.test.ts test/persistence.test.ts` — exit 1; 8 failed, 1 passed, missing minimal/legacy behavior | Same focused command — exit 0; 3 files, 9 tests passed | Invalid ID and seed-duplicate branches require separate assertions | Removed model-merge expectation; final focused run remained green |
| 1.2 | `test/persistence.test.ts` | Unit with temporary filesystem | Same 3-file/4-test baseline — exit 0 | Same focused command — exit 1; legacy replacement and minimal write failed before implementation | Same focused command — exit 0; 3 files, 9 tests passed | Separate invalid-save and rejected-legacy byte-preservation scenarios | Reused a temporary-path helper; no global data access |
| 1.3 | `test/catalog.test.ts` | Unit | Catalog owner did not exist; core baseline was 3 files, 4 tests passed | Same focused command — exit 1; 2 catalog tests failed because the builder/seed were absent | Same focused command — exit 0; 3 files, 9 tests passed | Two cases cover filtering/state and deterministic order/consent | Final focused run remained green after obsolete test removal |
| 2.1 | `test/catalog.test.ts` | Unit | Catalog owner absent in the baseline | Same focused command — exit 1; exported catalog API was absent | Same focused command — exit 0; 3 files, 9 tests passed | Seed-present and seed-absent rows plus custom runtime state | Catalog output is immutable at the returned skills-array boundary |
| 2.2 | `test/config.test.ts`, `test/persistence.test.ts` | Unit with temporary filesystem | Existing legacy-shaped implementation passed only the old 3-file/4-test baseline | Same focused command — exit 1; minimal parsing, legacy rejection, and atomic minimal writes were absent | Same focused command — exit 0; 3 files, 9 tests passed | Invalid save plus rejected load prove persisted bytes stay unchanged | Optional `materializeGlobal` is omitted unless true, preserving the minimal registry shape |
| 2.3 | `test/suites.test.ts` | Pure removal/refactor | Old suite CRUD test passed as part of the 3-file/4-test baseline | N/A — pure removal; no artificial absence test was created | Focused core command — exit 0; 3 files, 9 tests passed after deleting the obsolete test | N/A | Deleted obsolete CRUD test and confirmed server/policy/consent files were not edited |
| 3.1 | `test/host-compat.test.ts`, `test/tui-registration.test.ts` | Host-double integration | `npm test -- test/host-compat.test.ts test/tui-registration.test.ts` — exit 0; 2 files, 3 tests passed | Same command — exit 1; 2 files failed, 3 tests failed and 2 passed because version/helpers and the minimal root were absent | Same command — exit 0; 2 files, 8 tests passed | Root options, empty alert, catalog action options, and fallback/footer labels cover separate branches | Kept native `DialogSelect` as the scrolling boundary and reused existing host doubles |
| 3.2 | `test/tui-registration.test.ts` | Host-double integration | Same 2-file/3-test focused baseline — exit 0 | Same focused command — exit 1; catalog helpers were absent and the old root still dereferenced removed suite state | Same focused command — exit 0; 2 files, 8 tests passed | Custom unavailable row covers materialization/delete; seed row covers delete exclusion | Removed suite/profile callers and routed membership through `buildSuiteDeAgentesCatalog` |
| 3.3 | `test/host-compat.test.ts`, `test/tui-registration.test.ts` | Host compatibility and labels | Same 2-file/3-test focused baseline — exit 0 | Same focused command — exit 1; version module and versioned labels were absent | Same focused command — exit 0; 2 files, 8 tests passed | Renderer-missing fallback remains separately asserted from versioned title/sidebar labels | Preserved `safeSlotRender`/`safeHostAction` boundaries and compact Spanish copy |
| 4.1 | `README.md`, `docs/`, `examples/suites.json` | Documentation/removal | N/A — prose and obsolete-example removal only; no behavior test was appropriate | N/A — strict TDD does not manufacture a failing test for pure documentation/removal | Documentation review completed; obsolete example deleted and references updated | N/A | Kept legacy-data safety and SDD profile out-of-scope notes documented |
| 4.2 | Full repository verification commands | Verification | Focused TUI GREEN remained 2 files, 8 tests passed before full verification | N/A — verification-only task; no production behavior was introduced by the commands | `npm test` exit 0 (11 files, 34 tests); `npm run typecheck` exit 0; `npm run build` exit 0 | Unchanged server, consent, and policy tests passed within the full suite | No source refactor after verification; generated build output remained outside the authored scope |
| 5.1 | `test/policy.test.ts`, `test/server.test.ts` | Unit and server-hook integration | `npm test -- test/policy.test.ts test/server.test.ts test/consent.test.ts` — exit 0; 3 files, 14 tests passed | `npm test -- test/policy.test.ts test/server.test.ts` — exit 1; 2 files, 5 new assertions failed and 11 existing tests passed because the internal allowlist and runtime hook were absent | Same policy/server command — exit 0; 2 files, 16 tests passed; final consent-inclusive focus — exit 0; 3 files, 19 tests passed | Explicit 36-name configured list plus `general`, `explore`, GitHub, custom, and `sdd-evil` cases prove exact membership rather than prefix matching; config fixture proves stale task rules are replaced while model/share/permission fields remain | Kept `ConsentLedger` and non-orchestrator behavior unchanged; centralized authorization in one exact predicate and reused the pure task-map builder |

## Work Unit Evidence — `core-persistence-catalog` (preserved)

| Evidence | Result |
|----------|--------|
| Focused test command and exact result | `npm test -- test/catalog.test.ts test/config.test.ts test/persistence.test.ts` — exit 0; Vitest reported **3 test files passed** and **9 tests passed**. |
| Runtime harness command/scenario and exact result | The core unit has no external OpenCode/TUI runtime boundary. The same command exercised the Node/Vitest catalog and temporary-file persistence scenarios: exit 0; **3/3 files and 9/9 tests passed**. TUI/server runtime harness remains in work unit 2 and was not run. |
| Rollback boundary | Revert only `src/core/types.ts`, `src/core/suites.ts`, `src/core/config.ts`, `src/core/persistence.ts`, `test/catalog.test.ts`, `test/config.test.ts`, `test/persistence.test.ts`, and deletion of `test/suites.test.ts`; no server, policy, consent, global config, `.atl`, or `.codegraph` files are part of this unit. |

## Implementation Summary

- `SuiteConfig` now contains only `version` and `customAgents`.
- `buildSuiteDeAgentesCatalog` owns an explicit seed-plus-custom allowlist and enriches only owned rows from runtime state.
- Empty legacy suite data parses to the minimal shape and is replaced only by a successful atomic write.
- Non-empty legacy assignments fail with a Spanish rejection before any write; invalid saves preserve existing bytes.
- Obsolete suite CRUD and runtime model merging were removed from the core slice.

## Deviations and Issues

- **Design deviation**: None in the assigned core slice.
- **Prior deferred boundary**: `src/tui/index.tsx` contained suite/profile callers during unit 1 by design; that boundary was completed in the `tui-footer-docs` slice below.
- **Global data safety**: all persistence tests use temporary files; the current user legacy file was read only and was not modified.

## Work Unit Evidence — `tui-footer-docs`

| Evidence | Result |
|----------|--------|
| Focused test command and exact result | `npm test -- test/host-compat.test.ts test/tui-registration.test.ts` — exit 0; Vitest reported **2 test files passed** and **8 tests passed**. |
| Runtime harness command/scenario and exact result | No OpenCode process/e2e harness is present in this repository. The host-double runtime scenario exercised root navigation, empty-state `DialogAlert`, native `DialogSelect` catalog/action boundaries, and renderer fallback through the same focused command: exit 0; **2/2 files and 8/8 tests passed**. |
| Rollback boundary | Revert only `src/tui/index.tsx`, `src/version.ts`, `test/host-compat.test.ts`, `test/tui-registration.test.ts`, `README.md`, `docs/architecture.md`, `docs/local-install.md`, and deletion of `examples/suites.json`; do not revert `src/server/index.ts`, `src/core/policy.ts`, consent tests, core unit 1 files, or any user/global configuration. |

## Implementation Summary — `tui-footer-docs`

- The Alt+S and `/agent-suite` surface now exposes exactly `Catálogo` and `Crear agente`.
- Catalog membership is sourced only from `buildSuiteDeAgentesCatalog`; rows are native `DialogSelect` options with compact Spanish state/details and current-turn consent copy.
- Custom rows expose state-aware `Materializar` and `Eliminar` actions; seed rows cannot be deleted; empty catalogs show a Spanish `DialogAlert` and return to the root.
- `PLUGIN_VERSION` is defined in `src/version.ts` and appears in sidebar/title labels inside existing host-safety boundaries.
- README and architecture/install docs describe the catalog shape; the obsolete suite JSON example was deleted; server, policy, consent, and global configuration remain untouched.

## Deviations and Issues — `tui-footer-docs`

- **Design deviation**: None — the TUI uses the existing `DialogSelect`/`DialogAlert` host APIs and `safeSlotRender` boundaries specified by the design.
- **Tooling issue**: The Impeccable setup script referenced by the installed skill was unavailable at both the project-relative and global skill path; no project files were changed for that setup step.
- **Runtime limitation**: No live OpenCode process harness is committed; host-double coverage is the available integration boundary.

## Work Unit Evidence — `authorize-gentle-system-agents`

| Evidence | Result |
|----------|--------|
| Focused test command and exact result | `npm test -- test/policy.test.ts test/server.test.ts test/consent.test.ts` — exit 0; Vitest reported **3/3 files passed** and **19/19 tests passed**. |
| Runtime harness command/scenario and exact result | The server-hook integration in `test/server.test.ts` exercised runtime `config` mutation, a grant-free `chat.message`, and `tool.execute.before` for all 36 internal primary/fallback names plus five blocked user/lookalike names. The focused command exited 0; **19/19 tests passed**. No live OpenCode process harness exists in this repository. |
| Rollback boundary | Revert only `src/core/policy.ts`, `src/server/index.ts`, `test/policy.test.ts`, `test/server.test.ts`, `README.md`, `docs/architecture.md`, `docs/local-install.md`, and the Phase 5 OpenSpec amendments. Do not revert global config, TUI/catalog membership, General model, consent ledger behavior, `.atl`, or `.codegraph`. |

Additional verification: `npm test` exited 0 with **11/11 files and 39/39 tests passed**; `npm run typecheck` exited 0; `npm run build` exited 0 (`tsup` generated server, TUI, and core bundles successfully).

## Implementation Summary — `authorize-gentle-system-agents`

- `INTERNAL_AGENT_ALLOWLIST` is an explicit 36-name tuple covering the configured primary/fallback SDD, review/refuter, and Judgment Day agents.
- `isAuthorizedInternalAgent` is the sole exact membership predicate used by `decideTaskGate`; `sdd-evil` and other lookalikes do not match.
- `transformTaskPermission()` emits `*` deny, exact internal allows, and explicit `general` deny. The server `config` hook replaces stale `permission.task` rules in memory while preserving unrelated config and permission fields.
- Current-turn ledger parsing and non-orchestrator bypass behavior were not changed.
- README and architecture/install docs now state the permanent internal authorization boundary and the user-agent consent boundary.

## Deviations and Issues — `authorize-gentle-system-agents`

- **Design deviation**: The original design marked `src/server/index.ts` and `src/core/policy.ts` out of scope. The maintainer explicitly amended that boundary after review; the design and proposal now record the amendment.
- **Tooling/runtime limitation**: No live OpenCode process harness exists; the server hook integration test is the available runtime boundary.
- **Protected scope**: No global configuration, TUI/catalog membership, model selection, consent ledger, `.atl`, or `.codegraph` file was edited.

## Correction Evidence — per-agent permission precedence

The active attempt required a deterministic correction after inspection found
that OpenCode gives `agent["gentle-orchestrator"].permission.task` precedence
over the top-level task map.

| Evidence | Result |
|----------|--------|
| Baseline | `npm test -- test/config.test.ts test/policy.test.ts test/server.test.ts test/consent.test.ts` — exit 0; **4 files and 23 tests passed** before the correction test. |
| RED | `npm test -- test/server.test.ts` — exit 1; **1 of 11 tests failed** because the actual plugin `config` hook left the stale per-agent task map (`*`: `ask`, `sdd-evil`: `allow`) unchanged. |
| GREEN | Same focused command after the fix — exit 0; **4 files and 24 tests passed**. The actual plugin hook now writes the exact map to `agent["gentle-orchestrator"].permission.task`, preserves per-agent model/edit/bash fields and unrelated top-level fields, and does not create a missing orchestrator agent. |
| Full verification | `npm test` — exit 0; **11 files and 40 tests passed**. `npm run typecheck` — exit 0. `npm run build` — exit 0; tsup generated server, TUI, and core bundles. |
| Runtime scenario | The server test invokes the real `serverPlugin` config hook, checks per-agent override precedence, then runs grant-free `chat.message` plus `tool.execute.before` for all internal agents and blocked user/lookalike agents. |

## Remaining Tasks

- None.

## Status

**12/12 tasks complete. Correction verified with focused/full tests, typecheck, and build; ready for final verification.**

## Focused Remediation — `remediate-strict-tdd-scenarios`

The prior 12-task evidence above is preserved. This bounded test/artifact-only remediation added direct runtime coverage for the four failed or partial scenarios; no production file changed.

### TDD Cycle Evidence

| Task | Test owner/file | Layer | Baseline | RED | GREEN | Triangulation | Refactor |
|------|-----------------|-------|----------|-----|-------|---------------|----------|
| Missing configuration | `test/persistence.test.ts` | Persistence runtime | 1 file, 3 tests passed | Test written first; first run passed because the existing missing-path behavior already matched the spec | Focused run passed, 4 tests | Direct `loadSuiteConfig()` call proves the runtime path | No production change |
| Detail-to-materialization | `test/tui-registration.test.ts` | TUI host-double runtime | 2 files, 8 tests passed | Test written first; first run passed because the existing dialog/materialization path already matched the spec | Focused run passed, 7 TUI tests | Drives detail alert, action select, confirm, and written global markdown | Reused the existing dialog host double |
| Renderer fallback navigation | `test/tui-registration.test.ts` | TUI host fallback runtime | Same baseline | Test written first; first run passed because keymap registration survives renderer failure | Focused run passed | Throws the host renderer error during slot registration, then invokes the real keymap command | No production change |
| GitHub current-turn consent | `test/server.test.ts` | Server-hook runtime | 2 files, 14 tests passed | Test written first; first run passed because exact ledger gating already matched the spec | Focused run passed, 12 server tests | Exercises deny, exact grant/AgentPart, allow, and next-turn expiry | Reused the real `serverPlugin` hooks |

### Test Summary

- Direct remediation tests added: 4; passing: 4.
- Layers: temporary-file persistence, TUI host doubles, host-fallback registration, and OpenCode server hooks.
- No production behavior change was required.

### Work Unit Evidence — `remediate-strict-tdd-scenarios`

| Evidence | Result |
|----------|--------|
| Focused test command and exact result | `npm test -- test/persistence.test.ts test/tui-registration.test.ts test/server.test.ts` — exit 0; **3/3 files and 23/23 tests passed**; output hash `sha256:bb8d047a9a1fa7b35437be60fadab253d879f9c4fe99a268f8d5740c3efb051c`. |
| Runtime harness command/scenario and exact result | The same focused Vitest command exercised missing-config loading, complete TUI detail-to-materialization, renderer-registration fallback followed by catalog navigation, and exact `agent-especialit-github` deny/allow/expiry; exit 0; **23/23 passed**. No live OpenCode process harness exists. |
| Full validation | `npm test` exit 0; **11/11 files and 44/44 tests**, output hash `sha256:18bcef152eb989b7fb4b102cec3b89bb44adad0a7934a70883e1712b3fc6cc6b`. `npm run typecheck` exit 0, output hash `sha256:f2d17db683ea93568c694d869f89c8abd9baba777f6e3677aa11591331ae5da8`. `npm run build` exit 0, output hash `sha256:275a3c57ef9418dc472413052a371a2adddd2c32f73dfcb86ee92ff5ae24f1b7`. |
| Rollback boundary | Revert only `test/persistence.test.ts`, `test/tui-registration.test.ts`, `test/server.test.ts`, the remediation additions to `verify-report.md`, and this cumulative apply-progress section. Temporary test homes are isolated under the OS temp directory; no global configuration or production source changed. |

### Remediation Result

```json
{"schema":"gentle-ai.remediation-result/v1","lineage_id":"review-71041d4a3eca2394","generation":1,"fix_batch":1,"failed_evidence_revision":"sha256:82255898f618e8361e2679f03e0384b0390d14966e615df7ad4962c67d877923","outcome":"passed"}
```
```json
{"schema":"gentle-ai.remediation-evidence/v1","lineage_id":"review-71041d4a3eca2394","generation":1,"fix_batch":1,"failed_evidence_revision":"sha256:82255898f618e8361e2679f03e0384b0390d14966e615df7ad4962c67d877923","focused_test_command":"npm test -- test/persistence.test.ts test/tui-registration.test.ts test/server.test.ts","focused_test_exit_code":0,"focused_test_output_hash":"sha256:bb8d047a9a1fa7b35437be60fadab253d879f9c4fe99a268f8d5740c3efb051c","runtime_harness":"Vitest direct runtime coverage for missing configuration, TUI materialization, renderer fallback/catalog navigation, and agent-especialit-github current-turn consent","runtime_harness_exit_code":0,"runtime_harness_output_hash":"sha256:bb8d047a9a1fa7b35437be60fadab253d879f9c4fe99a268f8d5740c3efb051c","rollback_boundary":"Revert only the three remediation test files and the remediation sections in verify-report.md and apply-progress.md; production behavior is unchanged."}
```

## Remediation Status

**4/4 remediation scenarios pass.** The report envelope is native-schema valid and now records 9/9 requirements, 15/15 scenarios, and zero blockers after the new tests passed. The parent must finish native attempt 4 with the active revision above; no new continuation was launched.
