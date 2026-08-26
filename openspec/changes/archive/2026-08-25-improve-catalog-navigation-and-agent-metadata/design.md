# Design: Improve Catalog Navigation and Agent Metadata

## Technical Approach

Keep navigation in the pure TUI state machine and identity in the core registry. One API feeds catalog, config, policy, grants, installed definitions, and presentation. Migration validates, plans, and atomically commits suite JSON and agent Markdown with byte backups.

## Architecture Decisions

| Decision | Alternatives | Rationale |
|---|---|---|
| Add `MOVE_CATALOG_CURSOR { delta, filteredCount, pageSize }` to `NavEvent`; `reduceNav` converts `(page,focus)` to a clamped global index, then derives page/focus. | Teach `MOVE_FOCUS` about pages; coordinate JSX events | This smallest pure boundary handles full, partial, empty, and clamped catalogs. `PAGE`, wheel, mouse, and search-input behavior remain unchanged except arrows share the cursor event. |
| Create `src/core/built-in-agents.ts` as the eight-agent registry and export `normalizeAgentId(id)` plus normalized record/set helpers. | Scatter alias checks; extend seed only | Accept `agent-especialit-github` only at input normalization/migration boundaries. Canonical keys, catalog/detail labels, grant text, diagnostics, filenames, and materialized content emit exactly lowercase `agent-github`. Detect post-normalization duplicates; canonical fields win and legacy fills gaps. |
| Reconcile installed definitions with a pure field plan and atomic executor in existing `config.ts`, `persistence.ts`, and `agents.ts`. | Blind rewrite; delete legacy first | Preserve manual customizations. Canonical-new wins, legacy gap-fills. Validate, stage, promote, then archive legacy as `.legacy.bak`; failure restores bytes/modes and leaves legacy intact. Re-runs are no-ops. |
| Registry metadata owns display, descriptions, operations, model/effort defaults, skills, and safe permissions for all eight agents, including exact label `agent-github`. | Metadata in TUI or installed files | Catalog/runtime/files share one source. Skills are deduplicated by responsibility. `agent-github` uses only `github-review-orchestration`, `issue-creation`, `branch-pr`, and `chained-pr`; operations require least privilege and deny autonomous push/delivery. No external asset is installed. |
| Extend Compaction/Title/Summary through registry prompt/permission overlays, preserving agent objects and hook contracts. | Replace built-ins; unrestricted shell | Allow best-effort memory, session audit, read tools, and exact read-only Git commands. Deny writes, delegation, network, mutation, composition, redirection, and unrestricted shell. Dedupe by session+kind+content hash; memory outage never blocks native output. |

## Data Flow

```text
runtime agents + suite JSON + installed Markdown
  -> normalize identity -> merge/reconcile registry -> catalog/runtime policy
  -> validate plan -> staged writes -> atomic promote -> legacy archive
keyboard/filter count -> reducer global cursor -> page/focus -> Catalog
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/core/built-in-agents.ts` | Create | Eight-agent identity, metadata, responsibility, permissions, merge helpers. |
| `src/core/{types,config,suites,persistence,agents,grants,policy}.ts` | Modify | Canonical contracts, migration, transaction, normalized grants/policy/files. |
| `src/server/index.ts` | Modify | Apply normalized registry overlays without replacing unrelated OpenCode fields. |
| `src/tui/{agent-suite-nav,agent-suite-app,agent-suite-vm,agent-suite-controller,visual-tokens}.ts(x)`; `src/tui/screens/catalog.tsx` | Modify | Cursor event, filtered counts, display names, reconciliation entry point. |
| `test/{agent-suite-catalog,config,persistence,agents,agent-suite-controller,policy,server,skill-catalog,visual-tokens}.test.ts` | Modify/Create | Strict-TDD regressions and negatives. |

## Interfaces / Contracts

```ts
normalizeAgentId(id: string): string; // input boundary; output is canonical
mergeCanonicalAgent<T>(canonical: T | undefined, legacy: T | undefined): T | undefined;
planInstalledAgentReconciliation(input): ReconciliationPlan;
MOVE_CATALOG_CURSOR: { delta: -1 | 1; filteredCount: number; pageSize: number };
```

## Testing Strategy

| Layer | Planned RED tests |
|---|---|
| Unit | Cursor page crossing, partial/empty catalogs, and clamps. Alias merge/dedup, malformed legacy, customization detection, responsibility dedup, command allow/deny, memory dedupe/outage. Assert catalog/detail/grant text and diagnostics contain `agent-github` and zero legacy output. |
| Integration | Config plus canonical/legacy Markdown migrate twice identically; interruption restores bytes/modes; either input ID resolves to one canonical grant; overlays preserve unrelated fields. Assert new filenames/materialized content contain `agent-github`, zero legacy output, and no push/install authority. |
| E2E | None configured; verification runs `npm test`, `npm run typecheck`, `npm run build`, then isolated loader smoke. |

## Threat Matrix

| Boundary | Applicability | Safe/failure behavior and unchanged RED cases |
|---|---|---|
| Documentation-like paths | N/A — no executable-file classification. | No task/test. |
| Git repository selection | Applicable | Commands run only in host-provided cwd; reject `git -C`, relative/absolute cwd overrides. RED: each selector is denied with no process start. |
| Commit state | Applicable | Read-only allowlist never commits or mutates index. RED: staged, `commit -a`, empty-index commit attempts all denied with no change. |
| Push state | Applicable | No push authority. RED: tracking, first-push, explicit-refspec forms all denied with no network/process side effect. |
| PR commands | Applicable | Read-only `gh` is not granted to internal agents; `agent-github` remains developer-controlled. RED: `--head`, environment-prefix, and composed PR commands denied/no execution. |

## Migration / Rollout

No schema-version bump. Back up config/agent bytes, commit atomically, retain `.legacy.bak`, and restore prior bytes on failure. Only after verification, build in `suite-de-agentes-production`, snapshot its prior commit/dist hashes and loader configs, update loaders atomically, and smoke-test. Rollback restores the prior build and backed-up `opencode.json`, `tui.json`, suite config, and agent files. No rollout now.

## Open Questions

None.
