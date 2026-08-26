# Apply Progress: Improve Catalog Navigation and Agent Metadata

**Work units:** 1 — Pure catalog navigation and TUI cursor wiring; 2 — Canonical ID, config persistence, and atomic migration; 3 — Metadata registry, skill bindings, and security gates
**Mode:** Strict TDD
**Delivery:** feature-branch-chain; PR #1 targets `feat/improve-catalog-navigation-and-agent-metadata`.
**Current remediation boundary:** Unit 3 test-only correction in `test/agent-suite-controller.test.ts`; no production-source or rollout changes.

**Phase 4 remediation boundary:** Correct only the stale seven-agent registry expectation in `test/built-in-agents.test.ts`, then verify and deploy the already-built implementation `dist` to the production build root. Loader configuration paths remain unchanged.

## Completed Tasks

- [x] 1.1 RED: Added global catalog-cursor scenarios.
- [x] 1.2 GREEN: Added reducer-owned `MOVE_CATALOG_CURSOR` global-index clamping.
- [x] 1.3 GREEN: Wired keyboard and search-input arrows to the cursor event while preserving page and mouse behavior.
- [x] 1.4 REFACTOR: Removed duplicate local focus-bound derivation from cursor dispatch.
- [x] 2.1 RED: Added canonical/legacy identity, malformed migration, coexistence, customization, idempotence, and rollback scenarios.
- [x] 2.2 GREEN: Added canonical `agent-github` registry identity and normalization helpers.
- [x] 2.3 GREEN: Normalized suite configuration/catalog records and migrated installed GitHub markdown atomically with archival.
- [x] 2.4 REFACTOR: Consolidated normalized record reconciliation and verified repeat-safe migration behavior.
- [x] 3.1 RED: Preserved the observed red controller repro and replaced stale visible-ID expectations with canonical output assertions plus zero-legacy checks.
- [x] 3.2 GREEN: Confirmed existing Unit 2 canonicalization already satisfies the visible-label and zero-leakage contract; no production change required.
- [x] 3.3 RED: Confirmed the existing policy, server, skills, agents, and catalog threat-matrix coverage through the mandated focused regression suite.
- [x] 3.4 GREEN: Confirmed existing registry metadata and permission allowlists satisfy Phase 3; no production change required.
- [x] 3.5 GREEN: Confirmed the existing server registry overlays and command gating through focused tests; no production change required.
- [x] 3.6 REFACTOR: Replaced obsolete rebuild-failure rejection with an alias-to-canonical-seed rejection that proves rollback of config and materialized files.
- [x] 4.1 Gate A: Corrected the stale seven-agent registry expectation and ran the full test, typecheck, build, and diff-hygiene commands.
- [x] 4.2 Gate B: Ran isolated implementation-dist loader smoke, verifying `server.js` and `tui.js` imports plus eight canonical entries, exact visible `agent-github`, and no visible legacy alias.
- [x] 4.3 Gate B: Confirmed production-only loader targets, backed up the active production dist, staged/hash-compared/replaced verified artifacts, then imported and hash-verified production artifacts.

## TDD Cycle Evidence

| Task | Test file | Layer | Safety Net | RED | GREEN | REFACTOR |
|---|---|---|---|---|---|---|
| 1.1 | `test/agent-suite-nav.test.ts` | Unit | N/A — new test owner | `npm test -- test/agent-suite-nav.test.ts` exit 1: 2 failed / 2 passed | `npm test -- test/agent-suite-nav.test.ts` exit 0: 4 passed | Retained scenario-based assertions; exit 0: 4 passed |
| 1.2 | `test/agent-suite-nav.test.ts` | Unit | Focused path absent before RED | RED above | Focused GREEN: 4 passed | Global index derivation kept reducer-owned |
| 1.3 | `test/agent-suite-nav.test.ts`, `test/agent-suite-catalog.test.ts` | Integration | Nearby suite initially exposed one expectation update | RED above | `npm test -- test/agent-suite-nav.test.ts test/agent-suite-catalog.test.ts test/agent-suite-controller.test.ts` exit 0: 36 passed | PageUp/PageDown and wheel stay `PAGE`; arrows use one cursor event |
| 1.4 | Same files | Unit / integration | GREEN baseline above | Existing behavior approval via focused assertions | Post-refactor focused suite exit 0: 36 passed | Removed stale per-page max-focus handoff; no behavior expansion |
| 2.1 | `test/config.test.ts`, `test/persistence.test.ts`, `test/agents.test.ts`, `test/agent-suite-catalog.test.ts` | Unit / integration | `npm test -- test/config.test.ts test/persistence.test.ts test/agents.test.ts` exit 1: 1 failed / 34 passed | New malformed legacy test initially failed with `Invalid skills for built-in override agent-especialit-github`; coexistence archive test initially failed because legacy remained | Focused migration suite exit 0: 36 passed; catalog reconciliation exit 0: 14 passed | Added canonical+legacy and malformed/partial branches to force real merge behavior |
| 2.2 | `test/config.test.ts`, `test/agent-suite-catalog.test.ts` | Unit | Existing focused suite as above | Tests referenced normalization/canonical identity before implementation | `npm test -- test/config.test.ts test/persistence.test.ts test/agents.test.ts` exit 0: 36 passed | Canonical identity stays in one deep core module; catalog resolves one row |
| 2.3 | `test/persistence.test.ts`, `test/agents.test.ts` | Integration | Existing agents/config paths covered by focused suite | Tests written before migration recovery/coexistence behavior | Focused migration suite exit 0: 36 passed | Temporary promotion, byte/mode preservation, and `.legacy.bak` handling remain bounded to fixed agent paths |
| 2.4 | Same Unit 2 files | Unit / integration | Green baseline above | Approval through repeat-run assertions | Re-run suite exit 0: 36 passed; `npm run typecheck` exit 0 | Extracted normalized object/scalar record handling; idempotent repeat paths are explicit |
| 3.1 | `test/agent-suite-controller.test.ts` | Integration | Initial mandated repro exit 1: 3 failed / 31 passed; two failures were stale visible legacy-ID expectations | Observed red: initial repro failed against canonical `agent-github` output; updated visible ID and persisted-output zero-legacy assertions first | Mandated repro exit 0: 3 files / 34 tests passed | Two independent visible outputs: initial catalog IDs and persisted assignment/snapshot output | No production refactor required; assertions now match canonical contract |
| 3.2 | `test/agent-suite-controller.test.ts`, `test/agent-suite-catalog.test.ts` | Integration | RED above | Existing Unit 2 implementation already passed canonical visible-label behavior | Mandated Phase 3 regression suite exit 0: 8 files / 91 tests passed | Catalog plus controller persistence cover distinct display paths | No production source change justified |
| 3.3 | `test/policy.test.ts`, `test/server.test.ts`, `test/skill-catalog.test.ts` | Unit / integration | Existing focused suites included in mandatory regression command | Existing threat-matrix cases were retained as RED coverage from prior Unit 3 implementation | Mandated Phase 3 regression suite exit 0: 91 tests passed | Denial, command-gate, server, and skills paths exercised by distinct cases | No change required |
| 3.4 | `test/agent-suite-catalog.test.ts`, `test/policy.test.ts`, `test/skill-catalog.test.ts` | Unit / integration | Existing focused suite | Existing metadata/permission tests already specified the required behavior | Mandated Phase 3 regression suite exit 0: 91 tests passed | Registry display and policy capability paths remain separately covered | No change required |
| 3.5 | `test/server.test.ts` | Integration | Existing focused suite | Existing overlay/gating tests retained | Mandated Phase 3 regression suite exit 0: 91 tests passed | Server overlay and command-gate scenarios remain independently covered | No change required |
| 3.6 | `test/agent-suite-controller.test.ts` | Integration | Initial repro exit 1: 3 failed / 31 passed | Replaced obsolete `old-agent` → `new-agent` rebuild-getter case with `old-agent` → legacy alias, which normalizes to protected `agent-github` and must reject before persistence/file migration | Mandated repro exit 0: 34 tests passed | Config identity, catalog visibility, and filesystem rollback assertions prove no partial migration | Test-only cleanup; preserved existing transaction behavior |
| 4.1 | `test/built-in-agents.test.ts` | Unit / release gate | Prior Gate A supplied RED: full suite exit 1 with 1 stale expectation failure because this registry test expected seven rather than the required eight canonical agents | Updated only the expected canonical IDs/count and added exact visible `agent-github` plus no-visible-legacy assertions; `npm test -- test/built-in-agents.test.ts` exit 0: 1 file / 3 tests passed | Full suite exit 0: 26 files / 188 tests passed | Exact eight-ID list, explicit count, exact display label, and dual ID/display zero-legacy checks | No production source refactor; correction is minimal test-only |
| 4.2 | `dist/server.js`, `dist/tui.js`, `dist/core/index.js` | Runtime smoke | N/A — implementation was already green after Gate A | Isolated implementation build smoke exit 0: imported server/tui/core; canonicalCount 8; `githubVisible: true`; `legacyVisible: false` | N/A — one compiled-artifact path with fixed acceptance values | No source refactor; smoke only |
| 4.3 | Production `dist/*` and fixed loader configs | Deployment / runtime smoke | N/A — rollout starts only after Gate A and Gate B passed | Parsed loader configs and confirmed the resolved server/TUI paths both target only `suite-de-agentes-production/dist`; staged six implementation files and SHA-256 matched before/after promotion | Post-deploy smoke exit 0: production server/tui/core imports, `agent-github` visible, legacy alias absent, resolved paths stable, 6/6 hashes match implementation | No artifact refactor; atomic dist-directory replacement with retained backup |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `npm test -- test/agent-suite-nav.test.ts` — exit 0, 1 file / 4 tests passed. |
| Nearby navigation/catalog tests | `npm test -- test/agent-suite-nav.test.ts test/agent-suite-catalog.test.ts test/agent-suite-controller.test.ts` — exit 0, 3 files / 36 tests passed. |
| Typecheck | `npm run typecheck` — exit 0. |
| Runtime harness command/scenario and exact result | Automated reducer/TUI traversal: 14 rows, page 0/focus 5 Down -> page 1/focus 0; Up reverses; 7-row partial page; empty and global clamps; keyboard arrows, PageUp/PageDown, and wheel compatibility. Focused and nearby commands passed as recorded above. No interactive TUI launched. |
| Rollback boundary | Revert `src/tui/agent-suite-nav.ts`, `src/tui/agent-suite-app.tsx`, `src/tui/screens/catalog.tsx`, `test/agent-suite-nav.test.ts`, and the updated catalog expectation in `test/agent-suite-catalog.test.ts`. |
| Unit 2 focused test command and exact result | `npm test -- test/config.test.ts test/persistence.test.ts test/agents.test.ts` — exit 0, 3 files / 36 tests passed. |
| Unit 2 direct catalog test | `npm test -- test/agent-suite-catalog.test.ts` — exit 0, 1 file / 14 tests passed. |
| Unit 2 runtime harness command/scenario and exact result | Fixture suite JSON plus installed Markdown through the real `saveSuiteConfig` / `loadSuiteConfig` and `migrateGitHubMaterializedAgent` APIs — canonical and legacy metadata coalesce to one `agent-github`; malformed alias override is ignored while valid canonical state persists; migration preserves manual Markdown bytes, file mode, archival, coexistence, and interrupted-promotion recovery. Focused suite exit 0: 36 passed. |
| Unit 2 rollback boundary | Revert `src/core/built-in-agents.ts`, `src/core/config.ts`, `src/core/suites.ts`, `src/core/agents.ts`, and Unit 2 assertions in `test/config.test.ts`, `test/persistence.test.ts`, `test/agents.test.ts`, and `test/agent-suite-catalog.test.ts`. No production or installation paths were changed. |
| Unit 2 typecheck | `npm run typecheck` — exit 0. |
| Unit 3 focused test command and exact result | `npm test -- test/agent-suite-controller.test.ts test/visual-tokens.test.ts test/visual-primitives.test.ts` — initial RED exit 1, 3 failed / 31 passed; final GREEN exit 0, 3 files / 34 tests passed. |
| Unit 3 Phase 3 regression command and exact result | `npm test -- test/agent-suite-catalog.test.ts test/policy.test.ts test/agents.test.ts test/skill-catalog.test.ts test/server.test.ts test/agent-suite-controller.test.ts test/visual-tokens.test.ts test/visual-primitives.test.ts` — exit 0, 8 files / 91 tests passed. |
| Unit 3 typecheck and diff hygiene | `npm run typecheck` — exit 0. `git diff --check` — exit 0. |
| Unit 3 runtime harness command/scenario and exact result | N/A — this focused remediation has no additional runtime boundary: the controller integration suite invokes real suite persistence, catalog reconstruction, alias normalization, and materialized-agent filesystem APIs. The focused command passed 34 tests. |
| Unit 3 rollback boundary | Revert only `test/agent-suite-controller.test.ts` plus this Unit 3 progress/task bookkeeping. No production behavior or source files were changed. |
| Phase 4 focused test command and exact result | `npm test -- test/built-in-agents.test.ts` — exit 0, 1 file / 3 tests passed. |
| Gate A full verification and exact result | `npm test` — exit 0, 26 files / 188 tests passed. `npm run typecheck` — exit 0. `npm run build` — exit 0 (6 dist artifacts). `git diff --check` — exit 0. |
| Gate B implementation runtime harness and exact result | Node ESM isolated import of implementation `dist/server.js`, `dist/tui.js`, and `dist/core/index.js` — exit 0; imports true; canonicalCount 8; exact visible `agent-github` true; legacy visible false. |
| Gate B loader preflight and exact result | Parsed `C:\Users\DELL\.config\opencode\bin\agent-suite-target.cjs` and `C:\Users\DELL\.config\opencode\tui.json` — exit 0; server resolves only to `C:\Users\DELL\projects\0.-MEJORA-OPENCODE-TRABAJANDO\suite-de-agentes-production\dist\server.js`; one suite TUI plugin resolves only to `C:\Users\DELL\projects\0.-MEJORA-OPENCODE-TRABAJANDO\suite-de-agentes-production\dist\tui.js`; production parent and dist directories exist. |
| Gate B deployment and hash evidence | Active production `dist` was retained as `C:\Users\DELL\projects\0.-MEJORA-OPENCODE-TRABAJANDO\suite-de-agentes-production\dist-backup-20260825-232447`; implementation dist was staged, SHA-256 compared, promoted, and then compared again: 6/6 matching files. No loader config changed and OpenCode was not started or stopped. |
| Gate B production runtime harness and exact result | Node ESM isolated import of production server/tui/core — exit 0; resolved targets unchanged; canonical `agent-github` visible; legacy visible false; 6/6 SHA-256 hashes match implementation. |
| Phase 4 rollback boundary | Remove `C:\Users\DELL\projects\0.-MEJORA-OPENCODE-TRABAJANDO\suite-de-agentes-production\dist`, then move `C:\Users\DELL\projects\0.-MEJORA-OPENCODE-TRABAJANDO\suite-de-agentes-production\dist-backup-20260825-232447` back to `C:\Users\DELL\projects\0.-MEJORA-OPENCODE-TRABAJANDO\suite-de-agentes-production\dist`. Loader configs remain untouched. |

## Deviations

None — `agent-suite-vm.ts` and `agent-suite-controller.ts` required no changes because the filtered-count reducer contract is fully supplied by existing app/catalog seams. `visual-tokens.ts` needed no production change after refactor because it already centralizes selected-row styling.

Unit 2: `src/core/persistence.ts` already supplied atomic staged suite JSON writes, so no production change was necessary there. The Unit 2 migration only accepts fixed, validated legacy/canonical agent locations derived from the configured home directory; it does not accept caller-controlled agent paths.

Unit 3 remediation: the initial two failures were stale test expectations that exposed the legacy alias even though the existing controller correctly returned canonical `agent-github`. The third failure expected a synthetic runtime getter to throw during a valid custom rename, but the amended contract requires alias-aware canonical validation instead; the replacement confirms an alias rename to the protected canonical seed rejects atomically. No production-source change was supported by the specs or failing evidence.

## Unit 2 Test Summary

- **Total tests written/extended:** 7 behavioral scenarios across config, persistence, installed Markdown migration, and catalog reconciliation.
- **Total focused tests passing:** 36 migration/config/agents tests plus 14 catalog tests.
- **Layers used:** Unit and integration; no E2E harness is configured.
- **Approval tests:** Repeat-run migration checks in persistence and installed Markdown fixtures.
- **Pure functions created:** `normalizeAgentId`, `mergeCanonicalAgent`, and normalized record reconciliation helpers.

## Unit 3 Test Summary

- **Changed test scenarios:** 3 controller expectations/scenarios corrected: two stale visible legacy-ID assertions and one obsolete rollback rejection.
- **Focused tests passing:** 34 across controller and visual suites; **Phase 3 regression tests passing:** 91 across 8 files.
- **Layers used:** Integration and existing unit/integration policy coverage; no E2E harness is configured.
- **Production changes:** None — remediation was test-only after confirming existing implementation matches the amended specs and design.
- **Unit 3 line estimate:** 19 changed lines in `test/agent-suite-controller.test.ts`; 42 lines added to this progress artifact and 6 task checkboxes updated.

## Phase 4 Remediation and Rollout Evidence

### Minimal Correction

- Changed only `test/built-in-agents.test.ts` for this remediation: its first test now expects all eight canonical IDs including `agent-github`, verifies count eight, verifies the exact visible `agent-github` label, and rejects `agent-especialit-github` from both IDs and visible names.
- No production-source behavior changed because the focused test passed after the expectation correction and compiled/runtime metadata already satisfied the specification.

### Gate A — Verification

- **Prior RED:** supplied Gate A evidence recorded one stale test failure: the full suite expected seven canonical entries while the product/spec requires eight.
- **Focused GREEN:** `npm test -- test/built-in-agents.test.ts` — exit 0, 1 file / 3 tests passed.
- **Full suite:** `npm test` — exit 0, 26 files / 188 tests passed.
- **Typecheck:** `npm run typecheck` — exit 0.
- **Build:** `npm run build` — exit 0; six artifacts emitted.
- **Diff hygiene:** `git diff --check` — exit 0.

### Gate B — Loader Smoke and Production Deployment

- **Implementation smoke:** imported `dist/server.js`, `dist/tui.js`, and `dist/core/index.js` — all imports succeeded; canonical count is eight; visible `agent-github` is present; no visible legacy alias is emitted.
- **Preflight:** active loader configs parsed and resolve only to the production server/TUI artifacts. `agent-suite-target.cjs` and `tui.json` were not changed.
- **Backup:** `C:\Users\DELL\projects\0.-MEJORA-OPENCODE-TRABAJANDO\suite-de-agentes-production\dist-backup-20260825-232447`.
- **Deployment:** copied implementation `dist` to a timestamped staging directory, verified SHA-256 equality, moved the old production `dist` to the backup, and promoted the staged directory. Prior backups were retained.
- **Production smoke:** imported production `dist/server.js`, `dist/tui.js`, and `dist/core/index.js`; loader resolution, JSON parsing, exact canonical metadata, zero legacy alias, and all six SHA-256 hashes matched the implementation build.
- **Rollback:** delete the active production `dist` and rename the backup above to `dist`. This is the only rollback boundary; no config restoration is needed because configs were unchanged.

### Production SHA-256

| Artifact | SHA-256 |
|---|---|
| `server.js` | `148DF5B347649D37022F7F8A534308F313AA25457DCAB79DBF5CCE01269BF9FF` |
| `tui.js` | `9CE0F4A09F3C4F07FC881D8815B8160B4885489EBF4B8A060B73819F509F0FDB` |
| `core/index.js` | `D27ADD44FA66839AA1C66BC6088039308CB9099E9EBC3BA982BE2FA63C320D4D` |
| `chunk-EN6SZ63M.js` | `04CEA54EE291948A7707C6A0209B613A03157944BE36F5FBDCD5568C0C4DA267` |
| `chunk-NNEPCOH4.js` | `1A8126EB591B2DC3AF0346D9B16E389B794501B113B7765EE1D56972B69EA39E` |
| `chunk-YOYMQ6WL.js` | `7CC4A13E5C48F8BA480B3BC774AFFE23D772B0F6F66AC523E66B0B649EADEAB5` |

## Phase 4 Status

17/17 tasks complete. Ready for independent `sdd-verify`.
